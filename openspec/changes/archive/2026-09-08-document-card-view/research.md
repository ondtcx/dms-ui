# Research: document-card-view

```yaml
artifact: gentle-ai.sdd-research/v1
revision: 1
outcome: done
```

## Selected request

Identify current, authoritative accessibility and sober institutional UI guidance relevant to a responsive document card/grid view that coexists with a list view. The lane covers keyboard-accessible view switching, semantic structure, readable truncation and metadata, responsive layout, and restrained visual treatment. Backend architecture, persistence, filter redesign, and new document interactions are excluded.

## Admission

- Capability declaration: `gentle-ai.sdd-research-capability/v1`
- Required evidence class: `open-web`
- Declared grant: exact `open-web`
- Observed grants: `open-web`
- Denied classes: `documentation`
- Admission result: admitted for public, source-identifiable web documentation only.

## Sources

| ID | Class | Title | Publisher | URL | Accessed | Freshness | Relevant excerpt |
|---|---|---|---|---|---|---|---|
| W3C-WCAG22 | open-web | Web Content Accessibility Guidelines (WCAG) 2.2 | W3C | https://www.w3.org/TR/WCAG22/ | 2026-09-08 | W3C Recommendation dated 2024-12-12; latest published version was accessed | WCAG 2.2 covers web content on any device and provides testable success criteria under perceivable, operable, understandable, and robust principles. |
| W3C-APG-RADIO | open-web | Radio Group Pattern | W3C WAI-ARIA Authoring Practices Guide | https://www.w3.org/WAI/ARIA/apg/patterns/radio/ | 2026-09-08 | Page copyright notice is 2026; current public APG page was accessed | For a radio group outside a toolbar, Tab enters and leaves the group, Space checks the focused option, and arrow keys move among options while changing the checked option. The group and each option need labels. |
| W3C-REFLOW | open-web | Understanding SC 1.4.10 Reflow | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | 2026-09-08 | Updated 2026-08-10 | Content should remain available without loss of information or functionality and without two-dimensional scrolling at the required viewport equivalent; responsive layouts may stack sections into one column. |
| W3C-RESIZE | open-web | Understanding SC 1.4.4 Resize Text | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html | 2026-09-08 | Updated 2026-07-12 | Text must remain usable up to 200% without loss of content or functionality. Truncation is acceptable for a constrained label only when the full content is available on focus or activation and users receive another indication that it is available. |
| W3C-FOCUS | open-web | Understanding SC 2.4.7 Focus Visible | W3C WAI | https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html | 2026-09-08 | Updated 2026-07-12 | Keyboard-operable interfaces need a mode in which the focus indicator is visible; the indicator should remain visible while focus is shown. |
| USWDS-CARD | open-web | Card | U.S. Web Design System | https://designsystem.digital.gov/components/card/ | 2026-09-08 | USWDS v3.14.0 page; guidance update listed 2025-02-14 | Cards are modular summaries in collections. USWDS recommends a `ul` card group with an `li` per card, logical heading levels, media following the header in source order, responsive grid utilities, and simple styling that does not overemphasize the card metaphor. |
| USWDS-PRINCIPLES | open-web | Design principles | U.S. Web Design System | https://designsystem.digital.gov/design-principles/ | 2026-09-08 | Page update listed 2025-02-21 | USWDS frames institutional service design around accessibility, trust, plain language, continuity, consistent behavior across devices, and testing with real users. |

## Validated claims

### View switching and keyboard access

- **C1 — A two-option view mode is a mutually exclusive choice.** If the switch is implemented as a radio group, APG specifies one checked option, labeled group/options, Tab entry and exit, Space activation, and arrow-key movement among options. **Sources:** W3C-APG-RADIO.
- **C2 — Keyboard focus must remain visible.** Any view-switch control and every other keyboard-operable card/list control need a visible focus state in at least one operating mode. **Sources:** W3C-FOCUS.
- **C3 — The source element should match the interaction semantics.** APG radio semantics are guidance for a radio group, not a blanket requirement that every visual toggle use ARIA radios; the final control choice must preserve an accurate name, role, value, and keyboard behavior. **Sources:** W3C-APG-RADIO, W3C-WCAG22. **Uncertainty:** the sources do not select between native radios, buttons, or another project-supported control pattern for this product.

