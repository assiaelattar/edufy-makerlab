# Students experience known issues

## 2026-10-15

- Possible duplicate comparison does not merge records. Staff can open each exact profile for investigation; audited merge and undo are separate work.
- Authenticated desktop and phone acceptance with a designated staff account is still needed after release. The build check and public asset check cannot prove every tenant's data-specific action.
- The broader Edufy module-wide visual consistency audit remains with the Edufy UI/UX chat; this release scopes color and navigation to Students.
- Repository-wide `tsc --noEmit` has existing errors outside this Students change, including `App.tsx`'s missing `PublicEnrollmentView` symbol and `maker-pro` diagnostics. The registered Vite production build passes; none of the changed Students files appeared in the filtered TypeScript diagnostics.
