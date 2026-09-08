# Apply Progress: Workflow Administration Frontend

## Batch

- Change: `workflow-administration-frontend`
- Delivery: PR4 / Unit 4, `auto-chain`, `stacked-to-main`
- Scope: Final frontend regression coverage and focused/full Jest, type-check, and Playwright verification.
- Out of scope: Backend changes, native attempt settlement, commits, pushes, and pull requests.
- Mode: Strict TDD

## Cumulative Task Status

| Task | Status | Evidence |
|------|--------|----------|
| 1.1 | Complete | Explicit detail, metadata, version, validation, activate, and deactivate path/payload tests added; service suite green. |
| 1.2 | Complete | Authorized/unauthorized compatibility and absent-control route boundary tests added; workflow and Settings suites green. |
| 1.3 | Complete for this RED boundary slice | `WorkflowFixtureRegistry` records execution/version/definition/document identities, orders cleanup, and reports identity/reason; helper tests green. The journey now passes against the clean local runtime. |
| 2.1 | Complete | Typed detail, validation, usage/history, metadata, new-version, and explicit lifecycle contracts implemented. |
| 2.2 | Complete | Shared surface implements exclusive async branches, ordered stages, read-only history, new-version editing, validation-gated activation, lifecycle actions, pending duplicate protection, and missing-data explanations. |
| 2.3 | Complete | `/dashboard/workflows` renders the shared permission-scoped surface and remains the compatibility URL. |
| 3.1 | Complete | Settings exposes a permission-gated workflow destination, workflow-only users are admitted while unrelated management destinations stay hidden, Settings owns compatibility highlighting, and the direct workflow sidebar item is absent. Focused navigation suites pass 21/21 tests. |
| 3.2 | Complete | Run-scoped registry covers documents, definitions, versions, and executions; cleanup is ordered, explicit isolation is supported where backend deletion is unavailable, and failures retain record identity and reason. |
| 4.1 | Complete | Component coverage now proves exclusive list/detail async states, invalid activation gating, read-only history, new-version editing, and duplicate-submit prevention; component suite green at 7/7. |
| 4.2 | Complete | Workflow page, Settings, sidebar, and sidebar-nav regression coverage proves permission boundaries, Settings ownership, compatibility access, and slash-boundary highlighting; four-suite navigation run green at 32/32. |
| 4.3 | Complete | Full Jest, TypeScript, and corrected workflow Playwright journey passed; fixture unit coverage verifies cleanup success, isolation, ordering, and teardown failure identity/reason. |

## TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `lib/services/__tests__/workflows.service.test.ts` | Unit | ✅ 4/4 baseline | ✅ Missing explicit administration methods failed | ✅ 6/6 service tests | ✅ Path/payload and validation-error cases | ✅ Production and tests checked |
| 1.2 | `app/dashboard/workflows/__tests__/page.test.tsx`, `app/dashboard/settings/__tests__/page.test.tsx` | Component/page | ✅ 12/12 baseline | ✅ Boundary assertions added before shared surface wiring | ✅ 16/16 focused tests | ✅ Authorized, unauthorized, and absent-control cases | ✅ Production and tests checked |
| 1.3 | `e2e/__tests__/workflow-fixtures.test.ts` | Unit boundary | N/A (new helper) | ✅ Missing fixture registry failed to resolve | ✅ 2/2 helper tests | ✅ Failure identity/reason and cleanup order | ✅ Cleanup errors aggregate after all records |
| 2.1 | `lib/services/__tests__/workflows.service.test.ts` | Unit | ✅ 4/4 baseline | ✅ Contract methods were absent | ✅ 6/6 service tests | ✅ Multiple explicit IDs plus backend error normalization | ✅ Typed adapter preserved existing service methods |
| 2.2 | `components/workflows/__tests__/WorkflowAdministration.test.tsx` | Component | N/A (new surface) | ✅ Missing component failed to resolve | ✅ 2/2 component tests | ✅ Populated ordered detail and missing usage/history | ✅ Formatting and type checks pass |
| 2.3 | `app/dashboard/workflows/__tests__/page.test.tsx` | Component/page | ✅ 6/6 page baseline | ✅ Shared surface route contract introduced | ✅ Included in 16/16 focused tests | ✅ Loading/error/empty/populated and unauthorized bookmark paths | ✅ Compatibility page reduced to shared-surface adapter |
| 3.1 | `app/dashboard/settings/__tests__/page.test.tsx`, `components/__tests__/app-sidebar.test.tsx`, `lib/__tests__/sidebar-nav.test.ts` | Component/page + unit | ✅ 19/19 baseline | ✅ Workflow-only, absence, compatibility, and slash-boundary assertions written before production changes | ✅ 3 suites, 21/21 tests | ✅ Authorized vs unauthorized admission, direct-item absence, legacy and nested paths, and prefix siblings | ✅ Permission fixture reset and Settings activation paths centralized |
| 3.2 | `e2e/__tests__/workflow-fixtures.test.ts` | Unit boundary + E2E runtime | ✅ 2/2 baseline; prior journey 1/1 retained | ✅ Scope identity, explicit cleanup outcomes, and failure propagation assertions written before fixture implementation | ✅ 1 suite, 5/5 tests; Playwright 1/1 | ✅ Deleted and isolated outcomes, missing outcome failure, ordered cleanup, and all four record kinds | ➖ None needed after green |
| 4.1 | `components/workflows/__tests__/WorkflowAdministration.test.tsx` | Component | ✅ 2/2 baseline | ✅ Loading/error/empty/detail and mutation regression cases written before the duplicate-submit production correction | ✅ 1 suite, 7/7 tests | ✅ List/detail state branches, invalid validation, history, new version, and pending duplicate submission | ✅ Mock reset and in-test cleanup keep state assertions isolated |
| 4.2 | `app/dashboard/workflows/__tests__/page.test.tsx`, `app/dashboard/settings/__tests__/page.test.tsx`, `components/__tests__/app-sidebar.test.tsx`, `lib/__tests__/sidebar-nav.test.ts` | Component/page + unit | ✅ 4 suites, 28/28 baseline | ✅ Authorized/unauthorized ownership, compatibility, nested route, and boundary cases written before test-only changes | ✅ 4 suites, 32/32 tests | ✅ Workflow-only access, hidden destinations, Settings ownership, nested compatibility, and all centralized route boundaries | ✅ Permission and role fixtures reset between tests |
| 4.3 | `e2e/__tests__/workflow-fixtures.test.ts`, `e2e/workflow-journey.spec.ts` | Unit boundary + E2E runtime | ✅ Prior fixture and journey coverage retained | ✅ Existing cleanup threat cases carried forward from task 3.2 | ✅ Full Jest 28 suites/127 tests; Playwright 1/1 | ✅ Lifecycle visibility, authorization, document cleanup, definition/version/execution isolation, and teardown failure identity/reason | ➖ Verification-only task; no additional production refactor |

## Work Unit Evidence

| Evidence | Result |
|----------|--------|
| Focused test command and exact result | `npm test -- --runInBand components/workflows/__tests__/WorkflowAdministration.test.tsx app/dashboard/workflows/__tests__/page.test.tsx app/dashboard/settings/__tests__/page.test.tsx components/__tests__/app-sidebar.test.tsx lib/__tests__/sidebar-nav.test.ts` → **5 suites passed, 39 tests passed**; navigation-only rerun → **4 suites passed, 32 tests passed**. |
| Full Jest command and exact result | `npm test -- --runInBand` → **28 suites passed, 127 tests passed**. |
| Runtime harness command/scenario and exact result | `npm exec -- playwright test e2e/workflow-journey.spec.ts` → **1 test passed in 38.7s**; corrected Settings-owned journey verified lifecycle visibility, authorization, approval, and cleanup/isolation outcomes. |
| Type check | `npx tsc --noEmit` → **passed** with no compiler output. |
| Build | `npm run build` → **passed** with existing Handlebars webpack warning and Node deprecation warning; Next reported type/lint validation skipped by project build configuration. |
| Format check | `npx --no-install prettier --check ...` → **failed for five existing-style files** (`app/dashboard/settings/__tests__/page.test.tsx`, `e2e/workflow-journey.spec.ts`, `lib/types/workflows.ts`, `lib/services/workflows.service.ts`, `lib/services/__tests__/workflows.service.test.ts`). `openspec/config.yaml` reports no formatter configured; the new component and fixture files pass Prettier. |
| Rollback boundary | Revert the PR4 additions in `components/workflows/__tests__/WorkflowAdministration.test.tsx`, the four navigation/page test files, and the version-submission lock in `components/workflows/WorkflowAdministration.tsx`; preserve PR1–PR3 contracts, Settings ownership, fixture isolation, and unrelated worktree changes. |

