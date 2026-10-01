# Learner workspace — Phase 1

Implemented locally on 2026-10-01 under the approved dashboard and desktop-polish requests. No release or production-data mutation was performed.

## Delivered

- Current-year active projects stay on the workbench, independent of discovery filters. The last-opened active build is pinned; otherwise the most recent active project leads. Feedback and submitted projects have their own instructor lane.
- Canonical organization/owner verification governs owned projects, not current enrollment or edited template audiences. Explicitly linked legacy projects retain the stricter identity-link eligibility contract.
- One Field Log separates this year's non-active projects from previous years, including older unfinished work. Saved project previews use the actual record and its frozen workflow, not a mutable catalogue template. Historical work is read-only.
- Desktop navigation has a 264px rail, 64px rows, 24px icons, 16px labels, an explicit Workbench destination, and independent overflow for short windows.
- Dashboard and Showcase share scoped paper/ink/lime/orange/yellow tokens. Strong mission identity remains; working forms use white surfaces and restrained shadows. No fake OS controls or new dependencies were added.
- Naming uses the shared accessible dialog, a visible label, 120-character limit, disabled empty/busy actions, inline failure, and name preservation until a successful create. The dialog's close-handler reference no longer resets keyboard focus on each keystroke.
- Showcase replaces the navy grid with a compact project toolbar and scrollable white editor. File selection is keyboard accessible; the link has an associated label. Existing file types, 20MB limit, tenant/user/project Storage upload path, save errors, and instructor review states remain.
- Local Showcase preview skips Storage writes and automatic focus-session start/end. Workbench fixtures mount before authentication providers and do not read or write application data.

## Verification

- Scoped SparkQuest TypeScript passed.
- Standalone SparkQuest and integrated Edufy production builds passed (2,234 / 4,442 modules).
- 70 assertions passed: workbench 22, workflow 16, mission content 11, assignment 10, identity 11.
- Desktop fixture: 1,422 CSS-pixel viewport equals document width; rail/row/label measurements match the specifications.
- Phone fixture: 433 CSS-pixel viewport equals document width for workbench, naming, and Showcase. Continue remains visible; Showcase scrolls within its workspace.
- Naming: character-by-character typing preserves input focus; Tab from the last action wraps to Close; Escape restores focus to New project.
- Showcase: empty submission disabled, malformed link shows inline warning, a valid synthetic link submits through the preview-only callback, upload control participates in keyboard navigation.
- Prior workbench QA also verified pin switching, empty/review-only states, Field Log year selection, old unfinished projects, read-only historical proof, and portfolio focus trapping.
- Whitespace check passed. Existing Firebase mixed-import, Tailwind CDN, and bundle-size warnings remain. No dedicated repository agent-check command is configured.

## Boundary

No real project creation, deletion, media upload, review, or assignment was used for acceptance. No rules, indexes, APIs, credentials, commits, push, deployment, or Electron packaging changed. Designated-account create/upload/review acceptance remains required before release. Pickup, Build Rhythm, and nested arcade tools are separate visual follow-ups. Personal-project deletion removes the project document only, not previously uploaded Storage files.

## Local previews

- `?designPreview=workbench` (optional `&state=empty|review`)
- `?designPreview=showcase`
- `?designPreview=showcaseReview&outcome=revision|approved`

The first two require development mode and a local hostname; normal authenticated navigation is unchanged.
