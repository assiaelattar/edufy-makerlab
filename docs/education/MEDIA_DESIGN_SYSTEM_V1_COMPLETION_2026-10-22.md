# Media · Design System v1 focused completion

Date: 2026-10-22. Branch: `agent/edufy-media-ds-20261021`, based on `8040fe6`. Scope is `views/MediaView.tsx`, its Media-only stylesheet, and an isolated synthetic preview. No production records, permissions, schema, Storage behavior, Firestore rules, API, push, or deployment changed.

## Decision and implementation

- The library, capture route, media cards, selection, forms, and three dialogs now use the canonical `data-edu-system="1"` tokens in light and dark. Media styling is scoped to `views/media/education-media-v1.css`; it adds layout and state treatment without a new palette or shared component stack.
- A card's image opens details for managers and read-only viewers; its separate 44 px control selects it for bulk actions. Privacy labels now say **Family** or **Staff** in addition to their icons. The phone workspace tabs and Add media action stack cleanly.
- Family and learner views derive albums and counts from their accessible linked, family-visible records. Organization counts and staff-only album names are no longer projected into those views. Unlinked and no-shared-photo cases have distinct empty copy.
- Capture date and photo counts use the local calendar day shown in the date input. Pending add, edit, bulk, delete, and capture actions guard duplicate submissions; the detail dialog stays open during deletion.
- Existing `media.manage`, tenant ownership checks, student association validation, remote URL validation, image optimization, Firestore payloads, share behavior, and confirmation handlers remain authoritative.

## Reachable page and state inventory

`Inspected` means the implementation path was traced. `Browser` means the real `MediaView` component was exercised against the isolated adapter in `scripts/fixtures/pulse-media-adapter.jsx`. All synthetic writes were queued until the QA controls explicitly resolved them; no Firebase connection was used.

| Surface / state | Status | Evidence or exact gap |
| --- | --- | --- |
| Staff library, populated cards and privacy labels | Inspected, migrated, Browser | Three fixture records with family, staff, and general associations; desktop/phone light/dark matrix below. |
| Search, album, privacy, association, sorting, clear | Inspected, migrated, Browser | `Alex` search reduced 3 records to 1; Clear restored 3. Filter/select controls and options inspected. Individual non-search filter combinations were not all clicked. |
| Asset detail, manager edit form | Inspected, migrated, Browser | Opened from image, changed caption, queued update, failed with draft retained, retried and saw edited card. |
| Read-only staff asset detail | Inspected, migrated, Browser | Synthetic `role=readonly`: fields disabled; Open image and Close available; no edit/delete controls. External source opening was not followed. |
| Single/bulk selection, album/privacy update | Inspected, migrated, Browser | Selected card exposed bulk toolbar; privacy batch pending disabled actions, failure retained selection, retry changed Staff only count. Album assignment control and payload path inspected; album batch was not separately submitted. |
| Delete confirmation, cancel, failure/retry/success | Inspected, migrated, Browser | Confirmation appeared; cancel retained record. Batch pending disabled Delete; failure retained item; successful synthetic deletion changed count 4 → 3. |
| Share source | Inspected, migrated, limited Browser | Family-visible share action and staff-only disabled state were visible. Native share/clipboard delivery was not invoked; no external recipient was involved. |
| Add media · file, preview, remove, metadata | Inspected, migrated, Browser | Uploaded a 1×1 synthetic PNG fixture; associated Alex, album and caption; pending disabled Save/Cancel; failure retained draft; retry saved and card/count appeared. Remove preview control inspected, not clicked. |
| Add media · HTTPS URL | Inspected, migrated, Browser validation | Source tabs and HTTPS field inspected; an `http:` URL produced the inline “Only HTTPS” error. Live remote host fetch/availability was not tested. |
| Add media validation and image preparation | Inspected, partial Browser | File chooser/optimization completed with synthetic PNG. Type/12 MB/850 KB failure branches were inspected in source but not triggered in browser. |
| Capture route, populated and no schedule | Inspected, migrated, Browser | Today's two-learner session displayed; Next day showed `0/0` and “No students scheduled.” Date input is named. |
| Capture dialog, preview/retake/save | Inspected, migrated, Browser | Synthetic PNG preview; pending disabled action; failure kept photo and retry; success reset chooser. Retake control inspected, not clicked. |
| Family/learner gallery permissions | Inspected, migrated, Browser | Synthetic parent saw only Alex's family-visible photo and only its album; no organization metrics or staff-only card. Student follows the same code path; student fixture role was not separately opened. |
| Unlinked family / empty staff library | Inspected, migrated, Browser | Unlinked parent showed “No linked gallery” and 0 records. Empty staff fixture showed “Start the media library” and Add first photo. |
| Loading / gallery listener failure | Inspected, gap | `AppContext` exposes only global required-data readiness/error. `gallery_items` is an optional listener without separate readiness or error callback, so Media cannot distinguish its pending/failure state from a truly empty library without a data-layer change. No synthetic loading/error UI is claimed. |
| Real staff/family roles and writes | Gap | The signed-in app at `127.0.0.1:5202` was unavailable in this worktree session; no authenticated school data was viewed or mutated. Firebase rule behavior, physical-phone and native camera checks remain acceptance gates. |

