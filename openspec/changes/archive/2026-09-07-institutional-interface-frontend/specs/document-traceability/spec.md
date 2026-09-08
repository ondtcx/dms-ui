# Document Traceability Specification

## Purpose

Make document identity, version history, workflow history, and audit availability understandable without expanding backend contracts.

## Requirements

### Requirement: Document Identity and Version Traceability

Document views MUST clearly present the document number when supplied, current version when supplied, version history, and explicit fallbacks when optional metadata is absent.

#### Scenario: Complete traceability data

- GIVEN an authorized document includes number and version data
- WHEN its detail or dashboard representation renders
- THEN number, current version, and version history are discoverable and distinguishable.

#### Scenario: Missing number or version

- GIVEN optional number or current-version data is absent
- WHEN the document renders
- THEN the UI shows an explicit formal-Spanish unavailable fallback and MUST NOT invent a value.

### Requirement: Distinct Workflow Event Traceability

Document views MUST distinguish version events from workflow assignments and transitions, and MUST show available actors and timestamps without implying unsupported events.

#### Scenario: Workflow history available

- GIVEN workflow assignments or transitions include actors and timestamps
- WHEN the user opens document traceability
- THEN workflow events appear in a labeled history separate from version events.

#### Scenario: Partial workflow metadata

- GIVEN an event lacks an actor, timestamp, or history collection
- WHEN the history renders
- THEN the missing value is explicitly identified and no actor, timestamp, or event is fabricated.

### Requirement: Protected Audit Availability

The audit view MUST be protected by the existing authorization boundary and MUST show records only when an existing authorized response actually supplies them; it MUST NOT add an endpoint, field, or inferred record source.

#### Scenario: Authorized records supplied

- GIVEN the user is authorized and an existing response contains access records
- WHEN the audit view opens
- THEN only those records are displayed with clear actor, action, and time labels when supplied.

#### Scenario: Authorized data unavailable

- GIVEN the user is authorized but no access-record response or endpoint exists
- WHEN the audit view opens
- THEN it shows an explicit unavailable state, not an empty audit table.

### Requirement: Explicit Protected-State Outcomes

The audit view MUST distinguish unavailable, blocked, and denied outcomes and MUST fail closed when access status or records cannot be established.

#### Scenario: Access is blocked pending a contract

- GIVEN access-record retrieval is blocked because no confirmed contract exists
- WHEN the user requests the audit view
- THEN a formal-Spanish blocked message explains that records cannot currently be retrieved and no records are shown.

#### Scenario: User is denied

- GIVEN the existing authorization boundary denies the user
- WHEN the user requests the audit view directly or through navigation
- THEN a formal-Spanish denied state is shown, no record details are exposed, and keyboard and screen-reader users receive the same outcome.
