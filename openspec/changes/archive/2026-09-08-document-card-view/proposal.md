# Proposal: Document Card View

## Intent

Give users a more scannable document workspace by adding a sober responsive card/grid presentation while retaining the current list view and its behavior. Cards must reuse existing document data, permissions, selection, thumbnails, dialogs, and actions without expanding backend or API scope.

## Scope

### In Scope
- Add a page-level view mode defaulting to cards on every load.
- Add two compact view-switch buttons with an accessible selected state.
- Add a semantic `ul`/`li` card collection with responsive one-, two-, and three-column layouts.
- Preserve list rendering, shared filters/states, document actions, and Spanish UI conventions.
- Allow document names to wrap naturally across lines without ellipsis or tooltip interaction.

### Out of Scope
- Backend, API, or `Document` type changes.
- View-mode persistence, filter redesign, new card interactions, or unrelated visual redesign.

## Capabilities

### New Capabilities
- `document-card-view`: Responsive, accessible card/grid presentation that coexists with the existing document list.

### Modified Capabilities
- None. Existing document listing, directory, permission, and workflow requirements remain behaviorally unchanged.

## Approach

Create a focused `DocumentCard` presentation component and keep view selection at `DocumentsPage`. Render one mode at a time from the existing filtered collection, reusing current handlers and thumbnail loading. Use restrained borders, neutral surfaces, stable media/action areas, visible focus states, logical headings, and wrapping content. Keep card metadata and existing actions equivalent to the list without introducing interactions. Carry forward evidence from `W3C-WCAG22`, `W3C-APG-RADIO`, `W3C-REFLOW`, `W3C-RESIZE`, `W3C-FOCUS`, `USWDS-CARD`, and `USWDS-PRINCIPLES`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `dms-frontend/app/dashboard/documents/page.tsx` | Modified | Own view state, switch controls, and card/list selection. |
| `dms-frontend/components/documents/DocumentCard.tsx` | New | Render accessible card content and existing document actions. |
| `dms-frontend/components/documents/DocumentListItem.tsx` | Preserved | Remain the list presentation and action contract. |
| `dms-frontend/components/documents/__tests__/` | New/Modified | Focused card, responsive, and accessibility coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Card and list behavior diverge | Med | Reuse page handlers, permissions, and data; test equivalent actions. |
| Long content clips or destabilizes cards | Med | Allow wrapping, flexible heights, and enlarged-text/reflow checks. |
| Selection or thumbnails regress when switching | Low | Render one mode at a time and preserve existing hook/state ownership. |

## Rollback Plan

Remove the card component, switch controls, and page grid branch; restore the page to render `DocumentListItem` only. No migrations, API changes, or persisted data require rollback.

## Dependencies

- Existing frontend document data, thumbnail hook, permissions, selection state, dialogs, and action callbacks.
- No `openspec/config.yaml` or project-specific proposal rules were found.

## Success Criteria

- [ ] Cards are the default on every screen load; switching to list preserves the current list behavior.
- [ ] Keyboard and assistive-technology checks confirm labeled selected-state controls, visible focus, semantic `ul`/`li` structure, and equivalent document actions.
- [ ] Names wrap without ellipsis or tooltip dependency, and content remains usable at narrow widths and 200% text resize.
- [ ] Focused frontend tests and the available frontend validation commands pass with no backend/API/type changes.
