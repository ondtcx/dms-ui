# Proposal: Workflow Administration Frontend

## Intent

Deliver workflow administration's frontend half against agreed backend contracts: a detailed, editable, version-aware surface in Settings, with guarded compatibility and clean E2E data.

## Scope

### In Scope

- Extend frontend types, services, UI, and tests for detail, validation, immutable edits, lifecycle actions, versions/stages, and usage/history counts.
- Move administration into permission-gated Settings, remove its direct sidebar item, preserve `/dashboard/workflows`, and keep backend authorization authoritative.
- Make Playwright clean up or isolate every created document, definition, version, and execution; teardown failures must be visible.

### Out of Scope

- Backend controllers, services, Prisma schema/migrations, or API contract implementation.
- Inventory, quarantine, recovery, or deletion of already-persisted production/test residue.
- Changes to document workflow execution semantics or unrelated administration surfaces.

## Capabilities

### New Capabilities

- `workflow-administration-frontend`: Administration UI, lifecycle/usage presentation, and E2E fixture hygiene against backend contracts.

### Modified Capabilities

- `document-workflow-experience`: Clear administration states and a guarded Settings-owned compatibility route.
- `settings-administration`: Workflow destination and access for workflow-only administrators.
- `sidebar-navigation`: Settings owns workflow administration; no duplicate direct entry.

## Approach

Extend the workflow page and client service with typed adapters for detail, validation, version, lifecycle, and usage responses. Keep history read-only and behavior changes on new-version operations. Add frontend tests, asserted Playwright teardown/isolation, and a permission-aware Settings section.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `dms-frontend/app/dashboard/workflows/`, `lib/services/`, `lib/types/` | Modified | Administration UI and contract clients. |
| `dms-frontend/app/dashboard/settings/`, `components/app-sidebar.tsx`, `guards/ProtectedRoute.tsx` | Modified | Settings ownership and compatibility. |
| `dms-frontend/e2e/`, workflow tests | Modified | Fixture hygiene and regression coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Frontend/backend contract drift | Med | Typed service tests and sibling coordination. |
| Historical-version mutation | Med | Version-targeted actions and regression tests. |
| Workflow-only users lose access | Med | Permission and compatibility tests. |

## Rollback Plan

Revert the frontend service, UI, navigation, and fixture changes; restore the direct sidebar entry if needed while retaining the guarded compatibility route. No backend or data rollback is required.

## Dependencies

- Compatible administration contracts from the sibling backend change.
- Database-enabled or isolated Playwright environment for cleanup verification.
- Auto-chain delivery may use stacked-to-main frontend slices.

## Success Criteria

- [ ] Administrators can inspect and edit through version-safe frontend controls and see lifecycle, stages, and usage/history data.
- [ ] Workflow administration is reachable from Settings, absent as a duplicate sidebar item, and still works through `/dashboard/workflows` with permission checks.
- [ ] Playwright runs leave no shared E2E records, or isolate them, and report teardown failures.
- [ ] Frontend unit, service, page, and Playwright regression coverage passes.
