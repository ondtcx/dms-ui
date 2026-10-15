# Design: Harden Workflow Compatibility Route Authorization

## Technical Approach

Wrap the client App Router entry point `/dashboard/workflows` with the existing `ProtectedRoute`, requiring `workflow.templates.manage`, and keep `WorkflowAdministration` unchanged as a fail-closed defense-in-depth boundary. Reuse the established redirect behavior (`/errors/unauthorized`) rather than introducing route-specific authorization or changing REST contracts. Update focused Jest tests first (strict TDD) to prove route wiring, redirect/no-mount behavior, and component-level denial.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Route boundary | Use `ProtectedRoute requiredPermission="workflow.templates.manage"` in the page component. | Duplicate `useAuth`/router logic; component-only protection. | Centralizes redirect and loading behavior, matches existing protected pages, and prevents unauthorized administration from mounting. |
| Defense in depth | Preserve `WorkflowAdministration`’s `canManage` check and query `enabled` gates. | Remove child authorization after adding the route guard. | Reuse through Settings or future entry points must remain deny-by-default; client checks do not replace backend authorization. |
| Unauthorized UX | Redirect authenticated users lacking the permission to `/errors/unauthorized`. | Preserve the inline denial for direct bookmarks. | This is the confirmed product behavior and the shared `ProtectedRoute` contract. |

## Data Flow

```text
Direct navigation
      │
      ▼
WorkflowsPage ──→ ProtectedRoute ── permission check ──┬── authorized ──→ WorkflowAdministration
                                                       │                  └─→ enabled workflow queries/mutations
                                                       └── unauthorized ─→ router.push("/errors/unauthorized")
```

While auth is loading, `ProtectedRoute` renders its existing loading state. Once authenticated and authorized, the child evaluates the feature flag and loads definitions through `workflowsService`; without permission, the child is not mounted by the route and its query/mutation gates remain a second safeguard.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/dashboard/workflows/page.tsx` | Modify | Import and wrap `WorkflowAdministration` with `ProtectedRoute` using the exact workflow management permission. |
| `app/dashboard/workflows/__tests__/page.test.tsx` | Modify | Add auth/router harness; replace inline bookmark denial expectation with redirect, no workflow service calls, and no administration controls; retain authorized route coverage. |
| `components/workflows/__tests__/WorkflowAdministration.test.tsx` | Modify | Add direct component regression proving missing permission still renders the denial and performs no workflow queries. |
| `guards/ProtectedRoute.tsx` | No change | Reuse its existing loading, permission, child suppression, and unauthorized redirect behavior. |
| `openspec/specs/*` | No change | Main specifications are out of scope; delta specs remain the source for this change. |

## Interfaces / Contracts

```tsx
<ProtectedRoute requiredPermission="workflow.templates.manage">
  <WorkflowAdministration />
</ProtectedRoute>
```

Contract: authorized authenticated users receive the existing administration surface; unauthorized authenticated users receive no child render and a router push to `/errors/unauthorized`; unauthenticated users retain the guard’s existing `/auth/login` behavior.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Component fail-closed behavior | RED test with `hasPermission` false; assert denial copy, no definitions query, and no mutation controls. |
| Integration | Compatibility route authorization | RED tests using mocked auth/router and the real `ProtectedRoute`; authorized access renders the surface, while unauthorized access pushes `/errors/unauthorized`, does not mount the child, makes no workflow data calls, and exposes no controls. Existing `ProtectedRoute.test.tsx` continues to verify the shared redirect contract. |
| E2E | Not required for this narrow change | Existing Playwright workflow coverage is unchanged; Jest provides the deterministic route boundary regression. |

## Threat Matrix

Routing is applicable, but none of the matrix’s shell, process, VCS, or executable-file boundaries are involved. Every row is explicitly N/A:

| Boundary | Applicability | Design response | Planned RED tests |
|---|---|---|---|
| Documentation-like paths | N/A — no documentation execution or classification. | No execution boundary changes. | None. |
| Git repository selection | N/A — no Git command or repository selection. | No repository/cwd handling. | None. |
| Commit state | N/A — no commit or index operation. | No index/worktree behavior. | None. |
| Push state | N/A — no Git push or ref resolution. | No destination/ref handling. | None. |
| PR commands | N/A — no PR automation or command composition. | No command ownership changes. | None. |

Route safe behavior is child suppression plus the shared unauthorized redirect; failure behavior preserves `/auth/login` for unauthenticated users and does not expose workflow data or mutations. The route RED tests above are the required adversarial boundary coverage.

## Migration / Rollout

No migration required. This is a small client-only route wrapper and regression-test change; rollback is a revert of the page wrapper and test updates.

## Open Questions

- None.
