# Tasks: Document Card View

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: card component + unit tests → PR 2: page wiring + integration tests |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add the isolated card presentation and contract coverage | PR 1 | `npm test -- --runInBand components/documents/__tests__/DocumentCard.test.tsx` | N/A — isolated component; CSS reflow needs browser validation | Revert `DocumentCard.tsx` and its test |
| 2 | Wire page switching and shared-state integration | PR 2 | `npm test -- --runInBand app/dashboard/documents/__tests__/page.test.tsx` | N/A — no authenticated document browser fixture exists | Revert page wiring and its test |

## Phase 1: Card Presentation

- [x] 1.1 Create `dms-frontend/components/documents/DocumentCard.tsx` with the existing document/action prop contract, semantic `<li><article>`, `h3` detail link, thumbnail fallback, metadata, selection, permission-aware actions, and natural title wrapping.
- [x] 1.2 Create `dms-frontend/components/documents/__tests__/DocumentCard.test.tsx` covering semantic structure, long-title completeness, thumbnail fallback, selection, every action callback, and `canDelete` visibility.

## Phase 2: Page Integration

- [x] 2.1 Modify `dms-frontend/app/dashboard/documents/page.tsx` to own `viewMode` defaulting to `grid`, expose labeled `aria-pressed` buttons with visible focus, and render the card `ul` grid or unchanged list branch from `filteredDocuments`.
- [x] 2.2 Create `dms-frontend/app/dashboard/documents/__tests__/page.test.tsx` covering default cards, selected-state switching, identical documents and selection across modes, shared state/dialog behavior, and reset without persistence.

## Phase 3: Verification

- [x] 3.1 Run the focused Jest commands for both new test files and confirm all existing document behavior remains covered.
- [x] 3.2 Run `npm run build` in `dms-frontend` and manually verify one/two/three-column reflow, keyboard focus, long names, and 200% text without page-level two-dimensional scrolling.
