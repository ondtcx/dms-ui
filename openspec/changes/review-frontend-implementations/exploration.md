**Status**: success
**Executive summary**: The broad review found a concrete authorization boundary gap in the workflow compatibility route. `/dashboard/workflows` renders `WorkflowAdministration` directly instead of using the repository's `ProtectedRoute`; the component currently fails closed for data and mutations, but the route is not guarded consistently with the OpenSpec requirement and existing route pattern. A small, frontend-only change should harden the route and add direct-access regression coverage.
**Artifacts**: `openspec/changes/review-frontend-implementations/exploration.md`
**Next recommended**: `sdd-propose`
**Risks**: The product must confirm whether unauthorized direct access should redirect to `/errors/unauthorized` (the existing `ProtectedRoute` convention) or retain the current inline denied message. The recommendation below uses the established redirect behavior.
**Skill resolution**: paths-injected — `sdd-explore` and `cognitive-doc-design`

## Exploration: review-frontend-implementations

### Current State
The frontend is a Next.js 15 App Router application using client-side TanStack Query, service-layer REST calls, Radix/shadcn-style UI primitives, and Jest/React Testing Library with Playwright E2E coverage. Existing OpenSpec requirements define permission-scoped workflow administration, centralized Settings navigation, and a guarded `/dashboard/workflows` compatibility entry point.

The workflow surface is implemented in `components/workflows/WorkflowAdministration.tsx`. It checks `workflow.templates.manage` before enabling queries and mutations and renders an inline Spanish denied message when the permission is absent. The Settings route uses `ProtectedRoute` with an OR list of resource permissions and conditionally exposes the workflow destination through `SETTINGS_CATEGORIES`. However, `app/dashboard/workflows/page.tsx` directly renders `<WorkflowAdministration />` and has no `ProtectedRoute` wrapper. This means the compatibility route does not use the application's established route-level authorization boundary, even though the child currently fails closed.

The relevant focused tests pass: 4 suites, 39 tests. TypeScript strict typechecking also passes with `npx tsc --noEmit`. The direct workflow page test covers data/loading/error/empty behavior but does not assert route-level authorization. The working tree was already dirty before exploration (`17` modified or untracked paths, including `.codegraph/`); no existing files were changed by this phase.

### Affected Areas
- `app/dashboard/workflows/page.tsx` — compatibility entry point renders the workflow surface without `ProtectedRoute`.
- `guards/ProtectedRoute.tsx` — existing shared redirect-and-hide authorization behavior should be reused rather than duplicated.
- `components/workflows/WorkflowAdministration.tsx` — currently contains a second, component-level permission check; its interaction with route protection needs to remain fail-closed.
- `app/dashboard/workflows/__tests__/page.test.tsx` — lacks an unauthorized direct-route regression scenario.
- `openspec/specs/workflow-administration-frontend/spec.md` — explicitly requires unauthorized users to receive no workflow data or mutation controls.
- `openspec/specs/document-workflow-experience/spec.md` — explicitly requires `/dashboard/workflows` to remain a guarded compatibility entry point.
- `openspec/specs/settings-administration/spec.md` — requires compatible direct URLs to preserve authorization boundaries.

### Approaches
1. **Guard the compatibility route with `ProtectedRoute`** — wrap the page in `ProtectedRoute` with `requiredPermission="workflow.templates.manage"`, retain the child check as defense in depth, and add direct-route authorized/unauthorized tests.
   - Pros: Matches the established route pattern, satisfies the explicit guarded-entry-point requirement, prevents unauthorized UI from mounting, and keeps backend contracts unchanged.
   - Cons: The route-level unauthorized outcome becomes a redirect rather than the component's current inline message; test mocks must include auth/router behavior.
   - Effort: Low

2. **Keep component-only protection and expand component tests** — leave the route structure unchanged and prove that the child never queries or renders controls without permission.
   - Pros: Smallest code diff and preserves the current inline message.
   - Cons: Does not satisfy the explicit route-level guarded compatibility requirement, allows the protected surface to mount on unauthorized routes, and perpetuates duplicated authorization responsibility.
   - Effort: Low

### Recommendation
Choose Approach 1. The repository already centralizes route protection in `ProtectedRoute`, while the OpenSpec documents explicitly distinguish a guarded compatibility entry point from merely hidden controls. Add the wrapper, preserve the component check as defense in depth, and test both authorized rendering and unauthorized redirect/no-data behavior. This is a narrow change suitable for one review slice and is not expected to exceed the 400-line review budget.

The only product decision to confirm during proposal/design is the unauthorized UX for a direct bookmark. Existing `ProtectedRoute` behavior and other protected pages indicate `/errors/unauthorized` redirect; use that behavior unless product explicitly requires the inline denied message instead.

### Risks
- A route-level wrapper changes unauthorized direct navigation from an inline message to the shared unauthorized page; this must be intentional and tested.
- Test mocks that currently render `WorkflowsPage` without `AuthContext` may need the same provider/router setup used by other protected-page tests.
- Keeping both route and component checks is deliberate defense in depth; removing the component check could reintroduce data exposure if the component is reused elsewhere.
- The existing dirty worktree includes unrelated UI/theme changes, so implementation and verification should isolate only the named change's files.

### Ready for Proposal
Yes. The orchestrator should propose a focused authorization-hardening change: guard `/dashboard/workflows` with the shared permission boundary and add regression tests for authorized access, unauthorized direct access, and absence of workflow queries/mutation controls. No backend change or product-data contract change is required.

## Key Learnings

1. The workflow compatibility page bypasses the shared route-level ProtectedRoute wrapper.
2. WorkflowAdministration currently fails closed but duplicates authorization at component level.
3. Focused workflow, Settings, and sidebar tests pass with 39 tests completed.
4. Strict TypeScript typechecking passes on the current frontend worktree.
5. Existing OpenSpec requirements explicitly require guarded direct workflow compatibility access.
