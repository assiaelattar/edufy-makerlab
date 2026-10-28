# Pickup parent receipt and lobby handoff — 2026-10-28

## Change

- Keep the existing canonical lifecycle: staff verify and mark `released`; the linked parent who is the selected picker confirms `confirmed`. The parent action is visible near the top of SparkQuest Pickup and stays sticky while scrolling the card.
- Keep the action visible for `on_the_way` arrival too. Collapse secondary workshop information and shorten status guidance so Pickup remains the focus.
- Show the lobby only active learners marked `present` or `late` for today's scheduled enrollment in the current organization. A fully confirmed Pickup leaves the lobby. Staff retain the full scheduled roster for desk operations.
- The lobby displays live gate and awaiting-receipt counts, the current status, and the last update time. It no longer displays the picker's name on the shared screen.

## Decisions and data boundaries

- No new Pickup status, Firestore rule, collection, or migration is needed. `released` remains incomplete until the selected linked guardian confirms receipt. Firestore checks the user's exact profile name against the immutable selected picker name. The SparkQuest button uses the same equality check.
- Attendance is the lobby presence source. A scheduled learner without a present or late attendance record is hidden; an already confirmed Pickup is hidden even though attendance remains historically present.
- The staff queue is unchanged and still includes scheduled learners, including those not yet marked present.

## Checks

- Edufy production build.
- SparkQuest TypeScript check and production build.
- `node modules/pickup/domain/dailyPickupRoster.smoke.ts`: present, absent, late, wrong organization and wrong date.
- SparkQuest local parent preview at desktop and phone width (`?designPreview=family&pickupState=released`): receipt action visible at the top and while scrolling; click transitions to completed state.
- `git diff --check`.

## Known limits / release checks

- The lobby is a view inside an authenticated staff session, projected onto a lobby display. It is not a separately authenticated public client.
- The filter uses enrollment attendance. A demo visitor or ad hoc learner without a scheduled enrollment and attendance row does not appear in this lobby roster.
- Real-account acceptance should verify a staff release, parent receipt, and the live lobby transition on the deployed versions. Avoid testing with an actual child exit solely through a synthetic record.
- This branch does not change historical Pickup records or the active phase's other modules.
