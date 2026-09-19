# Admissions Known Issues

| Issue | Impact | Target |
|---|---|---|
| Admission Officer has Admissions view/note/whatsapp permissions but still lacks Marketing permissions used by the legacy CRM | new commands are ready, while legacy CRM operation remains role-limited | compatibility period |
| WhatsApp history shows the latest 30 activities | full history needs pagination; current consent is stored separately and remains authoritative | Phase 8 |
| Export imports remain legacy timeline notes | no structured sender identity, delivery or read evidence is inferred | Phase 8 |
| Owner/due-date task commands are still closed | recording a parent response does not schedule a reminder or advance a lifecycle stage | next workflow command slice |
| Official provider is not connected | sent state is an operator assertion; automatic inbound sync and delivery/read receipts are unavailable | optional Phase 7 |
| Firestore lead writes still use broad elevated-role tenant rules | new Admissions activity writes are hardened, but legacy lead mutation remains a separate boundary | Phase 4/8 |
| Existing public/legacy bookings can lack stable case links | they remain unlinked or phone-only repair candidates; no automatic merge is allowed | Phase 8 migration/reconciliation |
| Legacy enrollment prepares the student and optional access accounts before the final enrollment batch | a failed final batch can leave an unlinked prepared learner/account requiring review before retry | Phase 8 transaction hardening |
| `closed` and `interested` are ambiguous | now visible as repair flags, but still need structured classification | Phase 3/8 |
| Internal Upsell leads can represent existing learner growth rather than new-family admission | remains visible and filterable, but still distorts family-acquisition reporting | Phase 8 |
| Dashboard counts `closed` as conversion | conversion KPI remains misleading outside Admissions | Phase 8 |
| Embedded lead timeline is unbounded/unqueryable | scale and workflow limitations | Phase 3 |
| Global AppContext loads all tenant leads | Phase 2 UI is complete, but future scale still needs query pagination | Phase 8 |
| Admissions indexes exist, but the read-only UI still projects globally loaded leads | indexed workflow queries are not wired yet | Phase 8 |
| Focused application and emulator rule suites exist, but there is no repository-wide clean test suite | broader regression coverage remains limited by legacy baseline | grow incrementally |
| Repository-wide TypeScript check fails on legacy modules | cannot use global typecheck as clean gate | baseline; focused checks required |
| Education UI is development-only and awaiting approval | new module cannot be called production-ready | Phase 3+ approval gate |

## Baseline warnings

- Production build passes with Firebase import and large bundle warnings.
- Auth + Firestore emulator validation passed for notes and every Phase 6 WhatsApp state, including a direct valid batch and denial of forged actor/delivery/consent, opt-out bypass, inactive account, immutable updates and tenant crossing. An initial expression-limit failure was corrected by simplifying Admissions role/tenant checks and reusing atomic activity reads.
- Phase 6 browser QA uses the real component/domain/command with mocked external boundaries; desktop/mobile screenshots were inspected. A live authenticated production-write test was not performed.
- Repository-wide TypeScript still reports pre-existing diagnostics in Workshop helpers and Vite environment typing; focused Admissions TypeScript and the production build pass.
- The worktree contains extensive unrelated edits and `.env`; all are protected.
- Authenticated preview QA still logs the existing Firestore snapshot-listener permission error; this phase did not change queries or rules.
