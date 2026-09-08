# workflow-administration-frontend Specification

## Purpose

Provide a permission-scoped, version-safe workflow administration UI in Settings, with readable lifecycle/history data and isolated Playwright journeys. This spec defines frontend behavior only.

## Requirements

### Requirement: Permission-scoped administration surface

The frontend MUST expose administration only to users with `workflow.templates.manage`. Unauthorized users MUST NOT see workflow details or mutation controls, including through a direct route.

#### Scenario: Authorized administrator

- GIVEN a user has `workflow.templates.manage`
- WHEN the user opens workflow administration
- THEN the administration surface and permitted controls are available

#### Scenario: Unauthorized user

- GIVEN a user lacks `workflow.templates.manage`
- WHEN the user opens the administration route
- THEN workflow data and mutation controls are unavailable

### Requirement: Detailed version-safe editing

The UI MUST present definition metadata, versions, ordered stages, and editable fields. Published or historical versions MUST be read-only; execution-behavior edits MUST be represented as a new version, never as an in-place historical edit. Lifecycle actions MUST identify the selected version.

#### Scenario: Inspect a definition

- GIVEN an authorized administrator selects a definition
- WHEN its detail loads
- THEN metadata, versions, ordered stages, and version states are visible

#### Scenario: Edit execution behavior

- GIVEN a published version has execution history
- WHEN the administrator changes execution behavior
- THEN the UI starts a new-version flow and keeps the historical version read-only

### Requirement: Validation and lifecycle controls

The UI MUST support validation before activation, show actionable validation feedback, prevent activation of an invalid version, and present activate/deactivate actions for the explicitly selected version with their pending and result states.

#### Scenario: Invalid version

- GIVEN the selected version fails validation
- WHEN validation completes
- THEN the errors are shown and activation is unavailable

#### Scenario: Targeted lifecycle action

- GIVEN an administrator selects one version
- WHEN the administrator activates or deactivates it
- THEN only that version's displayed lifecycle state changes

### Requirement: Lifecycle, usage, and history presentation

The UI MUST show lifecycle state, usage or execution counts, and read-only history for the definition and its versions. Missing counts or history MUST have an explicit empty explanation rather than fabricated values.

#### Scenario: Usage is available

- GIVEN detail returns usage and history data
- WHEN the detail view renders
- THEN counts and historical records are visible without edit controls

### Requirement: Exclusive asynchronous states

For each list, detail, validation, and usage/history request, the UI MUST render exactly one loading, error, empty, or populated state. It MUST NOT combine conflicting states or show stale detail while a request is failing; pending mutations MUST prevent duplicate submission.

#### Scenario: Query state changes

- GIVEN a workflow query is pending, fails, empty, or populated
- WHEN the corresponding state renders
- THEN only the matching state is visible

### Requirement: Isolated Playwright fixture lifecycle

Every Playwright journey MUST clean up or isolate every created document, definition, version, and execution. Teardown failures MUST fail the test and identify the affected records.

#### Scenario: Successful teardown

- GIVEN a journey creates workflow-related records
- WHEN the journey finishes
- THEN records are removed or isolated from shared data

#### Scenario: Teardown failure

- GIVEN cleanup cannot remove or isolate a created record
- WHEN teardown runs
- THEN the test fails visibly with the record identity and failure reason