## Browser layout, keyboard and motion evidence

The isolated preview is `node scripts/preview-pulse-media.mjs` at `http://127.0.0.1:5283/`. Browser zoom required viewport overrides of 1296 and 351 device units to measure **1440 and 390 CSS px** respectively. Each row used a fresh page with synthetic records; `scrollWidth <= innerWidth` means no page-level horizontal overflow. Library and capture were visually inspected in both themes. Each dialog was opened and its frame geometry measured in every combination.

| CSS viewport / theme | Library scroll width, page height | Capture scroll width, page height | Add / detail / capture dialog |
| --- | --- | --- | --- |
| 1440 × 844 light | 1423, 1245 | 1440, 844 | Frame heights 727 / 700 / 532; centered and within viewport. |
| 1440 × 844 dark | 1423, 1253 | 1440, 844 | Same frame heights and position; no horizontal overflow. |
| 390 × 844 light | 373, 1955 | 373, 1252 | Three full-height 844 px frames, top 0; body remains inside frame. |
| 390 × 844 dark | 373, 1974 | 373, 1275 | Same full-height frame behavior; no horizontal overflow. |

- The long library scrolls vertically at 390 px; capture route scrolls when populated. Phone header tabs and Add media action fit the column after a targeted overflow repair.
- Tab and Shift+Tab stayed inside the read-only detail dialog. Escape closed detail and capture dialogs and returned focus to their opener. Visible blue focus rings are provided by the shared Design System contract.
- Browser emulation of `prefers-reduced-motion: reduce` returned `true`; a Media card's computed transition duration was `0s`. Emulation was reset afterward.
- Browser observations were from generated example records only. The checked-in fixture has no real school name, learner record, credential, token, or external image URL.

## Verification and known limits

- `npm.cmd run build`: passed, 2,435 modules. Existing dynamic/static SparkQuest Firebase import and large chunk warnings remain.
- `node scripts/check-education-system.mjs`: 62 checks passed.
- `git diff --check`: passed.
- Preview console showed only Tailwind CDN development warnings from the fixture HTML; no Media runtime error was observed.
- The first build attempt used another checkout's incomplete dependency directory and could not resolve Rive WASM. The final build used the already installed matching dependency directory from the Learning/Portfolio worktree and passed. This dependency junction is ignored and uncommitted.
- A live remote image host, real Firebase persistence/permission enforcement, native share/camera, and physical-phone layout were intentionally not used in the synthetic browser run. The Media optional listener's missing error/readiness signal is the main remaining product gap; it needs a separately scoped AppContext contract, not a visual CSS patch.

## Reproduction

1. Run `node scripts/preview-pulse-media.mjs` from this worktree.
2. Use `?theme=light|dark`, `&scenario=empty`, `&role=readonly|parent|student`, or `&role=parent&link=none`.
3. Use the **Synthetic Media QA** controls below the page to resolve a queued write as saved or failed, or to accept/cancel a delete. The adapter replaces AuthContext, AppContext, ConfirmContext and Firestore imports only inside the fixture bundle.

The parent integration task owns the consolidated Design System handoff and any shared `.agent` updates. This branch stops at Media.
