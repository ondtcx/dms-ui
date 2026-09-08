# Tasks: Institutional Interface Frontend

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 450–650 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: shell/tokens/copy → PR 2: dashboard/traceability/audit |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Shell tokens, identity, navigation, and copy | PR 1 | `npm test -- --runInBand components/__tests__/app-sidebar.test.tsx lib/__tests__/sidebar-nav.test.ts` | `npm run dev` and keyboard/mobile shell scenario | Revert shell files and their tests only |
| 2 | Dashboard metadata, traceability, and safe audit states | PR 2 | `npm test -- --runInBand app/dashboard/home/__tests__/page.test.tsx` | `npm run dev` and authorized/denied audit scenarios; no endpoint required | Revert dashboard/detail/audit files and their tests only |

## Phase 1: Shell RED Tests

- [x] 1.1 Add failing token/default and runtime-appearance assertions in `app/globals.test.tsx` (create if absent), covering light/dark readability and missing values.
- [x] 1.2 Extend failing shell assertions in `components/__tests__/app-sidebar.test.tsx`, `lib/__tests__/sidebar-nav.test.ts`, and `app/dashboard/__tests__/layout.test.tsx` for identity/year fallbacks, slash boundaries, permissions, responsive behavior, focus order, and logout.
- [x] 1.3 Extend failing formal-Spanish and accessibility-copy assertions in `components/__tests__/nav-user.test.tsx` and `components/navigation/DashboardBreadcrumb.test.tsx` (create if absent).

## Phase 2: Shell Implementation

- [x] 2.1 Add curated semantic color, radius, and spacing tokens with stable fallbacks in `app/globals.css` and preserve `lib/contexts/SettingsContext.tsx` overrides.
- [x] 2.2 Refine header and institutional identity presentation in `app/dashboard/layout.tsx`, `components/app-sidebar.tsx`, `components/nav-user.tsx`, and `components/navigation/DashboardBreadcrumb.tsx` without changing authorization or navigation semantics.
- [x] 2.3 Update shell labels and settings presentation in `lib/sidebar-nav.ts`, `components/settings/InstitutionForm.tsx`, and `components/settings/AppearanceForm.tsx` using existing fields only; run `npm test -- --runInBand`.

## Phase 3: Traceability RED Tests

- [x] 3.1 Add failing dashboard assertions in `app/dashboard/home/__tests__/page.test.tsx` for supplied/missing number and current-version metadata while preserving loading, empty, error, denied, accessibility, and keyboard behavior.
- [x] 3.2 Add failing detail/history assertions in `app/dashboard/documents/[id]/__tests__/page.test.tsx`, `components/documents/__tests__/DocumentVersionHistory.test.tsx`, and `components/workflows/__tests__/DocumentWorkflowPanel.test.tsx` for distinct version/workflow events and missing actor/time/history fallbacks.
- [x] 3.3 Add the applicable threat RED test in `app/dashboard/documents/[id]/audit/__tests__/page.test.tsx`: direct unauthorized navigation shows denied state and no record details; also cover authorized unavailable and contract-blocked states.

## Phase 4: Dashboard and Traceability Implementation

- [x] 4.1 Expose number/version values and formal-Spanish fallbacks in `app/dashboard/home/page.tsx` and `components/documents/DashboardDocumentRow.tsx` without changing `DashboardSummary` semantics.
- [x] 4.2 Present identity, version history, and separately labeled workflow actors/timestamps in `app/dashboard/documents/[id]/page.tsx`, `components/documents/DocumentVersionHistory.tsx`, and `components/workflows/DocumentWorkflowPanel.tsx` using existing contracts.
- [x] 4.3 Create the protected frontend-only `app/dashboard/documents/[id]/audit/page.tsx`; render only supplied authorized records, otherwise distinguish unavailable, blocked, and denied states, with no service method or endpoint.

## Phase 5: Verification

- [x] 5.1 Run `npm test -- --runInBand`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`; fix regressions without changing authorization or inbox semantics.
- [x] 5.2 Run `npx playwright test` using existing app contracts when servers are available, covering desktop collapse, mobile navigation, header accessibility, and traceability entry points.
