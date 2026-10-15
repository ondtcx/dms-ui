# Research: review-frontend-implementations

schema: gentle-ai.sdd-research/v1
revision: 21d01521e4f1863b95bdecfd405c2a56fc1eab5c
status: done
request_id: review-frontend-implementations-research-21d01521
accessed_at: 2026-09-14

## Questions

1. What do authoritative Next.js App Router sources document about redirecting from protected UI entry points and preserving route-level boundaries?
2. What do authoritative security sources recommend about defense-in-depth authorization checks for sensitive UI/data operations?

## Admission

- Capability: `gentle-ai.sdd-research-capability/v1`
- Granted classes: `documentation`, `open-web`
- Unsupported classes: none
- Persistence was not claimed by the research executor; this artifact is the orchestrator-validated OpenSpec persistence.

## Sources

| ID | Class | Title | Publisher | URL | Accessed | Excerpt |
| --- | --- | --- | --- | --- | --- | --- |
| `next-redirect` | documentation | `redirect` API reference | Vercel / Next.js | https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/04-functions/redirect.mdx | 2026-09-14 | Invoking `redirect` in a Server Component terminates rendering of the current route segment. |
| `next-authentication` | documentation | Authentication in Next.js | Vercel / Next.js | https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/authentication.mdx | 2026-09-14 | Proxy can centralize redirect logic, while critical security checks must occur as close to the data source as possible. |
| `next-data-security` | documentation | Data security in Next.js | Vercel / Next.js | https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/data-security.mdx | 2026-09-14 | A page-level authentication check does not extend to Server Actions; re-verify inside the action. |
| `next-layout-boundaries` | documentation | Authentication in Next.js — layout boundaries | Vercel / Next.js | https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/authentication.mdx | 2026-09-14 | Layouts do not re-render on navigation, and hiding or swapping route segments does not stop them from running. |
| `owasp-authorization` | documentation | Authorization Cheat Sheet | OWASP | https://github.com/OWASP/CheatSheetSeries/blob/master/cheatsheets/Authorization_Cheat_Sheet.md | 2026-09-14 | Authorization must be server-side, deny-by-default, and validated on every request; client checks are not security enforcement. |

## Validated Claims

- `claim-1` — Protected App Router UI entry points may redirect unauthorized users during Server Component rendering; the redirect terminates rendering of that route segment. Sources: `next-redirect`.
- `claim-2` — Centralized Proxy checks are suitable for early or optimistic route filtering and redirects, but do not replace checks near the data source. Source: `next-authentication`.
- `claim-3` — A parent layout is not a sufficient authorization boundary for child routes or route segments. Source: `next-layout-boundaries`.
- `claim-4` — Sensitive operations must independently re-verify authorization even when the containing page is protected. Sources: `next-data-security`, `owasp-authorization`.
- `claim-5` — Client-side visibility checks improve user experience but cannot provide security enforcement. Source: `owasp-authorization`.

## Gaps, Contradictions, and Freshness

- No repository inspection was performed by the research executor; repository-specific `ProtectedRoute` behavior remains grounded in the exploration artifact.
- The sources do not prescribe the product-specific unauthorized destination `/errors/unauthorized`.
- No material contradictions were found. Next.js distinguishes optimistic Proxy filtering from authoritative checks near the data source; these are complementary layers.
- Next.js sources use the current canary documentation path; implementation should remain compatible with the repository's pinned Next.js version.

## Confirmed Product Choice

- Unauthorized direct access to `/dashboard/workflows` must redirect to `/errors/unauthorized` through the existing shared `ProtectedRoute` behavior.
