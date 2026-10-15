# Tasks: Harden Workflow Compatibility Route Authorization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80–140 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Guard the compatibility route and preserve component defense in depth | PR 1 | `npm test -- --runInBand app/dashboard/workflows/__tests__/page.test.tsx components/workflows/__tests__/WorkflowAdministration.test.tsx` | N/A — Jest auth/router harness deterministically exercises this client route boundary | Revert only the page wrapper and the two focused test updates |

## Phase 1: RED Tests / Authorization Contract

- [x] 1.1 Add failing authorized and unauthorized direct-route scenarios in `app/dashboard/workflows/__tests__/page.test.tsx`: authorized users render administration; unauthorized users push `/errors/unauthorized`, do not mount the child, make no workflow service calls, and expose no controls.
- [x] 1.2 Add a failing missing-permission regression in `components/workflows/__tests__/WorkflowAdministration.test.tsx`: retain denial copy, assert no definitions query, and assert mutation controls are absent.

## Phase 2: GREEN Route Protection

- [x] 2.1 Modify `app/dashboard/workflows/page.tsx` to wrap `WorkflowAdministration` with `ProtectedRoute requiredPermission="workflow.templates.manage"`, reusing the shared loading, redirect, and child-suppression behavior.
- [x] 2.2 Keep `components/workflows/WorkflowAdministration.tsx` unchanged and fail-closed: its permission check and query `enabled` gates remain defense in depth for reuse outside the route.

## Phase 3: REFACTOR / Verification

- [x] 3.1 Refine auth/router mocks and assertions in `app/dashboard/workflows/__tests__/page.test.tsx` and `components/workflows/__tests__/WorkflowAdministration.test.tsx` for readable, deterministic coverage without weakening the scenarios.
- [x] 3.2 Run the focused Jest command, then `npx tsc --noEmit` and `npm run lint`; verify unauthenticated behavior still follows the existing `/auth/login` contract through `ProtectedRoute`.

## Phase 4: Documentation / Delivery

- [x] 4.1 Confirm the implementation matches both delta specs under `openspec/changes/review-frontend-implementations/specs/`; record the single-PR work unit and rollback boundary in review evidence.
