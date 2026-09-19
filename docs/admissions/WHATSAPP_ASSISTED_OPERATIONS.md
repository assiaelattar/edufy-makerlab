# WhatsApp-assisted Admissions operations

## Operator flow

In the development Education UI (`?ui=education-v1`), open Students → Admissions → a family passport → WhatsApp assistant.

1. Record the parent's consent or opt-out.
2. Select a template from the existing tenant Communications library or a starter, resolve missing variables, and preview the message and destination number.
3. Record preparation or open WhatsApp. Edufy checks current consent before navigating to the prepared conversation.
4. On return, explicitly record “I sent it” or “Not sent”.
5. Record the parent's response and a structured outcome.

The activity history distinguishes all six operations. Opening WhatsApp is evidence of a browser handoff only. The explicit sent confirmation is an operator assertion. Delivery and read receipts require an official provider and are absent here.

## Ownership and persistence

- Templates remain in `organizations/{organizationId}/settings/communications`; Admissions reuses that library without creating another editor or data store.
- Names missing from the legacy record remain unresolved template variables. Display labels such as “Parent name missing” and interest tags are not substituted as contact/program facts.
- Phone formatting reuses the existing Moroccan default country-code policy, extracted unchanged to `utils/whatsappPhone.ts` and re-exported by `utils/helpers.ts`. The destination is displayed before opening; it never establishes case identity.
- `recordAdmissionWhatsAppActivity` validates the actor, tenant, expected version, safe IDs, event, consent, body, template reference, and outcome. The command ID and fingerprint support idempotent replay.
- One transaction writes an immutable `admission_activities` document and advances `admission_case_states`. Only a `consent_updated` activity can change `whatsappConsentState`.
- Current consent is loaded from workflow state, independently of the latest 30 displayed activities. A non-consent activity must agree with persisted consent. An outdated version/consent is rejected.
- Firestore independently checks active account, approved role, tenant, authenticated actor, reciprocal activity/state writes, and allowed fields. Tasks remain closed.
- Booking status, Finance clearance, enrollment, and lifecycle stages are unchanged by these operations.

## Compatibility and limitations

The Marketing CRM and WhatsApp export importer remain available. Exported messages remain legacy notes, never provider delivery or read evidence. Workshop reminders retain preparation timestamps. Finance button labels explicitly describe opening WhatsApp.

The assistant is a development preview. Local rules must pass security verification and later be released through the approved release workflow before the new writes can be used against a deployed environment. No provider, account connection, webhook, automatic sending, or production data migration is included.

History displays a recent window; full pagination and structured import migration remain hardening work. A response records what happened but does not create a scheduled task. Owner/due-date task commands are still closed.

## Verification

- Domain and command smoke tests cover missing variables, tenant checks, consent, replay, stale state, and opt-out.
- `admissionRules.emulator.ts` exercises real Auth/Firestore rules with a demo-only project, including direct client attempts to forge consent, delivery, actor, and state.
- `admissionWhatsApp.browser.smoke.mjs` bundles the actual UI/domain/command with mocked authentication/persistence/WhatsApp boundaries. It verifies preview, consent, launch/result separation, parent response, popup blocking, concurrent opt-out, keyboard focus and desktop/mobile overflow. It sends no messages and reads/writes no production data.
- Browser QA accepts `ADMISSIONS_PLAYWRIGHT_PATH` for an existing Playwright module and optional `ADMISSIONS_QA_SCREENSHOTS` for screenshots.
- Focused TypeScript and the production build are the code gates. Existing global TypeScript errors are tracked separately.
