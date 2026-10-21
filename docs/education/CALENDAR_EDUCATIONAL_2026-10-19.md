# Calendar educational UI — 2026-10-19

## Delivered

Calendar / Global Schedule now follows the approved educational direction with the existing Notion-style application navigation preserved. The module retains its weekly timetable and adds an agenda grouped by date, session search, instructor-coverage and session-type filters, a week date picker, clear filters and explicit result counts. Weekly totals continue to describe the entire selected week.

The agenda is the initial view on phone-width screens. The Week view remains available and stacks by day on mobile. Neutral metric cards, green identity/today markers, blue class/action accents and small orange coverage cues keep the palette balanced. Workshop cards use a green edge; missing instructors are also labeled in text.

Session details include the group, date/time and current instructor. Managers can search the existing assignable team list; no-match/no-team states remain actionable. Existing assignment and timetable synchronization handlers, persistence and permission definitions are unchanged. No authentication, financial, schema, Firestore rule or index changes.

## Sources

- `views/CalendarView.tsx`: existing classSessions, programs, workshopTemplates, workshopSlots and teamMembers from AppContext; existing attendance.manage capability and assignment/sync handlers.
- `views/school-day/education-calendar-playful.css`: scoped presentation only.
- `scripts/preview-pulse-calendar.mjs`, `scripts/fixtures/pulse-calendar*.jsx`: isolated synthetic browser harness, no Firebase connection. Assignment testing updates in-memory fixture sessions only.

## Verification

- `npm run build`: PASS, 20.57 seconds; existing large-chunk warning remains.
- `git diff --check`: PASS. `atlas-loop-agent.js` executed as repository context reader, not as a test suite.
- Light and dark desktop rendering; 1440 CSS px page width equals scroll width.
- Mobile agenda and week layout at 390 CSS px; no page horizontal overflow. Mobile instructor dialog inspected.
- Combined session-name/coverage/type filtering: 1 of 6 matching sessions; incompatible combination gives no-match state; clear restores all six.
- Coverage metric selects unassigned agenda. Instructor search/no-match/clear checked. Synthetic assignment moves assigned count 4 → 5, gaps 2 → 1, filtered agenda 2 → 1.
- Next week empty state and Today return checked. Date input updated from 19–25 October to 2–8 November immediately after fixing input-event handling.
- Read-only role: no sync button or assignment chooser; session details remain accessible. Empty team scenario shows the existing no-instructor guidance.
- Signed-in actual app: Global Schedule mounts the new controls without overflow. Current week has zero sessions, so populated records and write workflows were verified only with fixtures. No production record was created or updated; sync was not executed.

## Preview and evidence

Actual local app: http://127.0.0.1:5202/ → Global Schedule. Same Wi-Fi address from the prior verified session: http://192.168.1.55:5202/.

Synthetic preview: http://127.0.0.1:5240/?theme=light or `?theme=dark`. Start with `node scripts/preview-pulse-calendar.mjs`; restart after source edits. Preview process session at handoff: 9796.

Committed synthetic screenshots under `docs/education/pulse-evidence/`: `calendar-week-light.png`, `calendar-agenda-light.png`, `calendar-agenda-dark.png`, `calendar-agenda-mobile-light.png`, `calendar-agenda-mobile-dark.png`, `calendar-instructor-mobile-dark.png`.

## Boundary and next phase

Local UI milestone only; no push or deployment. Browser emulation is separate from acceptance on the user's physical phone. Real-school instructor assignment and timetable synchronization remain untested in this pass. Programs work is preserved. Next unfinished educational rendering module: Admissions / Workshops. Stop at this phase handoff; heartbeat remains paused.
