# Document Card View Specification

## Purpose

Provide an accessible, responsive card/grid presentation while preserving the list and behavior.

## Requirements

### Requirement: Default Card View and List Coexistence

Documents screen MUST default to cards, permit the list, and render only selected mode.

#### Scenario: Documents page loads with results

- GIVEN the page loads with results
- WHEN loading finishes
- THEN cards are selected and each filtered document appears in the grid

#### Scenario: User selects the existing list

- GIVEN cards are selected
- WHEN the user selects list view and then cards
- THEN the existing list appears and the same documents return as cards

### Requirement: Accessible View Switch Controls

Two compact buttons MUST identify each mode, expose its accessible name and selected state, and show visible keyboard focus.

#### Scenario: User changes presentation with the controls

- GIVEN the card button is selected
- WHEN the user activates the list button
- THEN the list button exposes selected and the card button does not

#### Scenario: Keyboard focus reaches both controls

- GIVEN a keyboard user focuses a view-switch button
- WHEN it receives focus
- THEN its indicator is visible and it can be activated without a pointer

### Requirement: Semantic Card Collection

Card view MUST use a semantic `ul` with one `li` per document. Each item MUST have a logical title heading and meaningful source order for identity, media, metadata, selection, and actions.

#### Scenario: Assistive technology enumerates cards

- GIVEN multiple documents are displayed as cards
- WHEN assistive technology inspects them
- THEN it identifies one unordered list, one item per document, with each title as its heading

### Requirement: Wrapping and Responsive Reflow

Names MUST wrap naturally without ellipsis, clipping, or tooltip dependency. The grid MUST reflow to one column when narrow and two or three when space permits; 200% text MUST preserve content and functionality.

#### Scenario: Document has a long name

- GIVEN a document title is longer than one line
- WHEN its card is displayed
- THEN the complete title wraps across available lines without tooltip or hover interaction

#### Scenario: Narrow or enlarged presentation

- GIVEN the viewport is narrow or text is enlarged to 200 percent
- WHEN cards are displayed
- THEN content reflows without page-level two-dimensional scrolling and titles, metadata, selection, and actions remain usable

### Requirement: Equivalent Document Behavior

Cards MUST preserve the list's identity, metadata, permissions, selection, and actions: preview, download, versions, edit, replace, delete, and move. Card view MUST NOT add interactions.

#### Scenario: User performs an existing document action from a card

- GIVEN an action is available in list view
- WHEN the user invokes it for the same document in card view
- THEN it has the same result and permission behavior

#### Scenario: Selection remains equivalent

- GIVEN documents are selected in one mode
- WHEN the user switches modes
- THEN the same selection is represented and existing batch actions target it

### Requirement: Shared Page State and Non-Persistence

Capability MUST remain frontend-only, with no backend, API, or Document type changes. Both modes MUST share search/category/ownership filters, directory, tabs, loading/error/empty, selection, and dialogs. View mode MUST be component state only; each load SHALL default to cards and MUST NOT persist the choice.

#### Scenario: Switching preserves shared state

- GIVEN filters are active and documents are selected
- WHEN the user switches modes and opens an existing dialog
- THEN filters and selection remain unchanged and the dialog retains its behavior

#### Scenario: New page load resets the presentation

- GIVEN the user previously selected list view
- WHEN the page loads again
- THEN card view is selected and no view preference is read or written

## Evidence References

- Sources: `W3C-WCAG22`, `W3C-FOCUS`, `W3C-RESIZE`, `W3C-REFLOW`, `W3C-APG-RADIO`, `USWDS-CARD`, and `USWDS-PRINCIPLES`; APG informs semantics, while confirmed choice remains buttons. URLs/excerpts are in `research.md`.
