```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:c20adc94d0bdcf7992964e4dca80d6a575572d63a5407f66f22abe7dfbaba88b
verdict: pass
blockers: 0
critical_findings: 0
requirements: 9/9
scenarios: 18/18
test_command: npm test -- --runInBand
test_exit_code: 0
test_output_hash: sha256:ea94774d1c35cc16285e7f4b5fdbda90ceece33bae5c81de09d4e4a24b3aca67
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:ccaf358856f66ab562e31c52ea1bbf283b547f679c235e2adadb2970a515f071
```

## Verification Report

**Change**: institutional-interface-frontend  
**Version**: N/A  
**Mode**: Strict TDD  
**Artifact store**: OpenSpec  
**Acquire token**: `sha256:dde2015f778212233e85334b9d63fd5a77c5af7f98a03ba6fde58e8369991fed`  
**Remediates prior failed evidence**: `sha256:d70ca396a3ab2cf241694eecda85405c5dd590a8214b395152c93d0da1aca1b3`

### Executive Summary

Fresh runtime verification passes all approved requirements and scenarios. Jest, typecheck, production build, and the complete Playwright suite pass against the updated PDFParse v2 backend. The focused 390px browser coverage proves no horizontal overflow, reachable mobile navigation, keyboard order, dashboard continuation, permission grant, revocation, and post-revocation denial. No functional product changes were made.

### Completeness

| Metric | Value |
|---|---:|
| Requirements total | 9 |
| Requirements complete | 9 |
| Scenarios total | 18 |
| Scenarios with complete runtime evidence | 18 |
| Tasks total | 14 |
| Tasks complete | 14 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Jest**: ✅ 25 suites / 90 tests passed.  
Command: `npm test -- --runInBand`  
Exit code: `0`  
Output hash: `sha256:ea94774d1c35cc16285e7f4b5fdbda90ceece33bae5c81de09d4e4a24b3aca67`

