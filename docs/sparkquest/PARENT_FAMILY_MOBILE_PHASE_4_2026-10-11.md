# SparkQuest parent family — mobile journey Phase 4

**Local candidate only. Nothing here is deployed and no family record was changed.**

## Decision and experience

The screenshot supplied on 11 October shows the older live Edufy Parent Access card, which still offers an email setup link. The clean release candidate already uses the trusted staff endpoint to generate a Firebase password and an email-shaped login ID that does not require an inbox. Edufy Student Details shows the password once in a credentials card for direct sharing or printing. A lost password is reissued by authorized staff. This credential signs the parent into SparkQuest, not the Edufy parent portal.

SparkQuest now opens a dedicated read-only family journey for a verified parent account. A phone-sized child switcher and four bottom destinations lead to Journey, Moments, Records, and Pickup. Journey uses the saved project/workflow data: goal, outcome, materials, ordered steps, instructions, resources, learner notes/proof, approval and mentor review. Moments combines authorized gallery items and project proof. Records lists program balances, payment history and attendance dates. Pickup shows status and directs arrangement changes to staff. No parent editing control is present.

Parent/child/tenant permission remains the saved active guardian link, including canonical learner and explicit Auth UID aliases. Media queries use the separate gallery permission; a portfolio link alone cannot read gallery items. The Firestore Pickup write exception is narrowed to learner role, while linked parents retain authorized read access. Project resources only become clickable for local or HTTP(S) URLs; executable schemes are rejected.

## Files

- Edufy issuance copy and one-time card: views/student-details/AccessAndAccountsTab.tsx and views/StudentDetailsView.tsx.
- SparkQuest entry and family app: sparkquest/components/LoginView.tsx, ParentFamilyWorkspace.tsx, parent-family-workspace.css, ParentFamilyPreview.tsx, and sparkquest/App.tsx.
- Authorized reads and details: sparkquest/hooks/useParentFamily.ts, sparkquest/domain/parentFamily.ts, parentFamilyOperations.ts, and parentProjectVisual.ts.
- Pickup permission boundary: firestore.rules.

## Proof

- SparkQuest TypeScript, SparkQuest production build, Edufy production build, family subject/operations/image smokes passed.
- Isolated demo-parent-family Auth/Firestore emulator passed canonical, sibling, alias, tenant, gallery/finance/attendance and revocation checks, plus parent Pickup update denial and a legitimate learner Pickup update.
- Localhost-only designPreview=family uses synthetic data and never writes. At 375 × 812 CSS pixels, Journey, Moments, Records, Pickup and sibling switching worked with documentElement.scrollWidth equal to innerWidth at 375. Project expansion exposed the saved brief, step proof and resources. The bottom nav moved the active content heading into view.
- Existing Firebase mixed-import and large-chunk build warnings remain.

## Release and data limits

- The public screenshot is still the old deployed UI. The reviewed candidate must be coordinated with the trusted API, rules/indexes, Edufy Hostinger client and SparkQuest Vercel client releases.
- The Edufy Vercel API still needs a Firebase Admin identity stored as a secret, deployment, route verification and nonproduction issue → sign-in → family acceptance. Firebase CLI needs reauthentication before rules/index release.
- Existing uploaded media uses saved download URLs. Confirm with a designated parent that actual Storage/CDN links and older proof formats open; revoked or legacy blobs must not trigger broader public Storage rules.
- Real Ajlane family records remain untouched. Verify exact learner IDs, parent identity and guardian links before any real-family activation.
- Pickup is view-only for parents in this phase. Any later parent action requires a separate authorized lifecycle and rules review.
