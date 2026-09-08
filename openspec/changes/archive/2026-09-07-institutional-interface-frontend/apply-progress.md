# Apply Progress: Institutional Interface Frontend

## Work Unit

- **Slice:** Second `stacked-to-main` slice, dashboard metadata, document traceability, and safe audit states
- **Delivery:** Automatic mode, auto-chain, stacked-to-main, 500-line review budget
- **Mode:** Strict TDD
- **Scope:** Tasks 1.1–1.3, 2.1–2.3, 3.1–3.3, 4.1–4.3, 5.1, and 5.2
- **Remediates failed evidence revision:** `sha256:a16da4f681bfc8aaf2ae0da23a425e1eccc712450c6ba4131ff36e581c52c97c`

## Completed Tasks

- [x] 1.1 Token/default and runtime-appearance assertions
- [x] 1.2 Shell identity, navigation, responsive, focus-order, permission, and logout assertions
- [x] 1.3 Formal-Spanish and accessibility-copy assertions
- [x] 2.1 Curated semantic tokens and stable appearance fallbacks
- [x] 2.2 Minimal accessible header and institutional identity refinement
- [x] 2.3 Formal shell/settings presentation copy
- [x] 3.1 Dashboard number and current-version RED assertions
- [x] 3.2 Detail, version, and workflow traceability RED assertions
- [x] 3.3 Protected audit denied/unavailable/blocked RED assertions
- [x] 4.1 Dashboard metadata and unavailable fallbacks
- [x] 4.2 Identity, version history, and separate workflow traceability
- [x] 4.3 Protected frontend-only audit states and supplied-record rendering
- [x] 5.1 Verification checks and bounded regression accounting
- [x] 5.2 Playwright shell and traceability scenarios

## Strict TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 | `app/globals.test.tsx` | Unit | N/A (new) | ✅ Written; focused run failed on missing exports/tokens | ✅ Passed; 5 suites, 18 tests | ✅ Missing, partial, and empty color cases | ✅ Passed after typed test cleanup |
| 1.2 | shell tests | Integration/unit | ✅ Existing focused baseline | ✅ Written; assertions failed before implementation | ✅ Passed | ✅ Identity and permission cases | ✅ Passed |
| 1.3 | shell copy tests | Integration | N/A (new) | ✅ Written; copy assertions failed | ✅ Passed | ✅ Account and breadcrumb labels | ✅ Passed |
| 2.1 | `app/globals.test.tsx` | Unit | N/A (new) | ✅ Covered by 1.1 RED | ✅ Passed | ✅ Light/dark and partial settings | ✅ Passed |
| 2.2 | shell tests | Integration | ✅ Existing shell tests | ✅ Covered by 1.2 RED | ✅ Passed | ✅ Collapsed and identity states | ✅ Passed |
| 2.3 | shell copy tests | Integration/unit | ✅ Existing suite baseline | ✅ Copy assertions failed | ✅ Passed; full prior suite green | ✅ Spanish controls | ✅ Passed |
| 3.1 | `app/dashboard/home/__tests__/page.test.tsx` | Integration | ✅ 15/15 baseline | ✅ Written; metadata assertions failed before row changes | ✅ Passed | ✅ Supplied and absent number/version cases | ✅ Passed after shared row fallbacks |
| 3.2 | detail, version, and workflow tests | Unit/integration | N/A (new) | ✅ Written; helpers were absent | ✅ Passed; 4 tests green | ✅ Complete and partial actor/time inputs | ✅ Passed after extracting pure mappings |
| 3.3 | audit page test | Integration/unit | N/A (new) | ✅ Written; audit view/resolver absent | ✅ Passed; 3 tests green | ✅ Denied, unavailable, blocked, supplied records | ✅ Passed after route-safe extraction |
| 4.1 | dashboard page test | Integration | ✅ Dashboard baseline | ✅ Covered by 3.1 RED | ✅ Passed; dashboard suite green | ✅ Supplied and unavailable paths | ✅ Passed preserving inbox hierarchy |
| 4.2 | detail/version/workflow tests | Unit/integration | N/A (new) | ✅ Covered by 3.2 RED | ✅ Passed | ✅ Separate event mappings | ✅ Passed |
| 4.3 | audit page test | Integration/unit | N/A (new) | ✅ Covered by 3.3 threat RED | ✅ Passed | ✅ Denied, unavailable, blocked, records | ✅ Passed; no endpoint added |
| 5.1 | Existing Jest suite and quality commands | Verification | ✅ Prior slice evidence | ✅ Verification assertions exercised before completion | ✅ Jest/typecheck/build passed; lint baseline remains failing | ✅ Rechecked changed-slice lint findings against diff | ✅ Removed the newly introduced test `any`; retained unrelated baseline errors |
| 5.2 | Existing Playwright suites | Runtime integration | ✅ Existing E2E scenarios | ✅ Existing scenarios executed before completion | ✅ 2 passed; 2 blocked by backend/runtime harness | ✅ Distinguished frontend coverage from backend failures | ✅ No application behavior changed |

## Work Unit Evidence

| Evidence | Result |
|----------|--------|
| Focused test command and exact result | `npm test -- --runInBand`; **25 suites passed, 90 tests passed**. `npx tsc --noEmit`; **passed**. |
| Runtime harness command/scenario and exact result | `npx playwright test`; **2 passed, 2 failed**. Failures are bounded to existing backend/runtime harness behavior: `pdfParse is not a function` during PDF upload and a 30-second navigation timeout; shell/traceability coverage otherwise executed. |
| Rollback boundary | Revert only the verification bookkeeping plus the directly proven lint cleanup in `components/__tests__/app-sidebar.test.tsx`; prior application slices and their evidence remain independently revertible. |

## Checks

- `npm test -- --runInBand`: **25 suites passed, 90 tests passed**
- `npm run lint`: **blocked by pre-existing repository errors** across unrelated and legacy files; the newly introduced `mockSettings: any` finding was removed, while the pre-existing `next/link` mock `any` and `InstitutionForm` `logoPath` finding remain.
- `npx tsc --noEmit`: **passed**
- `npm run build`: **passed**; compiled successfully and generated 28 static pages. Existing Handlebars webpack and Node deprecation warnings remain non-fatal.
- `npx playwright test`: **2 passed, 2 failed**; failures were existing runtime/backend harness issues, not focused traceability assertions.

## Notes

- Existing authorization predicates, dashboard hierarchy, version/workflow contracts, and no-new-endpoint boundary were preserved.
- Audit records render only from `Document.accesses`; absent records remain unavailable, query failures are blocked, and unauthorized roles are denied before retrieval.
- Verification used the required native acquire token and must settle with remediated evidence revision `sha256:a16da4f681bfc8aaf2ae0da23a425e1eccc712450c6ba4131ff36e581c52c97c`; verification evidence above is distinct from that revision.
