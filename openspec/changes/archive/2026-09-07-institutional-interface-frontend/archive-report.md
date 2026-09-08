# Archive Report: Institutional Interface Frontend

## Final Status

- **Change:** `institutional-interface-frontend`
- **Artifact store:** OpenSpec
- **Archived on:** 2026-09-07
- **Final verdict:** PASS WITH WARNINGS
- **Tasks:** 14/14 complete; no unchecked implementation tasks
- **Requirements:** 9/9 complete
- **Scenarios:** 18/18 complete
- **Evidence revision:** `sha256:c20adc94d0bdcf7992964e4dca80d6a575572d63a5407f66f22abe7dfbaba88b`

## Final Verification State

The separate backend change `fix-pdf-parse-v2-compatibility` was implemented and archived. Frontend re-verification against that backend passed all 9 requirements and 18 scenarios. Jest passed 25 suites and 90 tests; typecheck passed; the production build generated 28 pages; and Playwright passed 4/4 scenarios at 390px, including no horizontal scrolling, reachable mobile navigation, keyboard order, dashboard behavior, permissions, revocation, and post-revocation denial.

Native verification settlement was completed. Remaining warnings are non-blocking: the pre-existing lint baseline remains non-zero, and global coverage is 72.06% with no configured threshold.

## Specs Synced

Both delta specs were full specs because no corresponding main spec existed:

- `document-traceability`: created `openspec/specs/document-traceability/spec.md`.
- `institutional-shell`: created `openspec/specs/institutional-shell/spec.md`.

No existing main-spec requirements were removed or overwritten.

## Archive Contents

The change was moved mechanically to:

`openspec/changes/archive/2026-09-07-institutional-interface-frontend/`

It contains the proposal, exploration, design, tasks, apply progress, verification report, both delta specs, and this additive archive report.

## Mechanical Readback Evidence

For each newly created main spec, `diff -r` produced no output:

```text
diff -r openspec/changes/institutional-interface-frontend/specs/document-traceability/spec.md openspec/specs/document-traceability/.spec.md.WA41CS
```

```text
diff -r openspec/changes/institutional-interface-frontend/specs/institutional-shell/spec.md openspec/specs/institutional-shell/.spec.md.vdceHl
```

The pre-move snapshot and archived change tree were compared with `diff -r`; the command produced no output. The active change directory no longer exists.

## Risks and Warnings

- Lint baseline warnings remain pre-existing and non-blocking.
- Coverage remains informational at 72.06%; no threshold is configured.
- No functional changes or commits were made during archival.
