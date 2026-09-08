# Delta for settings-administration

## MODIFIED Requirements

### Requirement: Centralized Administrative Settings

The system MUST expose Users, Categories, Document Types, Templates, Roles, and workflow administration as Settings destinations. It MUST show each destination only to a user authorized for that resource and MUST preserve authorization differences between resources. A workflow-template manager MUST be admitted to Settings even without other Settings permissions.
(Previously: Settings exposed Users, Categories, Document Types, Templates, and Roles but did not own workflow administration or define workflow-only access.)

#### Scenario: Authorized Settings destination

- GIVEN a user has the permission for Categories
- WHEN the user opens Settings
- THEN the Categories destination SHALL be available
- AND its management functions SHALL be usable there

#### Scenario: Workflow-only administrator

- GIVEN a user has `workflow.templates.manage` and no other Settings permission
- WHEN the user opens Settings
- THEN workflow administration SHALL be available
- AND unrelated administrative destinations SHALL remain hidden

#### Scenario: Unauthorized resource is hidden

- GIVEN a user lacks the permission for Templates, workflow administration, or `roles.manage`
- WHEN the user opens Settings
- THEN the corresponding destination or management controls MUST NOT be displayed

### Requirement: Compatible Direct Resource Entry Points

The system MUST retain the existing direct URLs for Users, Categories, Document Types, Templates, and workflow administration as compatible entry points to their Settings destinations. A compatibility entry point MUST NOT bypass authorization.
(Previously: Compatible direct URLs were defined for four resource destinations and excluded workflow administration.)

#### Scenario: Legacy bookmark

- GIVEN an authorized administrator opens a saved direct resource URL
- WHEN the route resolves
- THEN the user SHALL reach the corresponding Settings management destination

#### Scenario: Workflow administration bookmark

- GIVEN an authorized workflow-template manager opens `/dashboard/workflows`
- WHEN the route resolves
- THEN the user SHALL reach workflow administration without losing its permission boundary

#### Scenario: Unauthorized bookmark

- GIVEN an unauthorized authenticated user opens a direct resource URL
- WHEN the route resolves
- THEN the requested management data and mutation controls MUST NOT be available
