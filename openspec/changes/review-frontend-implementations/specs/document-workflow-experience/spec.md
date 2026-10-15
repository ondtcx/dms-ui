# Delta for document-workflow-experience

## MODIFIED Requirements

### Requirement: Compatible Workflow Administration Route

The system MUST retain `/dashboard/workflows` as a guarded compatibility entry point using the shared route-protection behavior. Authorized users with workflow-template management permission MUST be able to access workflow administration. Unauthorized users MUST be redirected to `/errors/unauthorized` and MUST NOT expose administration data or mutation controls.
(Previously: The route was required to remain guarded and to withhold administration data and mutation controls from unauthorized users, without specifying the redirect destination.)

#### Scenario: Authorized compatibility access

- GIVEN an authenticated user has workflow-template management permission
- WHEN the user opens `/dashboard/workflows` directly
- THEN the workflow administration surface is available

#### Scenario: Unauthorized compatibility access

- GIVEN an authenticated user lacks workflow-template management permission
- WHEN the user opens `/dashboard/workflows`
- THEN the shared route-protection behavior redirects to `/errors/unauthorized`
- AND administration data and mutation controls are unavailable
