# Mission Autopilot

Implemented locally on 2026-09-30. Open Instructor → Mission library → Import CSV. Download the example from the upload screen or paste CSV. The former basic importer is now a full mission completion wizard.

## Instructor flow

1. Read up to 200 rows from a CSV under 5 MB. `Title` is the only necessary header; missing values become completion tasks.
2. Inspect the mission queue, skip unwanted rows, and enter the next incomplete section.
3. Correct invalid data; resolve stations, workflows and audience references; complete the learner brief and workflow.
4. Attach requested files individually or match multiple files by exact filename. Covers are optional unless requested. Explicitly remove a request if the file should not be included.
5. Preview the actual learner mission view, then create drafts. Incomplete learning content/audiences may remain draft; malformed data, unresolved references, missing requested files and invalid resource URLs block creation.
6. Inspect per-row results and download a CSV report. Retry failed rows without duplicating successful rows. Complete missions created in this session can be assigned with a separate button; existing records are preserved.

## CSV fields

Supported fields: `ImportKey`, `Title`, `Description`, `Hook`, `Station`, `Difficulty`, `Duration`, `CoverImage`, `CoverFile`, `Skills`, `Technologies`, `Goal`, `WhyItMatters`, `FinalOutcome`, `Materials`, `Prerequisites`, `SafetyNotes`, `Deliverables`, `DeliverablesJSON`, `LearningOutcomesJSON`, `ResourcesJSON`, `StepResourcesJSON`, `WorkflowId`, `WorkflowName`, `WorkflowDescription`, `WorkflowPhasesJSON`, `DefaultSteps`, `AudiencePrograms`, `AudienceGrades`, `AudienceGroups`, `AudienceStudents`, `DueDate`, `Status`, legacy `RealWorld_*`, `Challenge_1_*` through `Challenge_3_*`, and `Outcome_1_*` through `Outcome_3_*`. `ThumbnailUrl` and `Image` remain cover aliases. Recognized standard headers tolerate whitespace and case differences; duplicate headers block parsing. Unknown columns produce warnings.

Lists use semicolons or newlines. Technologies and real-world companies also accept legacy comma-separated lists. Dates use YYYY-MM-DD and are stored as the UTC end of the selected date. Import status always becomes draft, even when CSV requests assignment.

### Phases without JSON

`Step_1_Name`, `Step_1_Id`, `Step_1_Objective`, `Step_1_Instructions`, `Step_1_Checklist`, `Step_1_Tools`, `Step_1_Materials`, `Step_1_SafetyNotes`, `Step_1_Minutes`, `Step_1_EvidenceType`, `Step_1_EvidencePrompt`. Repeat with Step_2, Step_3, etc. Phase IDs default to phase-1, phase-2, etc. JSON phases take precedence when supplied. DefaultSteps produces a custom workflow from simple phase names.

### Repeated content

```json
// DeliverablesJSON
[{"id":"prototype","title":"Working prototype","description":"Demonstrate the alert","required":true,"evidenceType":"video"}]

// LearningOutcomesJSON
[{"id":"sensor","title":"Read sensor data","desc":"Turn a measurement into a useful signal","theme":"blue"}]

// ResourcesJSON: URLs attach files; missing URLs create file requests
[{"id":"guide","title":"Wiring guide","type":"file","fileName":"guide.pdf"}]

// StepResourcesJSON: keys must match selected workflow phase IDs
{"phase-1":[{"id":"plan","title":"Planning guide","type":"link","url":"https://example.com/plan"}]}

// WorkflowPhasesJSON: array order defines phase order
[{"id":"build","name":"Build and test","objective":"Prove the prototype works","instructions":"Build safely and run two tests","checklist":["Wire","Test","Improve"],"tools":["Computer"],"materials":["Sensor"],"safetyNotes":["Disconnect power before rewiring"],"estimatedMinutes":60,"required":true,"evidenceRequirements":[{"id":"test","type":"video","prompt":"Show both tests","required":true}],"resources":[]}]
```

Resource types: video, link, file, image. Evidence types: image, video, document, link, text, any. Resource IDs must be unique within each phase; `cover` is reserved. HTTP/HTTPS URLs only; no base64 content or local paths. Cover uploads accept images under 5 MB. Resource uploads reuse the existing image/video/audio/PDF/text policy under 20 MB.

Program, grade and workflow names resolve only when unique. Groups are stored as the existing canonical group name contract. Learners resolve through tenant student records and their verified linked UID aliases, never names/emails/phones or unlinked auth profiles. Ambiguities become manual selections. Assignment retains the existing direct-learner precedence and never writes enrollments.

## Persistence and repeats

The permanent ImportKey plus active organization determines a SHA-256 document ID. If absent, filename plus row number is used and the wizard warns about stability across different files. Same-key rows within a batch block creation until corrected or skipped.

An existing same-key document is returned as `exists`; it is never overwritten. Changed content is reported explicitly, and a new key creates a copy. Mission and custom workflow are stored in one Firestore transaction. Existing workflow references are freshly checked for existence and tenant ownership. Missions receive a frozen versioned workflow snapshot, organization, actor, server timestamps, source and content fingerprint. Publishing separately reads the stored draft and enforces mission readiness. Concurrent/repeated imports create one mission.

## Validation

- `node sparkquest/domain/missionImport.smoke.ts`
- Existing missionContent, workflowPipeline, and missionAssignment smokes
- SparkQuest `npm.cmd exec tsc -- --noEmit`
- SparkQuest and Edufy `npm.cmd run build`
- Auth/Firestore emulator: `emulators:exec --only auth,firestore --project demo-mission-import "node sparkquest/domain/missionImport.emulator.mjs"`
- Local `?designPreview=import`: complete CSV, missing-content progression, custom workflow, audience selection, requested cover upload, learner preview, draft results, optional assignment, desktop/phone layout and console checks

The preview is restricted to development and a local hostname, uses synthetic catalogues, and has no application reads/writes or Firebase uploads. It simulates draft/assignment and upload results. Emulator tests prove the real transaction path, concurrency, existing-content preservation, snapshot stability, assignment gates, enrollment separation, student/cross-tenant write denial and foreign workflow rejection. No dedicated repository agent-check script is configured; the checks above are the verification gate.

## Limits and next acceptance

ZIP asset bundles and updating existing missions are deferred. Wizard state lasts for the open import; closing warns before discarding unsaved content. Uploaded files can remain unattached if the instructor leaves or removes a request; no automatic Storage deletion occurs. A future retention policy can address abandoned uploads. HTTP links are format-validated, not fetched or guaranteed to be accessible to learners.

Before release, run designated-account acceptance with a real instructor: import the downloaded example, upload a PDF/image, assign a completed draft, and confirm learner startup/proof/review and frozen snapshots. No production record, rule, index, API, commit, push, or deployment changed in this implementation.