### Prior PR3 Evidence Retained

- Focused fixture command: `npm test -- --runInBand e2e/__tests__/workflow-fixtures.test.ts` → **1 suite passed, 5 tests passed**.
- Prior runtime harness: `npm exec -- playwright test e2e/workflow-journey.spec.ts` → **1 test passed in 38.3s** with explicit cleanup/isolation outcomes.
- Prior build: `npm run build` passed with the existing Handlebars webpack and Node deprecation warnings; project build configuration skipped type/lint validation.
- Prior format check: Prettier failed for five existing-style files; no formatter is configured in `openspec/config.yaml`.

## Deviations and Risks

- The frontend detail adapter accepts backend `counts` and normalizes backend validation `errors` into the design-level `issues` contract.
- The only substantive remaining risk is that the backend currently exposes no direct deletion endpoints for workflow definitions, versions, or executions. This batch records all identities and returns explicit run-scope isolation evidence instead of inventing unsupported API calls; document cleanup uses the supported endpoint.
- The original high workload forecast, including the approximately 1,464-line aggregate estimate when the shared surface and tests were counted, was handled through the documented stacked-to-main PR1–PR4 slices. The current PR4 unit is approximately 270 authored source/test lines, below the 400-line target, so no active `size:exception` requirement remains.
- The workflow Playwright journey preserves the Settings-owned path and passed against the local runtime; fixture Jest coverage verifies both successful cleanup/isolation and visible teardown failure reporting.
- Duplicate new-version clicks could invoke the mutation before React reflected the pending state. `WorkflowAdministration` now uses a submission ref lock released on success/error; the regression test proves exactly one request is issued.

## Remaining Tasks

- None — all 11 tasks are complete.

## Work Unit Boundary

- Mode: stacked PR slice (`auto-chain`, `stacked-to-main`)
- Current work unit: PR4 / final regression coverage and apply verification
- Boundary: starts after PR3 fixture isolation and ends with all 11 tasks complete and independent verification ready
- Rollback boundary: revert the PR4 additions in `components/workflows/__tests__/WorkflowAdministration.test.tsx`, the four navigation/page test files, and the version-submission lock in `components/workflows/WorkflowAdministration.tsx`; preserve prior Settings ownership, service contracts, fixture registry, and unrelated worktree changes.
- Review budget: approximately 270 authored source/test lines for this unit, below the 400-line target; no size exception requested.

## Focused Remediation: UI Lifecycle Stability

- Failed evidence revision remediated: `sha256:867b7df94e276812ade9ed8637b532c675242c13d21b0b4e8a3020d495010250`
- Objective: `verify-remediation-ui-lifecycle-stability`, generation 9.
- Changed files: `components/workflows/__tests__/WorkflowAdministration.test.tsx` adds selected-version validation gating plus activate/deactivate service-call and displayed-state transition coverage; `e2e/workflow-journey.spec.ts` asserts Settings-owned hrefs and uses stable route navigation after the href assertions.
- Exact verification results: focused Jest `1 suite passed, 8 tests passed`; full Jest `28 suites passed, 128 tests passed`; `npx tsc --noEmit` passed; `npm run build` passed with existing Handlebars webpack and Node deprecation warnings; Playwright `1 test passed in 40.3s`; `git diff --check` passed.
- Work Unit Evidence: focused test command and full verification commands all passed; runtime harness `npm exec -- playwright test e2e/workflow-journey.spec.ts` passed; no applicable threat-matrix case failed; rollback boundary is limited to the lifecycle regression test in `components/workflows/__tests__/WorkflowAdministration.test.tsx` and the Settings-owned route navigation changes in `e2e/workflow-journey.spec.ts`, while preserving all prior workflow contracts and fixture isolation.
