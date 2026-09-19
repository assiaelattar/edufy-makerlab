# Admissions Module Context

## Responsibility

Project legacy leads into a safe family admissions journey, then provide validated follow-up workflows without taking ownership away from Workshops, Finance, Students, or enrollment.

## Canonical inputs

- `types/index.ts`: legacy Lead, Booking, Student, Enrollment.
- `context/AppContext.tsx`: current tenant-scoped data feed.
- `context/AuthContext.tsx`: roles and `can(...)`.
- `views/marketing/*`: behavior that must remain compatible.
- `components/education-ui/*`: visual primitives/tokens.

## Current implementation

- `domain/admissionTypes.ts`: canonical read-stage, evidence, repair, next-action, and projection contracts.
- `domain/admissionAdapter.ts`: pure tenant-safe legacy projection and stable-evidence precedence.
- `domain/admissionSelectors.ts`: pure age, threshold, stage-count, search, active-case, and compatibility Today selectors.
- `domain/admissionAdapter.fixtures.ts` and `domain/admissionAdapter.smoke.ts`: deterministic 22-scenario no-dependency compatibility proof.
- `domain/admissionWorkflowTypes.ts`: canonical activity, task, outcome, reason, actor, audit, and optimistic-version contracts.
- `application/recordAdmissionNote.ts`: internal-note command; tenant/role validation, safe IDs, normalization, idempotency fingerprint, and expected version.
- `domain/admissionWhatsApp.ts`, `application/recordAdmissionWhatsAppActivity.ts`, `infrastructure/firebaseAdmissionWhatsAppStore.ts`: tenant template preview, six explicit activity states, durable consent and atomic logging.
- `ui/EducationAdmissionsWhatsAppAssistant.tsx`: passport assistant with consent, editable preview, WhatsApp handoff, manual result, and parent outcome. `ui/admissionWhatsApp.browser.smoke.mjs` verifies it with mocked external boundaries.
- `application/recordAdmissionNote.smoke.ts`: deterministic 16-scenario command and denial proof.
- `infrastructure/firebaseAdmissionNoteStore.ts`: atomic immutable activity plus case-state version transaction.
- `infrastructure/admissionRules.contract.smoke.ts` and `infrastructure/admissionRules.emulator.ts`: static and Auth + Firestore emulator security proofs.
- `domain/admissionWorkshopLinks.ts`: canonical tenant-bound booking/case resolver; phone matches are candidates only.
- `domain/admissionWorkshopLinks.smoke.ts` and `domain/admissionWorkshopIntegration.contract.smoke.ts`: stable-link and producer/consumer contract proofs.
- `domain/admissionOffer.ts`: tenant-bound offer snapshot builder, payment-plan compatibility, and independent Finance fact summary.
- `domain/admissionOffer.smoke.ts` and `domain/admissionEnrollmentIntegration.contract.smoke.ts`: canonical pricing, financial-state, and successful-enrollment handoff proofs.
- `utils/programPackPricing.ts`: shared canonical Program-pack price catalog and existing guided-enrollment standard-price policy.
- `ui/EducationAdmissionsReadOnlyV1.tsx`: development-only Today, non-drag Pipeline, All cases, and Family Journey Passport.
- `ui/education-admissions-v1.css`: module-scoped Education UI expression and mobile full-screen passport.

## Required SOT keys

- `SOT:EDUCATION_UI_TOKENS`
- `SOT:EDUCATION_UI_PRIMITIVES`
- `SOT:LEGACY_LEAD`
- `SOT:LEGACY_BOOKING`
- `SOT:AUTHORIZATION`
- `SOT:ADMISSION_CASE`
- `SOT:ADMISSION_ACTIVITY`
- `SOT:ADMISSION_TRANSITION`
- `SOT:ADMISSION_PERSISTENCE`
- `SOT:ADMISSION_WORKSHOP_LINK`
- `SOT:PROGRAM_PACK_PRICING`
- `SOT:ADMISSION_OFFER_HANDOFF`
- `SOT:ADMISSIONS_PREVIEW`
- `SOT:ADMISSION_WHATSAPP`
- `SOT:WHATSAPP_PHONE`

## Allowed dependencies

- Pure domain code may import types only.
- UI may import domain selectors, approved application commands/infrastructure adapters, Education UI primitives, Lucide icons, and existing callbacks. Presentational components do not issue direct Firestore queries.
- Infrastructure may use Firebase only through an approved application command and matching tested rules.

## Forbidden behavior

- No Firestore access from domain or presentational components.
- No phone-only silent identity/linking.
- No automatic legacy data correction.
- No WhatsApp delivered/read state without provider evidence.
- No payment verification or enrollment creation inside Admissions.
- No new global tokens, dependencies, or unscoped CSS.
- No removal of the Marketing CRM during preview phases.

## Extension pattern

Search current CRM, Workshop, Finance, and enrollment logic; adapt it behind pure contracts; prove compatibility with fixtures; add a scoped Education UI surface; then introduce commands one at a time with rules and audit.

## Required tests

- Seven legacy lead statuses and missing fields.
- Cross-tenant evidence ignored.
- Stable enrollment/booking evidence precedence.
- Phone-only candidates flagged, not linked.
- Ambiguous interested/closed/converted cases remain visible.
- Desktop/mobile, keyboard, loading/empty/error/reduced-motion states for UI phases.
- Production build after every phase.
