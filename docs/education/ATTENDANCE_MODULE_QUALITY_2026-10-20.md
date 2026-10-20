# Attendance module quality pass — 2026-10-20

## Scope

The main Attendance register in `views/AbsenceView.tsx` received a focused quality pass after Student Details. Its existing roster calculations, membership gating, Firestore writes, bulk confirmation, permission route and navigation remain in place.

- The register clock refreshes every 30 seconds, so Today and Live now update while the page stays open, including across midnight.
- A linked student's name fills a missing enrollment name in the search and displayed roster; an unnamed fallback stays visible if both are missing.
- The progress card no longer covers the roster while scrolling. Empty dates omit the zeroed progress card and unusable filters; the remaining empty state offers the next action.
- Session headings, status controls, row metadata, clear/contact actions and the renewal disclosure use the Education token palette and visible tactile depth. The old bridge no longer overrides the four status controls.
- The renewal badge and the save/empty guidance have readable contrast and concise copy.

## Verification

- Production build passed; the existing large bundle warning remains.
- `node scripts/check-education-system.mjs`: 27 checks passed.
- `node scripts/test-membership-lifecycle.mjs`: passed.
- `git diff --check`: passed.
- Synthetic preview at `http://127.0.0.1:5231/`: populated desktop and 390 px light/dark, renewal disclosure, empty/future date, failed individual save and successful retry. Screenshots: `evidence/attendance-quality-2026-10-20/`.

The preview uses synthetic records and simulated Firestore acknowledgments. It does not prove school persistence. A signed-in read-only tour and physical-phone check of this exact candidate remain open.

## Preserved boundary and remaining work

Attendance document IDs use date, student ID and slot time. Two enrollments for one learner at the same time can therefore share a mark. Changing that contract would require a separate data/history migration; this pass leaves it intact. A real authorized attendance write, external WhatsApp handoff, and restricted-role acceptance remain open. No production record, API, rule, schema, push or deployment changed.
