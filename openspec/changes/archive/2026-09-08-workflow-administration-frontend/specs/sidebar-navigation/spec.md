# Delta for sidebar-navigation

## MODIFIED Requirements

### Requirement: Parent route highlight

An item that owns sub-items SHALL be active when the current path starts with `<item.url>/` at a slash boundary. Bare prefixes, such as `/dashboard`, MUST NOT mark every dashboard route active. Settings MUST own the centralized Users, Categories, Document Types, Templates, Roles, and workflow administration destinations; their compatible direct URLs SHALL also activate the Settings parent. The sidebar MUST display only destinations authorized for the current user and MUST NOT display a separate workflow-administration item.
(Previously: Settings owned Users, Categories, Document Types, Templates, and Roles, while workflow administration was a direct administration-menu item.)

#### Scenario: Parent highlighted on sub-route

- GIVEN a user is on `/dashboard/academic-years`
- WHEN the sidebar renders
- THEN the "Configuracion" parent SHALL be highlighted active

#### Scenario: Centralized destination active

- GIVEN an authorized user is on workflow administration or its compatible direct URL
- WHEN the sidebar renders
- THEN Settings SHALL be highlighted active

#### Scenario: Unauthorized destination omitted

- GIVEN a user lacks a centralized resource permission
- WHEN the sidebar renders Settings navigation
- THEN that resource destination MUST NOT be shown

#### Scenario: Direct workflow item removed

- GIVEN a user has `workflow.templates.manage`
- WHEN the sidebar renders
- THEN workflow administration SHALL be reachable through Settings
- AND no duplicate direct workflow item SHALL be displayed
