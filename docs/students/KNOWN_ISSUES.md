# Students experience known issues

## 2026-10-20

- Signed-in tenant acceptance remains open. This worktree's browser QA used synthetic records and mutation stubs; real persistence, archived-list refresh/reactivation, AppContext loading/error states, and route/data authorization require integrated checks. See `STUDENTS_REGISTER_DS_2026-10-20.md`.
- Family grouping still uses normalized phone in the existing projection. Shared phone does not establish a verified household; introduce an explicit family identity in a separate domain phase.
- Existing Firebase mixed-import and large-chunk warnings remain in the standard production build.

## 2026-10-15

- Possible duplicate comparison does not merge records. Staff can open each exact profile for investigation; audited merge and undo are separate work.
- Authenticated desktop and phone acceptance with a designated staff account is still needed after release. The build check and public asset check cannot prove every tenant's data-specific action.
- The broader Edufy module-wide visual consistency audit remains with the Edufy UI/UX chat; this release scopes color and navigation to Students.
- Repository-wide `tsc --noEmit` has existing errors outside this Students change, including `App.tsx`'s missing `PublicEnrollmentView` symbol and `maker-pro` diagnostics. The registered Vite production build passes; none of the changed Students files appeared in the filtered TypeScript diagnostics.
