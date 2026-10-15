# Proposal: Harden Workflow Compatibility Route Authorization

## Intent

Close the authorization boundary gap at `/dashboard/workflows`. The route currently mounts `WorkflowAdministration` directly, while other protected entry points use the shared `ProtectedRoute`. Unauthorized direct navigation must use the confirmed product behavior: redirect to `/errors/unauthorized` without mounting workflow administration.

## Scope

### In Scope

- Wrap `/dashboard/workflows` with the existing `ProtectedRoute` and `workflow.templates.manage` permission.
- Preserve the component-level permission check as defense in depth.
- Add regression coverage for authorized rendering and unauthorized direct access, including absence of workflow data and mutation controls.
- Refine affected OpenSpec requirements to record the redirect behavior.

### Out of Scope

- Backend authorization, REST contracts, or permission definitions.
- Changes to Settings navigation, unrelated protected routes, or workflow administration features.
- Replacing the existing component-level guard or changing its denied-message copy.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workflow-administration-frontend`: require route-level protection for direct workflow administration access while retaining deny-by-default component behavior.
- `document-workflow-experience`: specify the shared unauthorized redirect for `/dashboard/workflows`.

## Approach

Reuse `ProtectedRoute` at `app/dashboard/workflows/page.tsx` with `workflow.templates.manage`, following established route patterns. Keep `WorkflowAdministration` fail-closed for reuse outside the route boundary. Update the page tests with the existing auth/router test setup to prove authorized access and redirect behavior. This is a frontend-only, low-effort change aligned with the research findings on layered authorization.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/dashboard/workflows/page.tsx` | Modified | Add the shared route-level permission boundary. |
| `app/dashboard/workflows/__tests__/page.test.tsx` | Modified | Cover authorized and unauthorized direct access. |
| `openspec/specs/workflow-administration-frontend/spec.md` | Modified | Clarify direct-route enforcement. |
| `openspec/specs/document-workflow-experience/spec.md` | Modified | Document the confirmed redirect destination. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unauthorized bookmarks change from inline denial to redirect. | Med | Test the exact `/errors/unauthorized` outcome. |
| Existing page tests lack required auth/router context. | Med | Reuse setup from other protected-page tests. |

## Rollback Plan

Revert the route wrapper, its regression tests, and the corresponding spec deltas. The existing component-level permission check remains available as the immediate fallback.

## Dependencies

- Existing `ProtectedRoute`, auth context, and router behavior.

## Success Criteria

- [ ] Authorized users can open `/dashboard/workflows` and see workflow administration.
- [ ] Unauthorized direct access redirects to `/errors/unauthorized` and exposes no workflow data or mutation controls.
- [ ] Focused tests and strict TypeScript checks pass.
