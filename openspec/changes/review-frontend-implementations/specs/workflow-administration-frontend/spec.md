# Delta for workflow-administration-frontend

## MODIFIED Requirements

### Requirement: Permission-scoped administration surface

The frontend MUST expose administration only to users with `workflow.templates.manage`. Unauthorized users MUST be redirected to `/errors/unauthorized` when opening the direct administration route and MUST NOT see workflow details or mutation controls. The component-level permission check MUST remain fail-closed for reuse outside that route.
(Previously: Unauthorized users received no workflow data or mutation controls through the administration route, without specifying the shared unauthorized redirect.)

#### Scenario: Authorized administrator

- GIVEN a user has `workflow.templates.manage`
- WHEN the user opens workflow administration
- THEN the administration surface and permitted controls are available

#### Scenario: Unauthorized user opens the direct route

- GIVEN a user lacks `workflow.templates.manage`
- WHEN the user opens `/dashboard/workflows`
- THEN the shared `ProtectedRoute` behavior redirects to `/errors/unauthorized`
- AND workflow administration is not mounted or exposed
