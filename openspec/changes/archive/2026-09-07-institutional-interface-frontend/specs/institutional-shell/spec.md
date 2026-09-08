# Institutional Shell Specification

## Purpose

Define a coherent, accessible institutional shell using existing settings and preserving current navigation and dashboard behavior.

## Requirements

### Requirement: Curated Institutional Theme

The interface MUST expose semantic light and dark tokens for institutional color, radius, and spacing, and MUST remain compatible with existing runtime appearance settings without introducing fields or endpoints.

#### Scenario: Theme preserves readable content

- GIVEN a user selects either supported appearance mode
- WHEN the shell and dashboard render
- THEN semantic surfaces, text, focus indicators, and controls meet readable contrast and retain existing appearance overrides.

#### Scenario: Missing optional appearance values

- GIVEN appearance data is absent or incomplete
- WHEN the interface renders
- THEN stable curated defaults are used without fabricated institution data or a loading failure.

### Requirement: Stable Institutional Navigation Shell

The shell MUST present existing institution identity, academic-year context when available, navigation, account actions, and permissions without changing authorization semantics.

#### Scenario: Authorized responsive navigation

- GIVEN an authenticated user with filtered navigation items
- WHEN the user views desktop, collapsed, or mobile layouts
- THEN identity, permitted routes, active-route indication, account actions, and responsive navigation remain available.

#### Scenario: Missing identity context

- GIVEN institution or academic-year context is unavailable
- WHEN the shell renders
- THEN it uses an explicit neutral state and keeps navigation, logout, and permissions behavior intact.

### Requirement: Minimal Accessible Header

The header MUST retain the sidebar trigger, breadcrumb, and search in a stable hierarchy, and MUST provide logical keyboard order, visible focus, accessible names, and responsive behavior.

#### Scenario: Keyboard navigation

- GIVEN a keyboard-only user enters the dashboard
- WHEN focus moves through the header
- THEN controls follow visual order, have accessible names, and remain operable without pointer input.

#### Scenario: Narrow viewport

- GIVEN a viewport below the desktop breakpoint
- WHEN the header and navigation render
- THEN content remains usable without horizontal scrolling and the mobile navigation remains reachable.

### Requirement: Formal Spanish on Modified Surfaces

Modified shell, dashboard, and related presentation copy MUST use clear formal Spanish, while preserving the meaning of existing statuses, labels, and accessible announcements.

#### Scenario: Updated presentation copy

- GIVEN a user views a modified shell or dashboard surface
- WHEN labels, headings, statuses, or help text appear
- THEN the copy is formal Spanish and communicates the same action or state.

#### Scenario: State and accessibility copy

- GIVEN loading, empty, error, or denied content is displayed
- WHEN assistive technology reads the surface
- THEN its formal Spanish label and announcement identify the current state unambiguously.

### Requirement: Dashboard Compatibility

The dashboard MUST preserve its existing hierarchy, summary semantics, loading, empty, error, denied, accessibility, responsive, keyboard-order, and permission behavior while making document number and current-version information discoverable when supplied.

#### Scenario: Existing summary remains intact

- GIVEN dashboard summary data is available
- WHEN the dashboard renders
- THEN pending-officialization and recent-document hierarchy remains unchanged and rows show supplied identity and current-version data.

#### Scenario: Existing non-success state remains distinct

- GIVEN the summary is loading, empty, errored, or denied
- WHEN the dashboard renders
- THEN the corresponding state remains explicit, accessible, and does not become a fabricated empty result.
