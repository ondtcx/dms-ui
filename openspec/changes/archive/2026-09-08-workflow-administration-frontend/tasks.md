# Tasks: Workflow Administration Frontend

Backend contracts are read-only context; no backend edits.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 700–950 authored lines across UI, services, tests, and fixtures |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4, stacked |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Frontend contracts and detail UI | PR 1 | `npm --prefix dms-frontend test -- --runInBand lib/services/__tests__/workflows.service.test.ts components/workflows/__tests__/WorkflowAdministration.test.tsx` | Authorized detail edit scenario | Revert types, service, and component |
| 2 | Settings navigation and authorization | PR 2 | `npm --prefix dms-frontend test -- --runInBand app/dashboard/settings/__tests__/page.test.tsx components/__tests__/app-sidebar.test.tsx lib/__tests__/sidebar-nav.test.ts` | Workflow-only, unauthorized, and bookmark scenarios | Revert Settings/sidebar/nav/route wiring |
| 3 | Playwright fixture hygiene | PR 3 | `npm --prefix dms-frontend exec -- playwright test e2e/workflow-journey.spec.ts` | Database journey verifies isolation and teardown errors | Revert fixture and journey changes |
| 4 | Frontend regression tests and E2E | PR 4 | `npm --prefix dms-frontend test -- --runInBand && npm --prefix dms-frontend exec -- playwright test e2e/workflow-journey.spec.ts` | Full lifecycle and unauthorized journey | Revert regression coverage only |

## Phase 1: RED Contracts and Boundary Tests

- [x] 1.1 Add RED service tests in `dms-frontend/lib/services/__tests__/workflows.service.test.ts` for explicit paths and payloads.
- [x] 1.2 Add RED routing tests in `dms-frontend/app/dashboard/workflows/__tests__/page.test.tsx` and `dms-frontend/app/dashboard/settings/__tests__/page.test.tsx` for access, bookmarks, and absent controls.
- [x] 1.3 Add RED teardown-failure coverage in `dms-frontend/e2e/workflow-fixtures.ts` and `dms-frontend/e2e/workflow-journey.spec.ts` for document, definition, version, and execution cleanup, asserting identity and reason.

## Phase 2: Frontend Contracts and Detail UI

- [x] 2.1 Extend `dms-frontend/lib/types/workflows.ts` and `dms-frontend/lib/services/workflows.service.ts` with typed detail, validation, usage/history, version, and lifecycle contracts.
- [x] 2.2 Create `dms-frontend/components/workflows/WorkflowAdministration.tsx` with exclusive states, ordered stages, read-only history, new-version editing, validation gating, lifecycle states, and missing-data explanations.
- [x] 2.3 Update `dms-frontend/app/dashboard/workflows/page.tsx` to use the shared surface and permission guard while preserving the compatibility URL.

## Phase 3: Settings Ownership and Fixture Isolation

- [x] 3.1 Update `dms-frontend/app/dashboard/settings/page.tsx`, `dms-frontend/components/app-sidebar.tsx`, and `dms-frontend/lib/sidebar-nav.ts` for workflow-only admission, hidden destinations, slash-boundary highlighting, and no duplicate item.
- [x] 3.2 Implement run-scoped tracking, ordered cleanup, isolation, and failure propagation in `dms-frontend/e2e/workflow-fixtures.ts`; keep every created document, definition, version, and execution covered.

## Phase 4: Frontend Tests and E2E Verification

- [x] 4.1 Add component regression tests in `dms-frontend/components/workflows/__tests__/WorkflowAdministration.test.tsx` for loading/error/empty/populated exclusivity, invalid activation, read-only history, new versions, and duplicate-submit prevention.
- [x] 4.2 Complete `dms-frontend/app/dashboard/workflows/__tests__/page.test.tsx`, `dms-frontend/app/dashboard/settings/__tests__/page.test.tsx`, `dms-frontend/components/__tests__/app-sidebar.test.tsx`, and `dms-frontend/lib/__tests__/sidebar-nav.test.ts` for permissions, ownership, compatibility, and highlighting.
- [x] 4.3 Run the focused Jest suites and `dms-frontend/e2e/workflow-journey.spec.ts` Playwright journey; verify lifecycle visibility, authorization, cleanup success, and teardown failure reporting.
