# Admissions Education UI Direction

## Subject, audience, and single job

Subject: the real daily path from a family’s first question to a child’s confirmed place at the academy.

Audience: reception and admissions staff working quickly between calls, WhatsApp, workshop arrivals, pricing questions, and on-site payments.

Single job: show the next family action that matters now, with enough context to complete it safely.

## Visual system

Use the existing Education UI without adding tokens:

- Canvas `#eef0ed`; working paper `#ffffff`; ink `#111111`.
- Rare primary Volt `#c8ff3d`; warm attention `#fff0e6` / `#ff8a45`.
- Lilac `#e9e2ff` for planning; semantic success/danger/info from the current system.
- DM Sans for display/interface; Inter as fallback/support; JetBrains Mono for dates, durations, and IDs.
- 28px major work surfaces, 17–22px rows/panels, capsule actions only where already canonical.

## Layout concept

Admissions is a **family follow-up desk**, not a KPI dashboard.

```text
+------------------------------------------------------------------+
| Students / Families / Admissions       [Add family inquiry]      |
| Today  Pipeline  All cases                                       |
+--------------------------------------+---------------------------+
| WHY THIS NEEDS ATTENTION             | FAMILY JOURNEY PASSPORT   |
| 3 overdue                            | Parent + learner           |
|                                      | ● New                      |
| [09:30] Confirm trial      WhatsApp  | ● Trial booked            |
| [11:00] Send prices        Send      | ◉ Planning & pricing       |
| [Late ] Follow up payment  Call      | ○ Payment                 |
|                                      | ○ Enrollment              |
| Upcoming / no-next-action rows        | Next: send tariff today   |
+--------------------------------------+---------------------------+
```

Desktop uses a 58/42 workbench: queue left, sticky family passport right. Mobile shows the queue first; opening a case becomes a full-screen passport with sticky Call, WhatsApp, and Update actions.

## Signature element

The memorable element is the **Family Journey Spine**: a compact vertical enrollment path inside the case passport. Completed, current, and future stages are visually distinct, and the current stage physically attaches to the next-action card. It translates the real admissions journey into a navigational control rather than decoration.

## Content hierarchy

1. Reason the case needs attention.
2. Parent/learner identity and interest.
3. One primary action.
4. Current stage, owner, and due time.
5. Last exchange/outcome.
6. Workshop, offer, payment, and enrollment evidence.
7. Full history on demand.

## Motion

Use 150ms control feedback and 200–240ms panel transitions already defined by the system. Queue rows leave only after confirmed writes. Journey-spine changes use color/position continuity, not celebration. Respect reduced motion and avoid horizontal Kanban animation on mobile.

## Self-critique and revision

The first concept considered a row of five pastel KPI cards and a wide Kanban. That pattern is generic and would hide the operator’s main job below summary decoration. The revised design uses one slim day-status line, an action queue, and the journey passport. Color is spent on the current journey/action rather than a metric wall. Pipeline remains available for planning, but Today is the default.

## Implementation boundaries

- Build under the current `?ui=education-v1` preview and `.edu-v1` scope.
- Reuse Education primitives and the Students operations desk composition.
- Add only a module-scoped stylesheet; do not edit global tokens during the first Admissions slice.
- Preserve Students/Families behavior and all existing callbacks.
- Use real lead/bookings/program data; do not ship decorative mock metrics.
