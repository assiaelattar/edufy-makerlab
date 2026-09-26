# Source-of-Truth Registry

| Key | Canonical file | Purpose | Status |
|---|---|---|---|
| `SOT:EDUCATION_UI_TOKENS` | `components/education-ui/education-ui-v1.css` | preview visual tokens | current/protected |
| `SOT:EDUCATION_UI_PRIMITIVES` | `components/education-ui/EducationPrimitives.tsx` | preview components | current/protected |
| `SOT:STUDENTS_PREVIEW` | `views/students/EducationStudentsOperationsV1.tsx` | Students/Family operations UX | current/protected |
| `SOT:LEGACY_LEAD` | `types/index.ts` (`Lead`) | persisted lead contract | current |
| `SOT:LEGACY_BOOKING` | `types/index.ts` (`Booking`) | workshop contract | current; known type drift |
| `SOT:LEAD_READS` | `context/AppContext.tsx` | current tenant listener | current |
| `SOT:CRM_UI` | `views/MarketingView.tsx` | legacy CRM entry/pipeline | current/protected |
| `SOT:CRM_PROFILE` | `views/marketing/LeadProfileModal.tsx` | calls, notes, workshop booking | current/protected |
| `SOT:WHATSAPP_IMPORT` | `views/marketing/ChatImporterModal.tsx` | legacy import | current/protected |
| `SOT:AUTHORIZATION` | `context/AuthContext.tsx` | role permissions | current; Admissions view/note/whatsapp keys assigned |
| `SOT:FIRESTORE_RULES` | `firestore.rules` | tenant data access | current/protected; strict Admissions activity gate added |
| `SOT:ENROLLMENT` | `App.tsx` guided enrollment | final conversion | current/protected |
| `SOT:SPARKQUEST_MISSION_CONTENT` | `sparkquest/types.ts` (`MissionBrief`), `sparkquest/domain/missionContent.ts` | canonical learner-facing brief, readiness, workflow summary and assignment projection | current/local |
| `SOT:SPARKQUEST_MISSION_DETAILS` | `sparkquest/components/ProjectDetailsEnhanced.tsx` | role-specific instructor dossier and learner build briefing | current/local |
| `SOT:SPARKQUEST_SHOWCASE_PIPELINE` | `sparkquest/components/StudentWizard.tsx`, `sparkquest/services/api.ts`, `storage.rules`, `firestore.rules` | learner media upload, project submission and instructor-moderated publication | current/tested |
| `SOT:MEMBERSHIP_LIFECYCLE` | `utils/membershipLifecycle.ts`, `utils/programLifecycle.ts` | enrollment coverage, attendance eligibility, rolling renewal detection and shared cohort periods | current/local |
| `SOT:MEMBERSHIP_ATTENDANCE_UI` | `views/AbsenceView.tsx`, `components/programs/ProgramSetupWizard.tsx` | renewal visibility and fixed school-semester setup | current/local |
| `SOT:ADMISSION_CASE` | `modules/admissions/domain/*` | typed read projection, evidence precedence, repair and age/search selectors | current |
| `SOT:ADMISSIONS_PREVIEW` | `modules/admissions/ui/EducationAdmissionsReadOnlyV1.tsx` | development-only Today, non-drag Pipeline, All cases, and family passport | current; Phase 2 complete |
| `SOT:ADMISSION_ACTIVITY` | `modules/admissions/domain/admissionWorkflowTypes.ts` | activity, task, outcome, reason, actor, audit, and version contracts | current; Phase 3 |
| `SOT:ADMISSION_TRANSITION` | `modules/admissions/application/*` | validated, authorized, versioned, idempotent commands | current; internal note and WhatsApp activity |
| `SOT:ADMISSION_PERSISTENCE` | `modules/admissions/infrastructure/*`, `firestore.rules`, `firestore.indexes.json` | atomic workflow persistence and tenant security proof | current; Phase 3 |
| `SOT:ADMISSION_WORKSHOP_LINK` | `modules/admissions/domain/admissionWorkshopLinks.ts` | stable tenant-bound booking/case resolution and phone-candidate detection | current; Phase 4 |
| `SOT:PROGRAM_PACK_PRICING` | `utils/programPackPricing.ts`, `types/index.ts` (`ProgramPack`) | canonical pack price catalog and guided-enrollment standard-price policy | current; Phase 5 |
| `SOT:ADMISSION_OFFER_HANDOFF` | `modules/admissions/domain/admissionOffer.ts`, `App.tsx` guided enrollment | immutable offer snapshot, separate Finance facts, and stable successful-enrollment links | current; Phase 5 |

| `SOT:ADMISSION_WHATSAPP` | `modules/admissions/domain/admissionWhatsApp.ts`, `modules/admissions/application/recordAdmissionWhatsAppActivity.ts`, `modules/admissions/infrastructure/firebaseAdmissionWhatsAppStore.ts` | template preview, explicit events, durable consent and atomic activity logging | Phase 6 |
| `SOT:WHATSAPP_PHONE` | `utils/whatsappPhone.ts` (re-exported by `utils/helpers.ts`) | existing destination-formatting policy | current |

Update this table whenever a canonical implementation is introduced or superseded. A planned path is not permission to create it outside the active phase.


## Finance service catalogue — Phase 1

| Key | Canonical file | Purpose | Status |
|---|---|---|---|
| `SOT:SERVICE_CATALOGUE` | `types/serviceCatalogue.ts`, `utils/serviceCatalogue.ts`, `services/serviceCatalogue.ts` | tenant catalogue, source defaults, validation, versioned writes and invoice snapshots | current/local |
| `SOT:SERVICE_CATALOGUE_UI` | `components/finance/ServiceCataloguePanel.tsx`, `ServiceInvoiceModal.tsx`, `service-catalogue.css` | catalogue CRUD/search and rapid service invoicing | current/local |
| `SOT:FINANCE_DOCUMENTS` | `types/finance.ts`, `services/financeDocuments.ts`, `components/finance/FinanceDocumentsPanel.tsx` | existing immutable UI ledger, shared numbering, normalization, credits and register | current/protected |
| `SOT:FINANCE_PRINT_EXPORT` | `utils/financeDocumentGenerator.ts`, `utils/accountingExport.ts` | snapshot print/PDF and existing accounting exports | current/protected |