**Type check**: ✅ Passed.  
Command: `npx tsc --noEmit`  
Exit code: `0`  
Output hash: `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

**Build**: ✅ Passed; 28 static pages generated.  
Command: `npm run build`  
Exit code: `0`  
Output hash: `sha256:ccaf358856f66ab562e31c52ea1bbf283b547f679c235e2adadb2970a515f071`

Existing Handlebars webpack and Node deprecation warnings are non-fatal.

**Coverage**: ✅ Passed; informational only.  
Command: `npm test -- --runInBand --coverage`  
Exit code: `0`  
Output hash: `sha256:462c603549e1244348002552da374693debb9709b5dc6e396d34039f1ddba8e1`  
Overall: 72.06% statements, 76.96% branches, 57.19% functions, 72.06% lines; no threshold configured.

**Lint**: ⚠️ Non-zero legacy baseline.  
Command: `npm run lint`  
Exit code: `1`  
Output hash: `sha256:3fc622cbeda6c3a205a5710efb346ef66b56c1f916b23cf80c79f22c72fe2bfd`  
Findings span legacy/unrelated files; changed-slice findings include the existing `next/link` mock `any` and unused `logoPath`.

**Browser runtime**: ✅ 4/4 Playwright scenarios passed against the updated backend.  
Command: `npx playwright test --workers=1 --timeout=180000`  
Exit code: `0`  
Output hash: `sha256:c20adc94d0bdcf7992964e4dca80d6a575572d63a5407f66f22abe7dfbaba88b`  
The 390px tests passed assertions for `scrollWidth <= 390`, mobile navigation reachability, keyboard order, light/dark readability, dashboard continuation branches, permission grant, revocation, and denied document access. Workflow approval/traceability and upload/download journeys also passed.

### Spec Compliance Matrix

| Requirement | Scenarios | Runtime evidence | Result |
|---|---:|---|---|
| Curated Institutional Theme | 2/2 | Jest token/fallback tests plus Playwright light/dark contrast | ✅ COMPLIANT |
| Stable Institutional Navigation Shell | 2/2 | Sidebar integration tests plus 390px Playwright navigation | ✅ COMPLIANT |
| Minimal Accessible Header | 2/2 | Layout Jest tests plus 390px keyboard-order Playwright coverage | ✅ COMPLIANT |
| Formal Spanish on Modified Surfaces | 2/2 | Shell, account, breadcrumb, state, and accessibility Jest suites | ✅ COMPLIANT |
| Dashboard Compatibility | 2/2 | Dashboard Jest states plus Playwright continuation branches | ✅ COMPLIANT |
| Document Identity and Version Traceability | 2/2 | Detail/history Jest tests plus workflow Playwright journey | ✅ COMPLIANT |
| Distinct Workflow Event Traceability | 2/2 | Workflow mapping tests plus completed approval/history Playwright journey | ✅ COMPLIANT |
| Protected Audit Availability | 2/2 | Audit tests plus permission-backed Playwright fixture | ✅ COMPLIANT |
| Explicit Protected-State Outcomes | 2/2 | Denied/unavailable/blocked Jest tests plus post-revocation Playwright denial | ✅ COMPLIANT |

**Compliance summary**: 18/18 scenarios fully compliant.

### Correctness (Static Evidence)

| Dimension | Status | Notes |
|---|---|---|
| Theme and shell | ✅ Implemented | Semantic tokens, identity, responsive navigation, permission filtering, and accessible header preserved. |
| Dashboard | ✅ Implemented | Summary hierarchy and loading/empty/error/denied semantics remain distinct; metadata fallbacks are explicit. |
| Traceability | ✅ Implemented | Number/version history and workflow events remain separately presented with fallbacks. |
| Protected audit | ✅ Implemented | Only supplied authorized records render; unavailable, blocked, and denied states fail closed without a new endpoint. |
| Scope protection | ✅ Confirmed | No frontend functional changes during verification; updated backend was an external prerequisite already implemented and archived. |

### Coherence (Design)

| Decision | Followed? | Notes |
|---|---|---|
| Curated CSS semantic tokens | ✅ Yes | Existing settings overrides and light/dark token strategy retained. |
| Refine existing shell in place | ✅ Yes | Existing routes, permissions, logout, mobile sheet, and collapse behavior retained. |
| Protected audit boundary | ✅ Yes | No audit endpoint or fabricated records introduced. |
| Separate traceability concepts | ✅ Yes | Version and workflow histories are distinct in UI and runtime journey. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | Complete cycle table present in `apply-progress.md`. |
| All tasks have tests | ✅ | 14/14 tasks have test evidence. |
| RED confirmed | ✅ | Listed test files exist. |
| GREEN confirmed | ✅ | Jest and all 4 Playwright scenarios pass in current execution. |
| Triangulation adequate | ✅ | Missing/partial/complete metadata, state outcomes, themes, navigation, permissions, and revocation are covered. |
| Safety net for modified files | ✅ | Apply evidence reports baselines and appropriate N/A for new test files. |

**TDD Compliance**: 6/6 checks passed.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit | 6 focused mapping/token suites | 4 | Jest |
| Integration | 84 | 21 | Jest + React Testing Library |
| E2E | 4 scenarios | 3 | Playwright + updated NestJS backend |
| **Total** | **90 Jest tests + 4 E2E scenarios** | **25 Jest suites + 3 E2E files** | |

### Changed File Coverage

| File | Line % | Branch % | Rating |
|---|---:|---:|---|
| `app/dashboard/layout.tsx` | 100 | 100 | ✅ Excellent |
| `components/app-sidebar.tsx` | 84.68 | 36.84 | ⚠️ Acceptable |
| `components/nav-user.tsx` | 100 | 50 | ✅ Excellent |
| `components/documents/DashboardDocumentRow.tsx` | 100 | 83.33 | ✅ Excellent |
| `components/documents/DocumentAuditView.tsx` | 100 | 66.66 | ✅ Excellent |
| `components/navigation/DashboardBreadcrumb.tsx` | 93.33 | 44.44 | ✅ Excellent |
| `lib/document-traceability.ts` | 100 | 91.66 | ✅ Excellent |

**Average changed-file coverage**: Informational; overall coverage 72.06%. Branch coverage remains low in `app-sidebar.tsx`; no threshold configured.

### Assertion Quality

✅ Fresh scan found no tautologies, ghost loops, orphan empty-array assertions, smoke-only assertions, or unpaired type-only assertions. Assertions exercise production calls, rendered behavior, API flows, or user-visible outcomes.

### Quality Metrics

**Linter**: ⚠️ Non-zero legacy baseline; no new functional lint regression was introduced during verification.  
**Type Checker**: ✅ No errors.  
**Build**: ✅ Passed.

### Issues Found

**CRITICAL**:
- None.

**WARNING**:
- Lint remains non-zero due to repository baseline findings, including changed-slice pre-existing `next/link` mock `any` and `InstitutionForm` `logoPath`.
- Overall coverage is below 80% and changed-file branch coverage is low in `app-sidebar.tsx`; coverage is informational and no threshold is configured.

**SUGGESTION**:
- Preserve the 390px Playwright coverage and run it with a warmed/serialized dev harness when local compilation exceeds the default 60-second webServer startup window.

### Verdict

**PASS WITH WARNINGS**  
All 9 requirements and 18 scenarios have current runtime evidence. The warnings are limited to the pre-existing lint baseline and informational coverage metrics; no functional product changes were made.
