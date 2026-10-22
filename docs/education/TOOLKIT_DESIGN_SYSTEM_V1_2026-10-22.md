# Toolkit · Design System v1 local handoff

**Status:** implementation candidate, pending real-account and physical-phone acceptance. This focused change covers Toolkit only. It has not been pushed or deployed.

## Scope and implementation

The Toolkit workspace has two routes: Digital resources and Hardware inventory. The view now opts into the shared Education System, uses canonical tabs, toolbar, register, fields, buttons, status pills, notices, action menus, detail panel and dialog styling, and keeps module CSS limited to layout and shared tokens. The existing organization boundary, role checks, Firebase collections, transactions, validations, checkout and return rules remain the operational source of truth.

Resource cards expose a safe external link, URL copy, details and permitted edit/delete actions. Inventory rows expose condition and custody, details and permitted edit/delete/checkout/return actions. The detail panel returns keyboard focus to its opener; search, filters, tab and page scroll remain in place when it closes. Forms keep entered values after a failed save, block repeat submission while pending, and show inline feedback. The existing shared confirmation is used for return and deletion. A scoped 390px layout prevents page-level horizontal overflow while keeping tabs and filters horizontally scrollable.

The previous shared visual bridge is superseded on this page by `data-edu-system="1"` even if a legacy-shell query parameter is present. This is an intentional Toolkit opt-in; the coordinator should review it with the final integration diff.

## Evidence and acceptance

The [Toolkit QA matrix](toolkit-evidence/QA_MATRIX_2026-10-22.md) records each visible route, state and action, the synthetic checks run, and unverified acceptance. Browser work used the real `ToolkitView` mounted with an in-memory App/Auth/Firebase adapter. The preview does not connect to a school or write production data.

Preview: `node scripts/preview-toolkit-v1.mjs`, then `http://127.0.0.1:5264/`. Query options: `theme=dark`, `scenario=empty|loading|error|restricted|no-org`, `save=error|pending`, and `clipboard=error`. Fixtures contain invented records and events. No production records or account screenshots were saved.

At 1440 CSS pixels and at 390 CSS pixels, light and dark views of populated resources and inventory were inspected. At 390 pixels the document width remained 390 pixels, including long records and dialogs. The Add inventory dialog filled the 390×844 viewport without clipping; at 390×600 its content scrolled behind a usable footer. Shared confirmation, visible focus, dialog Shift+Tab containment, Escape and opener focus return were inspected. Emulated reduced motion reported zero transition and animation durations for Toolkit controls.

Synthetic actions covered resource create/edit/delete, inventory create/edit/delete, checkout and return, copy URL, search, status filter, sorting, detail selection and close. Confirmation cancel preserved records; successful in-memory transactions changed the visible register. Failed saves preserved drafts and showed feedback; pending saves disabled dialog controls. Duplicate serial validation, invalid external URL handling and restricted role controls were inspected. Empty, loading, workspace error/retry and no-organization states were inspected. The empty-state register provides a permitted creation route.

## Verification and open gates

- Production build and Education System checker pass after this change. `git diff --check` and the preview script syntax check pass. The repository-wide TypeScript command still reports pre-existing errors outside Toolkit; a focused diagnostic filter found no Toolkit or Toolkit CSS error.
- The signed-in local application at `http://127.0.0.1:5202/` was unavailable during this pass, so no actual-account read-only check is claimed. Actual admin and restricted-role acceptance, and a physical-phone check, remain open.
- Synthetic error mode injects `workspaceError` from AppContext. The real AppContext currently has no error callback on the `assets` and `tool_links` Firestore listeners. A dataset-specific listener failure cannot be shown through this page alone; shared data-layer handling is a separate follow-up.
- External provider destinations were not followed. The fixture tested link presence, safe URL validation, copy feedback and the absence of an Open action for a legacy invalid URL.
- Production writes, role changes, database rules, deployment and the MCP repository are outside this pass.

**Integration gate:** review the focused diff and QA matrix; then complete actual-account, permission-role and physical-device acceptance before calling Toolkit Design System v1 complete.
