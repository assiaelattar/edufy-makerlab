# Students experience known issues

## 2026-10-22

- Live DAKY records show separate parent login IDs: Kamyl has `p.daky-3@makerlab.academy`, Nassym has `p.daky-4@makerlab.academy`. The first appears in Nassym's verified-family selector, but Nassym's recorded parent name differs from that login's profile name. Exact family identity and retained account require staff verification before a production transfer; no account was merged or disabled.
- The local duplication guard passed API syntax, focused TS transpilation, full production build and the Auth/Firestore parent-access emulator suite after installing the lockfile dependencies in an isolated worktree. Signed-in parent account consolidation remains unverified; do not change the real family accounts until exact identity and retained login are confirmed.

## 2026-10-20

- Signed-in tenant acceptance remains open. This worktree's browser QA used synthetic records and mutation stubs; real persistence, archived-list refresh/reactivation, AppContext loading/error states, and route/data authorization require integrated checks. See `STUDENTS_REGISTER_DS_2026-10-20.md`.
- Family grouping still uses normalized phone in the existing projection. Shared phone does not establish a verified household; introduce an explicit family identity in a separate domain phase.
- Existing Firebase mixed-import and large-chunk warnings remain in the standard production build.

## 2026-10-15

- Possible duplicate comparison does not merge records. Staff can open each exact profile for investigation; audited merge and undo are separate work.
- Authenticated desktop and phone acceptance with a designated staff account is still needed after release. The build check and public asset check cannot prove every tenant's data-specific action.
- The broader Edufy module-wide visual consistency audit remains with the Edufy UI/UX chat; this release scopes color and navigation to Students.
- Repository-wide `tsc --noEmit` has existing errors outside this Students change, including `App.tsx`'s missing `PublicEnrollmentView` symbol and `maker-pro` diagnostics. The registered Vite production build passes; none of the changed Students files appeared in the filtered TypeScript diagnostics.
