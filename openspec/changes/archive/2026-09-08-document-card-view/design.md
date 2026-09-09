# Design: Document Card View

## Technical Approach

Add a focused `DocumentCard` presentation component and keep `viewMode` in `DocumentsPage`, initialized to `"grid"`. The page will render either a semantic card collection or the unchanged `DocumentListItem` collection from the same `filteredDocuments` array. Existing queries, thumbnail loading, filters, selection, permissions, handlers, dialogs, tabs, and empty/loading/error states remain page-owned and shared. No backend, API, or `Document` type changes are required.

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Presentation boundary | New `DocumentCard` returns one document card (`li` containing an article/card surface); `DocumentsPage` owns the `ul` and grid classes. | Add a layout variant to `DocumentListItem`; duplicate markup in the page. | Isolates responsive markup while preserving the established list component and keeping page behavior centralized. |
| View control semantics | Two compact `Button` controls in a labeled group, with `aria-pressed`, explicit accessible names, `type="button"`, and existing `focus-visible` styling. | Radio ARIA behavior; persisted preference; unlabeled icon buttons. | Matches the confirmed button decision, accurately exposes toggle state, and avoids new keyboard or persistence behavior. |
| Action contract | Pass the existing document, thumbnail, selection, permission, deletion, and action callbacks to both presentations. | Card-specific handlers or a second data model. | Prevents permission and behavior drift; cards add no interactions. |

## Data Flow

```text
DocumentsPage query/filter state
        │
        ├── filteredDocuments + thumbnailUrls + shared handlers/permissions
        │                         │
        └── viewMode ─────────────┴──> DocumentCard (`ul`/`li`) OR DocumentListItem
                                      │
                                      └── existing dialogs, mutations, and batch state
```

`DocumentsPage` adds only `useState<"grid" | "list">("grid")`. Switching mode changes presentation, not data, selection, filters, or dialog state. The existing thumbnail hook remains called once for the filtered result; only one presentation is mounted.

## File Changes

| File | Action | Description |
|---|---|---|
| `dms-frontend/app/dashboard/documents/page.tsx` | Modify | Add view state and two accessible switch buttons; render the card `ul` or existing list branch while preserving all page states and callbacks. |
| `dms-frontend/components/documents/DocumentCard.tsx` | Create | Render one document as an accessible card with the existing identity, thumbnail fallback, badges, metadata, selection checkbox, title link, and preview/download/version/edit/replace/delete/move actions. |
| `dms-frontend/components/documents/__tests__/DocumentCard.test.tsx` | Create | Focused semantic, wrapping, permission, selection, and action-contract coverage. |
| `dms-frontend/app/dashboard/documents/__tests__/page.test.tsx` | Create | Verify default cards, mode switching, shared selection, and non-persistence with mocked existing services/hooks. |

## Interfaces / Contracts

`DocumentCard` accepts the same behavior props as `DocumentListItem` except `index`: `doc`, `isSelected`, `onToggle`, `thumbnailUrl`, `onPreview`, `onDownload`, `onShowVersionHistory`, `onEdit`, `onReplaceFile`, `onDelete`, `canDelete`, `isOwn`, `isDeleting`, and `onMove`.

The card uses `<li><article>`, a logical heading (`h3`) containing the existing document detail link, and source order of identity, media, selection, metadata, and actions. The title uses normal wrapping (`min-w-0`/break-word behavior) with no ellipsis, fixed card height, or tooltip dependency. The collection is `ul` with `grid-cols-1`, `md:grid-cols-2`, and `xl:grid-cols-3`; flexible metadata/action rows and stable thumbnail sizing support narrow widths and 200% text.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | `ul`/`li`-compatible card semantics, heading, complete long title, thumbnail fallback, selection, all action callbacks, and `canDelete` visibility. | React Testing Library with representative documents and `userEvent`. |
| Integration | Cards are the initial mode; buttons expose names and `aria-pressed`; switching restores the same documents and selection; no view preference is read or written. | Focused `DocumentsPage` test with existing services/hooks mocked. |
| Browser/manual | One/two/three-column reflow, visible keyboard focus, usable controls and metadata at narrow width and 200% text. | Existing frontend build plus focused Jest tests; verify layout in a browser viewport because JSDOM has no CSS layout engine. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Rollout is frontend-only and component-local. Rollback is a Git revert removing `DocumentCard`, its tests, the view controls, and the page’s card branch; the existing list branch remains the fallback and no persisted data or API contract needs restoration.

## Open Questions

None. Product decisions define button state semantics, collection markup, wrapping, default/reset behavior, and scope boundaries.
