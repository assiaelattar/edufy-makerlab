# Edufy public landing — Duolingo direction, 2026-10-29

## Scope

This pass covers the public home page shown before authentication (`LandingView`). It preserves the existing `#login` and `#signup` actions and does not initialize Firebase or change authentication behavior.

## Design direction

The page now introduces Edufy as a school-day route rather than a generic SaaS dashboard:

- The Edufy logo is the primary brand lockup in the header, footer and public preview.
- The hero thesis is **“Your school day, with a next move.”**
- A signature route rail makes the operating promise visible: **Notice → Prioritise → Follow through**.
- The locked Edufy palette is assigned by role: green identity and progress, blue primary action, yellow highlight, orange follow-up, and purple learning context. The public canvas stays light so the colours remain legible and welcoming for school teams.
- The hero is built from scratch as an illustrated **Edufy day path** in HTML/CSS: welcome learners → robotics workshop → share progress. It uses rounded, tactile, outlined surfaces inspired by Duolingo, without reusing a dashboard screenshot or product image.

## Responsive behavior

- Desktop: split hero with the day-path illustration, route rail and four capability chips.
- 390px mobile: compact logo/CTA header, stacked hero actions, vertical day path and two-column capability chips, with no horizontal overflow.
- Reduced motion: public animations and transitions collapse to near-still behavior.

## Verification

- Public preview fixture: `node scripts/preview-public-landing.mjs` → `http://127.0.0.1:5250/`.
- Desktop and 390px browser screenshots inspected using the real `LandingView` component.
- Mobile bounds check: `innerWidth=390`, `scrollWidth=390`, zero overflowing buttons.
- Current preview console errors: none for port 5250.
- `node scripts/check-education-system.mjs` — 62 checks passed.
- `npm.cmd run build` — passed (2,966 modules transformed; existing Firebase mixed-import and large-chunk warnings only).
- `git diff --check` — passed.

## Acceptance boundary

The preview is synthetic and read-only. The public page is code-complete locally but has not been deployed in this pass. Authentication, permissions, Firebase data and production records were not changed.
