# Education UI changelog

## 2026-10-16 — School sign-in loading

- Reduced the operational startup gate to academy settings, students, programs and enrollments.
- Started nonessential module listeners after the first school records are ready, instead of competing with them during sign-in.
- Loaded add-on request status in the background while keeping plan, catalog and organization access checks in the startup gate.
- Removed the misleading Retry action from a healthy but slow loading state. Retry remains available for a real loading error.

## 2026-10-15 — School-day operations

- Added live priority actions ahead of aggregate metrics in Classes, attendance and the weekly Schedule.
- Matched class and attendance dates to the local device day and normalized English/French weekday labels.
- Restricted visible Schedule sync and instructor assignment controls to the existing attendance-manager permission.
- Moved school-day surfaces to restrained light/dark school tokens.

## 2026-10-15 — Programs, Students and Pickup

- Added program portfolio priority, explicit learner next-step preview and live Pickup handoff focus.
- Preserved existing data projections, permissions and mutations.

See the dated focus reports in this directory for validation and pending acceptance.
