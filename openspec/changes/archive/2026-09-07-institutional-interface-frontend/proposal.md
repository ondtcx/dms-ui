# Proposal: Institutional Interface Frontend

## Intent

Strengthen the frontend’s institutional character and traceability without changing backend contracts or inbox behavior.

## Scope

### In Scope
- Add curated semantic light/dark tokens, radius, and spacing compatible with runtime appearance settings.
- Refine the sidebar/header using existing institution name/logo and academic-year context; retain navigation, permissions, responsiveness, and account actions.
- Polish the dashboard while preserving hierarchy, loading/empty/error/denied states, accessibility, keyboard order, and tests.
- Present numbering, version metadata, versions, and workflow actors/timestamps, distinguishing version and workflow events.
- Add a protected frontend-only audit view showing only authorized records; otherwise show explicit unavailable, blocked, or denied states. Do not assume an endpoint.
- Use formal Spanish on modified UI surfaces.

### Out of Scope
- New institutional fields, backend APIs, service endpoints, or fabricated records.
- Changes to inbox semantics, authorization rules, workflow behavior, persistence, or unrelated routes.

## Capabilities

### New Capabilities
- `institutional-shell`: Semantic theming and shell presentation using existing settings data.
- `document-traceability`: Document identity, versions, workflow actors/timestamps, and protected audit availability states.

### Modified Capabilities
- None. Existing dashboard and authorization behavior remains the baseline.

## Approach

Implement two auto-chain slices: shell/tokens/copy, then dashboard/traceability. Reuse existing settings, navigation, summary, document/version, and workflow contracts. Missing access data must remain distinct from an empty result.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `app/globals.css`, `app/dashboard/layout.tsx` | Modified | Tokens and header hierarchy. |
| `components/app-sidebar.tsx`, `lib/sidebar-nav.ts`, `components/nav-user.tsx`, `components/navigation/DashboardBreadcrumb.tsx` | Modified | Identity, labels, hierarchy. |
| `lib/contexts/SettingsContext.tsx`, `components/settings/*` | Modified | Existing branding and appearance sources. |
| `app/dashboard/home/page.tsx`, `components/documents/DashboardDocumentRow.tsx` | Modified | Dashboard presentation and metadata. |
| `app/dashboard/documents/[id]/page.tsx`, `components/documents/DocumentVersionHistory.tsx`, `components/workflows/DocumentWorkflowPanel.tsx`, `app/dashboard/documents/[id]/audit/page.tsx` | New/Modified | Traceability and safe audit states. |
| Existing dashboard, sidebar, settings, service, and E2E tests | Modified | Regression and new-state coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shell changes regress contrast, responsiveness, or permissions. | Med | Verify both themes and regression tests. |
| Optional access data is mistaken for an empty audit. | High | Fail closed; add no endpoint. |

## Rollback Plan

Revert two slices and tests. No migration or backend action is required.

## Dependencies

- Existing `/settings`, dashboard summary, document detail/version, and workflow contracts.
- An authorized access-record response is required before populated audit records can appear.

## Success Criteria

- [ ] Shell uses curated tokens and existing identity across themes and layouts.
- [ ] Dashboard, authorization, and state regressions remain green.
- [ ] Number/version/workflow traceability is discoverable.
- [ ] Audit never fabricates records and clearly communicates unavailable, blocked, or denied access.
- [ ] Changed UI surfaces use formal Spanish copy.
