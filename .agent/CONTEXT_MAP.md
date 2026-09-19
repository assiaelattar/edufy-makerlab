# Context Map

| Work | Read |
|---|---|
| Phase 0 evidence | `docs/admissions/PHASE_0_AUDIT.md` |
| Phased roadmap | `docs/admissions/IMPLEMENTATION_PLAN.md` |
| Education UI direction | `docs/admissions/DESIGN_DIRECTION.md`, `ATLAS_DESIGN_SYSTEM.md`, `EDUCATION_UI_SYSTEM_MAP.md` |
| Domain decisions | `docs/admissions/DECISIONS.md` |
| Risks | `docs/admissions/KNOWN_ISSUES.md` |
| History | `docs/admissions/CHANGELOG.md`, `.agent/LAST_HANDOFF.md` |
| Current lead/booking types | `types/index.ts` |
| Current CRM | `views/MarketingView.tsx`, `views/marketing/*` |
| Students preview | `views/StudentsView.tsx`, `views/students/EducationStudentsOperationsV1.tsx` |
| Workshop integration | `views/WorkshopsView.tsx`, `views/dashboard/WorkshopActionCenter.tsx` |
| Enrollment integration | `App.tsx`, `views/PublicEnrollmentView.tsx` |
| StemQuest membership and attendance | `docs/programs/STEMQUEST_MEMBERSHIP_ATTENDANCE.md`, `utils/membershipLifecycle.ts`, `utils/programLifecycle.ts`, `views/AbsenceView.tsx`, `components/programs/ProgramSetupWizard.tsx` |
| Offer/Finance/enrollment contract | `docs/admissions/OFFER_FINANCE_ENROLLMENT.md`, `modules/admissions/domain/admissionOffer.ts`, `utils/programPackPricing.ts` |
| Authorization/data | `context/AuthContext.tsx`, `context/AppContext.tsx`, `firestore.rules`, `firestore.indexes.json` |
| WhatsApp assistant | `docs/admissions/WHATSAPP_ASSISTED_OPERATIONS.md`, `modules/admissions/ui/EducationAdmissionsWhatsAppAssistant.tsx`, `views/CommunicationsView.tsx` |


## Finance service catalogue

Read `components/finance/AGENT_CONTEXT.md`, `docs/finance/SERVICE_CATALOGUE_PHASE_1.md`, `docs/finance/DECISIONS.md`, `docs/finance/KNOWN_ISSUES.md`, and `docs/finance/CHANGELOG.md` for service work. Tests are `components/finance/serviceCatalogue.{smoke.ts,emulator.ts,browser.smoke.mjs}`; local bundle runner is `scripts/test-service-catalogue.mjs`.
