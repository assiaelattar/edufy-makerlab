# Reference acceptance checklist

## Visual gate

- Shared six-color vocabulary and purposeful saturation; orange does not dominate the screen.
- Recognizable Nunito/tactile/outlined direction in light and dark.
- Dashboard priority queue precedes supporting data. 011Y is contextual and does not block work.
- Register remains readable with long names, missing data, selection and filters.
- Full enrollment journey and profile editor use the same controls, hierarchy and feedback.

## Browser gate

At desktop and a 390 CSS-pixel phone viewport in both themes:

- No page-level horizontal overflow; intended tab/filter rails remain usable.
- Main page and long forms scroll. Modal header/footer remain usable; nothing is clipped.
- Search, filter and next-step/profile controls work. Returning to Students preserves search, filters and scroll. Changes of organization/user use a separate state scope.
- Required-field validation is visible; fields have accessible names; failed saves preserve drafts; pending saves cannot be double-submitted.
- Keyboard focus is visible. Dialog Tab/Shift+Tab stay inside, Escape closes the top dialog and focus returns to the opener.
- Reduced motion disables decorative transitions. The mascot retains a frame when paused or resized.
- Empty, loading, error/retry, permission-restricted and disabled patterns are inspectable in the gallery; module data failures remain controlled by the existing data layer.

## Safety and evidence

- Production build and changed-code type checks pass; pre-existing failures are listed separately.
- Use real components with synthetic records for write-flow checks; record exactly what was simulated.
- Read-only real-account integration is a separate check, never proof of successful production writes.
- Capture reference screenshots only from synthetic data. Keep no credentials, production records or environment files in the handoff.
- User approval of all references precedes rollout to Programs/Attendance or reactivation of the heartbeat.
