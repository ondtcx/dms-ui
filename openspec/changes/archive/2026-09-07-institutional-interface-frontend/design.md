# Design: Institutional Interface Frontend

## Technical Approach

Implement two reviewable slices: (1) semantic theme tokens and the institutional shell, then (2) dashboard and document traceability. Reuse existing `/settings`, dashboard summary, document detail/version, workflow, auth, and permission contracts. Use only the existing institution name, logo, and available academic-year context. Add no backend API, field, or service endpoint.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Theme source | Curated CSS semantic light/dark tokens with existing runtime appearance overrides | New appearance fields; hard-coded component colors | Preserves `SettingsContext` and avoids contract expansion while improving consistency. |
| Shell structure | Refine `DashboardLayout`, `AppSidebar`, breadcrumb, and account presentation in place | New shell or navigation rewrite | Keeps the stable header, existing logout handler, mobile off-canvas behavior, collapsed-desktop-only tooltips, and permission semantics. |
| Audit boundary | Protected frontend route with explicit unavailable/blocked/denied states; render records only if an existing authorized response supplies them | Add/assume an audit endpoint; infer records from document data | Fails closed and preserves the confirmed no-new-backend boundary. |
| Traceability | Present number, current version, version history, and a separate workflow event history | Merge version and workflow timelines | Existing contracts expose different concepts; separation prevents misleading provenance. |

## Data Flow

```text
SettingsContext (/settings) ──→ shell tokens/header/sidebar
                                   └→ existing identity/year presentation
Dashboard summary ──→ home page ──→ document rows (number/version fallbacks)
Document detail ──→ version service + workflow data ──→ separate histories
Auth/permissions ──→ audit route ──→ authorized records OR unavailable/blocked/denied
```

`isNavItemActive` retains slash-boundary matching. Settings categories remain filtered by current permission/role rules. Missing optional data uses formal-Spanish unavailable copy, never fabricated values; missing audit access is not an empty table.

## File Changes

| File | Action | Description |
|---|---|---|
| `app/globals.css` | Modify | Add curated semantic color, radius, and spacing tokens for both themes. |
| `app/dashboard/layout.tsx` | Modify | Preserve and refine the minimal sticky header: sidebar trigger, breadcrumb, and search. |
| `components/app-sidebar.tsx`, `lib/sidebar-nav.ts` | Modify | Refine identity/year presentation while preserving slash boundaries, permission filtering, responsive behavior, and desktop collapse tooltips. |
| `components/nav-user.tsx`, `components/navigation/DashboardBreadcrumb.tsx` | Modify | Formal Spanish labels and accessible hierarchy; retain logout behavior. |
| `lib/contexts/SettingsContext.tsx`, `components/settings/InstitutionForm.tsx`, `components/settings/AppearanceForm.tsx` | Modify | Consume existing branding/appearance values only. |
| `app/dashboard/home/page.tsx`, `components/documents/DashboardDocumentRow.tsx` | Modify | Improve presentation and expose number/current-version fallbacks without changing inbox hierarchy or states. |
| `app/dashboard/documents/[id]/page.tsx`, `components/documents/DocumentVersionHistory.tsx`, `components/workflows/DocumentWorkflowPanel.tsx` | Modify | Make identity and distinct version/workflow traceability discoverable. |
| `app/dashboard/documents/[id]/audit/page.tsx` | Create/modify | Protected audit presentation with safe explicit outcomes; no new data client. |
| Existing Jest/Playwright tests under `app/dashboard`, `components`, `lib`, and `e2e` | Modify | Add RED-first regression and state coverage. |

## Interfaces / Contracts

No new API contract. Presentation mappings consume existing `Document`, optional `Document.accesses`, version, workflow, `User`, and settings types. Audit rendering requires an authorized existing response containing records; otherwise it accepts an explicit state such as `unavailable`, `blocked`, or `denied` and renders no record details.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit | Tokens/fallbacks, slash-boundary active routes, Settings filtering, tooltip and logout behavior, number/version and workflow separation | Jest + React Testing Library; write RED assertions before implementation. |
| Integration | Dashboard loading/empty/error/denied semantics, keyboard order, responsive shell, audit authorization and unavailable/blocked/denied states | Existing page/component tests with mocked existing services only. |
| E2E | Desktop collapse, mobile off-canvas navigation, accessible header, traceability entry points | Playwright scenarios against existing app contracts. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior | Planned RED test |
|---|---|---|---|
| UI routing and audit authorization | Applicable | Existing auth/permission boundary decides; deny or unavailable fails closed with no records. | Direct unauthorized audit navigation shows denied state and no details. |
| Documentation-like paths | N/A — no file classification or execution | No behavior change. | None. |
| Git repository selection | N/A — no Git commands | No behavior change. | None. |
| Commit state | N/A — no commit automation | No behavior change. | None. |
| Push state | N/A — no push automation | No behavior change. | None. |
| PR commands | N/A — no PR automation | No behavior change. | None. |

## Migration / Rollout

No migration required. Deliver shell and traceability as two reviewable slices; rollback is a revert of those slices and tests. Verify lint, typecheck, Jest, build, and Playwright where servers are available.

## Open Questions

- [ ] Which existing authorized response, if any, will supply populated access records in a future change?
- [ ] Should the current “Auditar Accesos” permissions explanation remain separate from the new audit route label?
