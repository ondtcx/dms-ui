## Exploration: institutional-interface-frontend

### Current State
The frontend already has the core institutional and document-workflow foundations. `SettingsContext` loads the existing `/settings` contract and applies configured appearance colors at runtime; `AppSidebar` reads `institution.name` and `institution.logoPath`, while the settings forms maintain institution, school-year, and appearance values. `DashboardLayout` provides a stable 16px sticky header containing the sidebar trigger, breadcrumb, and search. The sidebar already supports desktop icon collapse, mobile sheet behavior, directory navigation, and recursive role/permission filtering.

`/dashboard/home` consumes `documentsService.getDashboardSummary()` and preserves the pending-officialization and recent-document inbox hierarchy, including loading, empty, error, permission-denied, responsive, and keyboard-order behavior. Rows currently expose filename, number fallback, owner, category, workflow status, and updated time, but do not expose current version explicitly. Document detail exposes the document number when present, opens version history, and renders workflow assignments and transitions; workflow types also contain events, but the current panel does not present a complete event timeline.

The frontend defines `DocumentAccess` and optional `Document.accesses`, but `documentsService` has no access/audit method or dedicated endpoint. `getOne` is the only general detail request and the current document detail action labeled “Auditar Accesos” opens the permissions-explanation dialog rather than an access-record view. Therefore a dedicated audit route can only be contract-bounded: it must not invent records or add a backend API, and must render unavailable/blocked/denied states unless an existing authorized response actually supplies access records. No `openspec/config.yaml` exists at the repository root; the existing parent artifacts provide the applicable OpenSpec context.

### Affected Areas
- `dms-frontend/app/globals.css` — central semantic light/dark tokens, radius, and spacing for the curated institutional palette.
- `dms-frontend/app/dashboard/layout.tsx` — minimal sticky header hierarchy; preserve trigger, breadcrumb, search, height, and responsive behavior.
- `dms-frontend/components/app-sidebar.tsx`, `dms-frontend/lib/sidebar-nav.ts` — existing identity, active-route, permission-filtering, icon-rail, directory, and account-menu behavior to refine without changing authorization semantics.
- `dms-frontend/components/nav-user.tsx`, `dms-frontend/components/navigation/DashboardBreadcrumb.tsx` — account and route labels/copy on modified shell surfaces.
- `dms-frontend/lib/contexts/SettingsContext.tsx`, `dms-frontend/components/settings/InstitutionForm.tsx`, `dms-frontend/components/settings/AppearanceForm.tsx` — existing branding source and runtime appearance compatibility; no new fields or endpoints.
- `dms-frontend/app/dashboard/home/page.tsx`, `dms-frontend/components/documents/DashboardDocumentRow.tsx` — visual polish and discoverable number/version metadata while preserving `DashboardSummary` semantics and all tested states.
- `dms-frontend/app/dashboard/documents/[id]/page.tsx` — detail identity, links/actions, and authorized traceability entry point; current “Auditar Accesos” action is permissions explanation, not an audit-record view.
- `dms-frontend/components/documents/DocumentVersionHistory.tsx` — existing `/documents/:id/versions` contract and version presentation.
- `dms-frontend/components/workflows/DocumentWorkflowPanel.tsx`, `dms-frontend/lib/types/workflows.ts` — existing workflow history, assignments, transitions, actors, and timestamps; keep workflow events distinct from version events.
- `dms-frontend/app/dashboard/documents/[id]/audit/page.tsx` — new protected frontend-only audit presentation with safe unavailable/blocked/denied states; no confirmed data endpoint exists.
- `dms-frontend/lib/services/documents.service.ts`, `dms-frontend/lib/types/index.ts` — preserve typed document/version/access contracts and add only bounded presentation mapping; do not imply an audit API.
- `dms-frontend/app/dashboard/home/__tests__/page.test.tsx` — regression coverage for inbox hierarchy, permissions, states, accessibility, and keyboard order.
- `dms-frontend/components/__tests__/app-sidebar.test.tsx`, `dms-frontend/lib/__tests__/sidebar-nav.test.ts` — shell rendering, active-route boundaries, account menu, icon collapse, and permission filtering.
- `dms-frontend/app/dashboard/settings/__tests__/page.test.tsx`, `dms-frontend/lib/services/__tests__/documents.service.test.ts` — settings navigation and service-contract regression coverage.
- `dms-frontend/app/dashboard/documents/[id]/edit/__tests__/page.test.tsx`, `dms-frontend/components/documents/__tests__/DirectoryVisitRecorder.test.tsx`, and `dms-frontend/e2e/*.spec.ts` — adjacent document/navigation regression surfaces; no dedicated audit presentation test currently exists.

### Approaches
1. **Bounded shell-and-traceability frontend pass** — Refine semantic tokens, sidebar/header hierarchy, formal Spanish copy, dashboard presentation, and document identity using existing settings and document contracts; add version/workflow discoverability and a protected audit route that explicitly handles absent access data.
   - Pros: Matches the confirmed product decisions; stays frontend-only; preserves the tested inbox and authorization boundary; keeps the audit endpoint limitation explicit.
   - Cons: A usable populated audit table cannot be delivered until an existing authorized response supplies records; shared tokens can affect unrelated routes.
   - Effort: Medium

2. **Audit-contract expansion** — Add or assume a document access endpoint and build a populated audit view alongside the shell work.
   - Pros: Delivers the strongest audit experience in one pass.
   - Cons: Violates the confirmed no-new-API boundary, risks exposing private records, and creates a cross-repository dependency outside this frontend change.
   - Effort: High

### Recommendation
Use Approach 1 and split implementation into shell/tokens/copy and traceability slices under the 400-line review budget. Treat `/dashboard/home` and `DashboardSummary` as compatibility baselines, reuse only `institution.name`, `logoPath`, and existing academic-year/school-year context, and retain the current sidebar/header elements. Add tests for explicit current-version fallbacks, workflow/version distinction, audit authorization and unavailable states, while extending existing dashboard and sidebar tests rather than changing their semantics. Do not add a service method or backend endpoint for access records until a confirmed authorized contract exists.

### Risks
- Shared `globals.css` tokens and runtime appearance overrides can reduce contrast or alter unrelated shadcn surfaces; verify light and dark themes.
- Shell copy and navigation changes can regress active slash-boundary matching, permission-filtered Settings destinations, tooltip boundaries, mobile sheet behavior, logout, or keyboard order.
- Dashboard row changes can accidentally alter summary hierarchy, loading/error/empty/permission states, or accessible names.
- `Document.accesses` is optional type support only; `getOne` does not establish an audit-record response and no frontend audit endpoint is present. Never fabricate records or silently treat missing data as empty.
- Existing detail “Auditar Accesos” means permission explanation, so routing it to a record view requires an explicit, authorized presentation decision.
- No `openspec/config.yaml` is available to validate repository-specific OpenSpec rules or commands.

### Ready for Proposal
Yes — the frontend-only change is technically bounded and ready for proposal/design refinement. The orchestrator should carry forward the confirmed palette, stable shell, existing identity data, formal Spanish-on-modified-surfaces rule, preserved inbox semantics/tests, and no-external-research decision. It must explicitly record that populated access/audit records remain blocked by the missing confirmed endpoint/response contract; implementation may provide only safe authorized, unavailable, blocked, or denied states until that dependency is resolved.
