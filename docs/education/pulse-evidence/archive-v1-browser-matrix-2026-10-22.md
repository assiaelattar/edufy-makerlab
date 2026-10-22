# Archive v1 synthetic browser observations — 2026-10-22

Fixture: `node scripts/preview-archive-v1.mjs`, `http://127.0.0.1:5258/`. The fixture aliases App/Auth/Confirm/Notifications/Firestore to local in-memory data. `example.invalid` links are synthetic. No Firebase request or school write was made.

| Browser check | Observed result |
| --- | --- |
| Populated default | 2 Active, 1 Archived, 3 Categories, 2 Current view; the other-tenant fixture record was absent. |
| Exact 1440px light | Archive header, four measures, filters and three-column cards rendered; document `scrollWidth <= innerWidth`. |
| Exact 1440px dark | DOM viewport width and document scroll width both 1440px; theme and selected states persisted. Browser screenshot output was clipped by the in-app browser's narrower visible window, so this is a DOM/layout check rather than full visual acceptance. A full dark view was visually inspected at the browser's 1600px display width. |
| Exact 390px light and dark | Document width and scroll width both 390px after the action-label repair. Two-column measures, one-column cards and horizontal category rail retained the work order. |
| 390×600 dialog | Body `scrollHeight=552`, `clientHeight=532`; header, fields and actions remained reachable. |
| Reduced motion | With `prefers-reduced-motion: reduce`, the Archive category transition duration resolved to `0s`. |
| Search and filters | “index” gave one card; impossible search gave the no-match state; Documents gave one card; title Z–A ordered Program materials first; reset restored Active. |
| Details | View details exposed full URL, category, dates, author, status, description and actions. Hiding/filtered-away details returned to the card grid. |
| Add validation | Empty submit gave Title `aria-invalid=true`, inline alert and focus on `archive-title`; duplicate URL gave URL `aria-invalid=true`, inline alert and focus on `archive-url`. |
| Add save | Pending showed disabled Cancel and Saving; simulated failure retained title, URL and description; retry success added a third active card, closed dialog and showed success feedback. |
| Edit save | Existing values loaded; renamed the fixture record and saw its new card title after simulated transaction success. |
| Dialog keyboard | Escape closed and returned focus to Add; Shift+Tab from Close wrapped to Submit; Tab from Submit wrapped to Close. |
| Archive | Cancel retained card; pending fixture gate appeared; failure retained card and showed alert; success moved it to Archived and incremented Archived count. |
| Restore | Restoring the fixture card removed it from the Archived list and returned it to Active. |
| Delete | Cancel retained card; failure retained card and showed alert; success reduced active card count from three to two. |
| Copy/Open | Copy showed success feedback. Invalid `javascript:` URL showed an error and did not open a tab. External success and popup denial were not exercised. |
| Empty/loading/no-org/restricted/viewer | Each scenario rendered its distinct state. Viewer action menu contained Copy only. No-org displayed no Add action. |

The in-app browser's normal viewport has a minimum width larger than 390px. Exact CSS widths were checked with temporary CDP device metrics and returned to ordinary browser state after inspection. Synthetic screenshots were inspected during the browser session; no production-data screenshot is included.
