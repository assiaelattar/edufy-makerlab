# Review reliability — Phase 1

Implemented locally on 2026-10-01 following approval of the review-first roadmap. This phase fixes client review visibility, evidence access, decision history and stale saves. It does not deploy, repair production records, create public shares, or implement the remaining roadmap.

## Delivered

- A dedicated Review inbox uses a shared pending-review selector for both step proofs and final missions. It includes independent loading/error/retry states, learner/project/step search, submission dates, explicit open buttons and newest-first ordering. The newest pending proof opens first within each project.
- Factory overview and student profile counters use the same selector, so building projects with submitted proofs count as needing review. Errors no longer masquerade as empty queues.
- Review opens its own scoped, live project document rather than depending on the overview cache. Loading, missing/inaccessible projects and retry remain visible instead of returning no UI.
- The proof-first panel combines the saved roadmap, task objective/instructions, student explanation, attachment and decisions. Images support Firebase encoded paths/query strings; video/audio have native players; PDFs and other links open the original. Unloadable files have visible fallback guidance. Unsafe URL schemes are not embedded.
- Step approval/revision and final publication are separate actions. Required steps must be approved before final publication. Revision needs a clear next action, XP is a bounded whole number, and controls disable while saving. Failures preserve feedback.
- Fresh-read Firestore transactions bind a decision to the viewed submission fingerprint and append the decision plus proof snapshot atomically. Competing decisions cannot both win; a repeated command ID does not append history or re-award completion XP.
- Student proof submissions record their time, MIME type and URL/note version history. Review history exposes both rejected and improved proof versions. Existing legacy reviews still display without the new optional fields.
- Learner compare-and-save prevents old tabs overwriting newer work/decisions. Stored instructor fields and existing frozen workflow snapshots remain authoritative; an absent legacy snapshot can still be captured the first time. Published missions cannot be reopened by this learner save path.
- Instructor portfolio edits now compare the opening snapshot before saving and cannot overwrite proof arrays, snapshots or review fields through that editor. Existing explicit editor status semantics otherwise remain unchanged.
- Final learner submission waits for confirmed persistence before closing or playing success. Student profile cards have explicit keyboard-operable progress/history/review buttons; verified canonical student IDs and linked Auth UID projects are grouped together, never by personal display data.
- A local synthetic review-loop fixture mounts before application providers. All decisions/submissions in it are local React state, with injectable save/inbox failures and no account reads, database writes, Storage uploads, or focus-session lifecycle.

## Verification

- Scoped SparkQuest TypeScript passes.
- All eight domain smoke suites pass: 45 review assertions plus 70 counted workbench/workflow/content/assignment/identity assertions; import and payload suites also pass.
- Isolated localhost `demo-review-loop` Auth/Firestore emulators pass the real service path: initial/immutable snapshot capture, sequential saves, proof → queue → revision → resubmission → concurrent decision → final submit → publish; stale learner and instructor-editor rejection; preserved stored history/proof/XP/snapshot; published learner save rejection; command replay; role, tenant and owner denials. Storage is not part of this test.
- Standalone SparkQuest build passes (2,239 modules); integrated Edufy build passes (4,442 modules). Existing Firebase mixed-import and bundle-size warnings remain.
- Browser fixture verifies the revision/resubmission/approval/publication sequence, three review decisions and two proof versions; failed-save feedback retention; inbox error/retry; image loading; and no console errors.
- Measured desktop width: 1,422 CSS pixels; measured phone width: 433 CSS pixels. Document widths match (no horizontal overflow). The browser's requested 390px override renders 433 CSS pixels; this is not claimed as exact 390px proof. Temporary overrides are reset and the phone tab is closed.
- Keyboard Tab wraps from the last review action to Close; Escape closes and restores focus to the inbox opener.
- Focused whitespace checks pass. No dedicated repository agent-check script is configured; the checks above are the phase gate.

## Acceptance and limits

Use `http://127.0.0.1:5174/?designPreview=reviewLoop` in the development app. Reset demo, request changes, close, resubmit as the synthetic student, approve the step, close, send the final mission, then approve/publish. Open History to inspect both proof versions. Failure toggles are set outside the dialog before opening it.

The exact production missing-project complaint is not audited or repaired by these synthetic tests. Organization-less records, incorrect owner links, absent files and rule deployment drift need a designated instructor/learner acceptance session; do not widen reads or migrate records to hide those problems.

These service checks prevent application-level stale overwrites, not malicious direct SDK writes. Existing Firestore rules do not yet protect individual review fields against a linked learner; review-field/audit rule hardening remains a separate coordinated release gate. History remains on the project document: monitor document size and define retention/subcollection migration before large histories accumulate. Legacy raster data URLs remain viewable but are not duplicated into new history snapshots, avoiding document bloat; old URL-backed files are not automatically deleted. No public URL or media consent policy was added.

Next phases: instructor learner-management workspace with assignment from profile; vivid opaque semantic colors and bounded workbench imagery; approval celebration; guardian-linked read-only progress workspace; explicit opt-in/revocable public sharing with minimal child identity. Stop at this phase boundary before expanding those areas.
