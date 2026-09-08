# Delta for document-workflow-experience

## MODIFIED Requirements

### Requirement: Permission-Aware Workflow Administration Navigation

The system MUST show an entry to workflow administration as a Settings destination to users authorized to manage workflow templates. The system MUST NOT show that entry to unauthorized users or as a duplicate direct sidebar item.
(Previously: Authorized users received an administration entry in dashboard navigation.)

#### Scenario: Authorized user opens administration

- GIVEN a user has workflow-template management permission
- WHEN the user views Settings
- THEN the user sees a workflow-administration destination
- AND selecting it opens workflow administration

#### Scenario: Unauthorized user has no entry

- GIVEN a user lacks workflow-template management permission
- WHEN the user views Settings and dashboard navigation
- THEN no workflow-administration entry is displayed

### Requirement: Workflow Administration State Clarity

The system MUST provide administration guidance and MUST render loading, error, empty, definition, version, ordered-stage, lifecycle, and usage/history information clearly. For one query result, loading, error, and empty states MUST be mutually exclusive.
(Previously: Administration rendered loading, error, empty, definition, version, and stage information but did not define lifecycle or usage/history presentation.)

#### Scenario: Definitions are available

- GIVEN the definition query succeeds with definitions
- WHEN an authorized user opens workflow administration
- THEN the system displays each definition, version state, ordered stages, and available usage/history data
- AND the loading, error, and empty states are not displayed

#### Scenario: Definition query fails or has no results

- GIVEN an authorized user opens workflow administration
- WHEN the definition query fails or succeeds with no definitions
- THEN the system displays respectively an actionable error or empty-state explanation
- AND it does not display a loading state or definition details for that query

#### Scenario: One definition detail is requested

- GIVEN an authorized user selects a workflow definition
- WHEN its detail query succeeds
- THEN the system shows metadata, versions, ordered stages, lifecycle state, and usage/history counts

## ADDED Requirements

### Requirement: Compatible Workflow Administration Route

The system MUST retain `/dashboard/workflows` as a guarded compatibility entry point. It MUST preserve the workflow-template permission boundary and MUST NOT expose administration data or mutation controls to unauthorized users.

#### Scenario: Authorized compatibility access

- GIVEN an authenticated user has workflow-template management permission
- WHEN the user opens `/dashboard/workflows` directly
- THEN the workflow administration surface is available

#### Scenario: Unauthorized compatibility access

- GIVEN an authenticated user lacks workflow-template management permission
- WHEN the user opens `/dashboard/workflows`
- THEN administration data and mutation controls are unavailable