### Semantic card and list structure

- **C4 — Card collections should expose collection structure.** USWDS recommends a `ul` for a card group and an `li` for each card so assistive technology can enumerate the collection and move between items. **Sources:** USWDS-CARD.
- **C5 — Card headings need to fit the page outline.** The heading level for each card should be selected according to the surrounding page hierarchy rather than chosen solely for visual size. **Sources:** USWDS-CARD.
- **C6 — Visual ordering must not hide meaningful reading order.** WCAG requires relationships and meaningful sequence to remain programmatically determinable, while USWDS specifically places card media after the header in source order and uses CSS for visual variants. **Sources:** W3C-WCAG22, USWDS-CARD.

### Readability, truncation, and metadata

- **C7 — Truncation cannot be the only way to access a long document label.** When a constrained label is truncated, the complete value must remain available on focus or activation and the UI must provide an indication beyond the truncation itself. **Sources:** W3C-RESIZE.
- **C8 — Text and metadata must survive enlargement.** The card/list presentation must preserve content and functionality when text is resized to 200%; fixed heights or overflow rules must not clip important titles, labels, badges, or actions. **Sources:** W3C-RESIZE.
- **C9 — Long strings should reflow rather than force page-level two-dimensional reading.** WCAG describes responsive stacking and wrapping as valid ways to keep content readable at narrow or zoomed viewports; any intentional exception must be limited to content whose two-dimensional layout is necessary for meaning or use. **Sources:** W3C-REFLOW.

### Responsive layout and restrained institutional treatment

- **C10 — A responsive card grid may change column count and stack.** USWDS documents card groups as wrap-able grid layouts with responsive column utilities, and WCAG describes stacking content into one column as a common reflow approach. **Sources:** USWDS-CARD, W3C-REFLOW.
- **C11 — Sober styling is consistent with the cited institutional guidance.** USWDS advises simple card styling and avoiding decoration that calls excessive attention to the paper-card metaphor. This supports restrained borders, neutral surfaces, and limited visual emphasis, but does not prescribe a specific color, radius, shadow, or spacing token. **Sources:** USWDS-CARD. **Uncertainty:** “sober” remains a product/design judgment, not a measurable standard in these sources.
- **C12 — Consistency across views is an institutional usability concern.** USWDS promotes continuity, equivalent access across devices, and clear next actions. This supports keeping document identity, metadata, selection, permissions, and existing actions equivalent between list and grid presentations, but it does not authorize adding or removing product interactions. **Sources:** USWDS-PRINCIPLES. **Uncertainty:** equivalence of the current product’s exact action set requires implementation verification, not external guidance.

## Contradictions and uncertainty

- No admitted source directly contradicts another on the requested topics.
- APG defines keyboard behavior for a radio group, while WCAG provides outcome-oriented requirements rather than mandating a specific widget pattern. Therefore, the research does not decide whether the product should use native radios, buttons with pressed state, or another existing component convention.
- USWDS card guidance is a design-system recommendation, not a binding WCAG requirement. Its `ul`/`li` structure and simple visual treatment should be treated as authoritative guidance for this lane, not as proof that every implementation must copy USWDS markup or styling.
- WCAG permits truncation only with a recoverable full value and an indication; it does not prescribe whether recovery should be an expanded label, a detail view, a tooltip, or another accessible mechanism.
- The exploration artifact is product context, not external evidence. It remains separate from the validated claims.

## Non-authoritative product choices

These are handoff considerations, not approved requirements:

- Keep the view switch as a single, labeled mutually exclusive control group and preserve visible focus; select the concrete native/component pattern during proposal and design.
- Render cards as a semantically ordered collection, with document title as the card heading and source order matching the reading order.
- Use a responsive one-column fallback and test at narrow widths and enlarged text; do not rely on visual ellipsis alone for complete document names or metadata.
- Keep the card treatment restrained and consistent with the existing institutional surface rather than introducing decorative card effects.
- Preserve equivalent access to existing selection and document actions in both views without adding new interactions or changing backend behavior.

## Research readiness

The selected lane is complete with admitted, source-mapped claims. Proposal readiness still depends on the separate pre-proposal state: product decisions remain pending and must be confirmed by the orchestrator; this research does not infer that consent.
