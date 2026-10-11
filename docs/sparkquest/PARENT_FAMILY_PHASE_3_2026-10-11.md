# SparkQuest parent family Phase 3 — visual project stories

Status: **implemented locally, NOT RELEASE READY.** No production data, rules, indexes, account, commit, push, or deployment changed.

## What changed

- Every learner project is now a SparkQuest-style visual card. Desktop uses a two-column project grid; phone uses one card per row. Each card keeps its stored cover, status, title, description, approved-step progress, and an accessible expand control.
- The image resolver uses real project data in this order: `thumbnailUrl`, `coverImage`, the first safe `gallery`/`mediaUrls` image, then the referenced `project_templates` cover. It accepts local app assets, HTTP(S), image data URLs, and blob URLs while rejecting executable or non-image data schemes.
- Template fallback reads only the exact `templateId` referenced by an authorized project. A tenant-scoped template must match the parent's organization; legacy/shared templates may omit `organizationId`. Only the image field is copied into the family projection.
- Missing or broken images use a branded SparkQuest project fallback. No unrelated stock image is invented.
- Expansion remains read-only and exposes description, stored image evidence, project presentation, build steps, canonical step feedback, project-level instructor feedback, and skills. Media and presentation links open their stored targets without modifying the learner project.
- Learner sections, source permissions, finance/attendance/Pickup states, sibling separation, and the Pickup write boundary are unchanged.

## Files

- `sparkquest/components/ParentFamilyWorkspace.tsx`
- `sparkquest/components/parent-family-workspace.css`
- `sparkquest/hooks/useParentFamily.ts`
- `sparkquest/domain/parentProjectVisual.ts`
- `sparkquest/domain/parentProjectVisual.smoke.ts`
- focused synthetic fixtures in `sparkquest/App.tsx`

## Verification

- `node sparkquest/domain/parentProjectVisual.smoke.ts`: 5 media-priority, deduplication, template-fallback, and unsafe-URL checks passed.
- Existing parent link and operations smoke suites passed: 8 link checks and 2 summary checks.
- SparkQuest `npx tsc --noEmit`: passed.
- SparkQuest production build: passed, 2,281 modules.
- Integrated Edufy production build: passed, 4,466 modules.
- Desktop synthetic QA: three cards across two siblings; two real stored images and one graceful fallback; two-column grid; no horizontal overflow.
- Phone synthetic QA: one-column project grid at the browser's scaled 433 CSS px; two images and one fallback; expanded card retained width with no horizontal overflow.
- Interaction QA: presentation evidence and build steps were visible on the GPTGame card; build steps and instructor feedback were visible on the plant-guardian card; only one project remained expanded.
- Browser console: no errors; the existing Tailwind CDN production warning remains.

## Next release gates

1. Host and accept the trusted staff parent credential/reset endpoint, then prove parent SparkQuest sign-in using a designated nonproduction account.
2. Release and verify the guardian rules and indexes in a clean coordinated candidate before the SparkQuest parent client. Confirm target index readiness.
3. Accept a real two-child family with stored project covers, evidence, instructor feedback, finance, attendance, and Pickup records on desktop and exact phone widths. Verify that referenced Storage/CDN images are readable by the parent and that broken/revoked assets fall back cleanly.
4. Reconcile missing guardian links, tenantless projects, and legacy Pickup records without inferring identity from name, email, or phone.
5. Keep Pickup actions and notifications disabled in this parent surface until the Phase 3 shared-guardian command/rule gates, legacy overlap policy, and four-role cross-session acceptance pass.
6. Isolate these files from the mixed checkout and rerun focused smoke, TypeScript, both builds, real-account responsive acceptance, and live Vercel verification before a release decision.

## Real student boundary

Kenza Ajlane, Nada Ajlane, and Ali Ajlane are real students who should appear under one real parent account, as the user explicitly instructed. The user prefers `p.ajlane@makerlab.academy` for that account; it is a login naming preference, subject to the trusted collision check, and never an authorization fact. The verified parent's recorded full/display name remains separate from the alias basis. The three students and their parent are excluded from demo, synthetic, and nonproduction test-account use. This instruction defines the intended relationship but does not identify the actual Edufy records or parent account. Do not link them to the earlier test login, infer record IDs from their surname, or grant access from alias/name matching. The Edufy connector was unavailable and no local Admin connection was configured during this phase, so their records and relationships were not inspected or changed. Before any production family-access work or real-account QA, authorized Edufy staff must resolve all three exact canonical learner IDs and verify one actual parent UID/email plus three explicit active same-tenant guardian links and permissions. Synthetic and nonproduction acceptance remain separate.

Stop at this local visual-card boundary. Never deploy the mixed checkout wholesale.
