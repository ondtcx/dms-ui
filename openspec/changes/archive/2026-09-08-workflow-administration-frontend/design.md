# Design: Workflow Administration Frontend

## Technical Approach

Refactor the current page into a shared `WorkflowAdministration` surface rendered by Settings and the guarded `/dashboard/workflows` route. Extend the existing TanStack Query/service/type pattern for sibling detail, edit, validation, version, and lifecycle contracts. Published and historical versions stay read-only; behavior edits enter a new-version form. Spanish UI conventions remain.

## Architecture Decisions

| Decision | Alternatives considered | Rationale |
|---|---|---|
| Shared administration component | Duplicate route implementations | One state machine prevents route drift in permissions, states, and mutations. |
| Explicit version IDs | Use definition-level/latest activation | Selected IDs prevent historical mutation and stale latest-version assumptions. |
| State-derived branches | Mix data with loading/error placeholders | Refetches can retain stale data; exclusive branches prevent conflicting states. |
| Settings owns discovery; guard owns access | Remove the legacy route or trust hidden links | Cards provide one owner; `ProtectedRoute` and backend authorization remain authoritative. |

## Data Flow

```text
Settings card or /dashboard/workflows
        → permission guard → definitions query → selected definition detail
                                      ↓
                         version editor / validation / lifecycle mutation
                                      ↓
                         invalidate list and selected detail queries
```

The detail response supplies metadata, ordered stages, publication state, usage counts, and read-only history. Missing usage/history gets an explicit explanation, never fabricated zeroes. Each list, detail, validation, and usage/history request chooses one loading, error, empty, or populated branch; failed refetches hide prior detail, pending mutations block duplicates, and activation requires valid validation.

## File Changes

| File | Action | Description |
|---|---|---|
| `dms-frontend/lib/types/workflows.ts` | Modify | Add detail, edit, validation, usage/history, and lifecycle types. |
| `dms-frontend/lib/services/workflows.service.ts` | Modify | Add typed detail, edit, validation, version, activate, and deactivate calls with explicit IDs. |
| `dms-frontend/components/workflows/WorkflowAdministration.tsx` | Create | Shared list/detail UI, editors, validation, lifecycle, and async states. |
| `dms-frontend/app/dashboard/workflows/page.tsx` | Modify | Guard the compatibility entry point and render the shared surface. |
| `dms-frontend/app/dashboard/settings/page.tsx` | Modify | Add the gated workflow destination, workflow-only admission, and section authorization. |
| `dms-frontend/components/app-sidebar.tsx` | Modify | Remove the direct workflow item; retain Settings compatibility activation paths. |
| `dms-frontend/lib/sidebar-nav.ts` | Modify | Apply alternative paths at slash boundaries without broad prefixes. |
| `dms-frontend/app/dashboard/workflows/__tests__/page.test.tsx`, `dms-frontend/app/dashboard/settings/__tests__/page.test.tsx`, `dms-frontend/components/__tests__/app-sidebar.test.tsx`, `dms-frontend/lib/__tests__/sidebar-nav.test.ts` | Modify | Cover states, permissions, version safety, ownership, and highlighting. |
| `dms-frontend/lib/services/__tests__/workflows.service.test.ts` | Modify | Verify paths, payloads, and response assumptions. |
| `dms-frontend/e2e/workflow-fixtures.ts`, `dms-frontend/e2e/workflow-journey.spec.ts` | Create/Modify | Track records, isolate or clean up, and surface failures. |

## Interfaces / Contracts

```typescript
type WorkflowValidationResult = {
  versionId: number;
  valid: boolean;
  issues: Array<{ path: string; message: string; code?: string }>;
};

type WorkflowDefinitionDetail = WorkflowDefinition & {
  usage: { executionCount: number | null; activeCount: number | null } | null;
  history: ReadonlyArray<WorkflowExecution>;
};
```

Service methods map to detail/edit, validation with `{ versionId }`, version creation, and `/versions/:versionId/{activate|deactivate}` contracts. Metadata and behavior payloads stay separate to protect published snapshots.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit/service | Paths, payloads, sorting, validation, lifecycle | Jest API mocks and typed fixtures. |
| Component | Exclusive states, read-only history, new versions, pending controls | React Testing Library with controlled QueryClient. |
| Navigation | Workflow-only access, hidden destinations, no direct item, compatibility | Settings/sidebar/page and slash-boundary tests. |
| E2E | Authorization, version/lifecycle visibility, cleanup success/failure | Playwright fixture registry; throw identities and reasons. |

## Threat Matrix

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Routing/compatibility URLs | Settings destination, direct `/dashboard/workflows`, unauthorized bookmark | Applicable — routing changes | Shared guarded surface for authorized users; no data or controls for others. | Route/page and Settings permission tests. |
| Playwright fixture/process lifecycle | Created document, definition, version, execution; cleanup failure | Applicable — process integration | Run-scoped, ordered, verified cleanup; failures identify records. | Inject cleanup failure and assert identity/reason. |
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | N/A — no executable-file classification | No classification or execution behavior. | None. |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A — no Git integration | No repository selection. | None. |
| Commit state | staged, `commit -a`, empty index | N/A — no commit automation | No commit semantics. | None. |
| Push state | tracking branch, first push, explicit refspec | N/A — no push automation | No push resolution. | None. |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A — no PR automation | No command composition. | None. |

## Migration / Rollout

No migration or feature flag. Automatic stacked-to-main slices establish fixture isolation before shared-database journeys; reverting listed frontend files restores prior route behavior.

## Open Questions

- None.
