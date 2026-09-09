## Exploration: Document card/grid view

### Current State
The documents page at `dms-frontend/app/dashboard/documents/page.tsx` fetches up to 50 filtered documents, loads thumbnails through `useDocumentThumbnails`, and renders every result through `DocumentListItem`. The list item already contains the document identity, thumbnail fallback, category/template/workflow/visibility badges, metadata, selection checkbox, and preview/download/version/edit/replace/delete/move actions. Search, category and ownership filters, directory navigation, batch selection, tabs, loading, error, and empty states are owned by the page and should remain shared by both views.

The frontend `Document` type already provides all card data (`versions`, `category`, `template`, `workflow`, `uploadedBy`, `createdAt`, `directoryId`, and visibility fields). Thumbnail generation and retrieval are already available; no backend or API change is needed. Existing frontend tests cover thumbnail behavior and adjacent document features, but there is no direct test for `DocumentsPage` or `DocumentListItem`. The repository has no `openspec/config.yaml`, so no project-specific OpenSpec phase rules or test commands are available.

### Affected Areas
- `dms-frontend/app/dashboard/documents/page.tsx` — own the `list`/`grid` view state, render the default grid view, add an accessible compact view switch, and preserve the existing list and all shared states/actions.
- `dms-frontend/components/documents/DocumentListItem.tsx` — retain as the list presentation and, if useful, expose shared display helpers without changing its action contract.
- `dms-frontend/components/documents/DocumentCard.tsx` — likely new focused presentation component for the institutional card, reusing the list item’s document/action props and Spanish UI copy conventions.
- `dms-frontend/hooks/use-document-thumbnails.ts` — reuse unchanged for card previews; verify that card and list rendering do not duplicate thumbnail requests.
- `dms-frontend/lib/types/index.ts` — verify only; the existing `Document` shape is sufficient and should not be expanded for this change.
- `dms-frontend/components/documents/__tests__/` — add focused card/component coverage if the implementation introduces a separately testable card component; no page-wide test harness currently exists.

### Approaches
1. **Dedicated card component with a page-level view switch** — add `DocumentCard` with the existing document actions and render either cards or `DocumentListItem` from the same filtered collection and state handlers.
   - Pros: isolates visual complexity, preserves the current list component, keeps behavior centralized in the page, and makes responsive card testing focused.
   - Cons: action props and some display logic are duplicated unless small shared helpers are extracted.
   - Effort: Medium

2. **Single component with conditional layout** — extend `DocumentListItem` with a view variant and change its markup/classes for grid mode.
   - Pros: one action contract and fewer files.
   - Cons: mixes two substantially different layouts, increases conditional complexity, and makes the established list presentation harder to maintain.
   - Effort: Medium

### Recommendation
Use a dedicated `DocumentCard` and a page-level `viewMode` state initialized to `grid`. Render cards in a responsive `grid` (one column on narrow screens, then two or three columns at wider breakpoints) while retaining `DocumentListItem` for `list`. Cards should be sober and institutional: restrained borders, neutral surface colors, consistent thumbnail area, concise title/metadata, existing status badges, and a compact action menu rather than new interactions. Reuse the existing selection, thumbnail, and action callbacks so filters, batch actions, permissions, directory moves, and dialogs behave identically in both views.

Keep the preference in component state for this change. No existing view-preference persistence convention was found, and the request requires cards as the default rather than cross-session preference. Persisting to `localStorage` or a user profile would add behavior and testing scope without a stated requirement; the orchestrator should confirm this remains intentionally out of scope.

### Risks
- Duplicating action markup can cause list and card behavior to drift; share handlers and, where practical, small display helpers rather than introducing a second data model.
- Cards with long filenames, descriptions, badges, or owner names can become uneven; use truncation/clamping and a stable thumbnail/action area while preserving accessible labels.
- The current thumbnail hook loads sequentially and is shared by both modes; the implementation must render one mode at a time and avoid changing hook behavior unnecessarily.
- Selection and “select all” are page-level and must remain correct when switching modes, including when filters change.
- No page-level test exists, and `openspec/config.yaml` is absent; proposal/design should define the focused frontend test and verification commands.

### Ready for Proposal
Yes. The smallest viable scope is frontend-only: a new card presentation, a default-grid/page-level toggle, and focused responsive/accessibility coverage. Proposal work should explicitly confirm that view preference is not persisted and that backend/type changes, new card interactions, and redesign of filters or document metadata are out of scope.
