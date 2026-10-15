# Tenant provisioning repair — 2026-10-15

## Changelog

The SaaS form previously wrote `subscription: undefined` and `limits: undefined` when no plan was selected. Firestore rejected the first `setDoc` and displayed the user's error. Custom access now omits both fields and requires at least one selected module. A selected plan persists its subscription and limits if present. Slugs are normalized and checked against existing organizations before account creation.

The organization and admin profile now commit in one Firestore batch with the admin UID as `ownerUid`. If that commit fails, the newly created Firebase Auth user is deleted when possible. The form labels the created user as an admin, matching its stored role.

## Decisions

- Keep no-plan access as an explicit custom option; do not fabricate a price, trial, or billing period.
- Use the current production organization/user permissions and Firestore batch. No rules, index, API, or production data changes are part of this repair.
- Keep the broader multi-tenant candidate isolated until its coordinated release gates pass.

## Known issues and acceptance

- Firebase Auth and Firestore cannot form one server-side transaction from this browser flow. A network failure after the Firestore server commits but before the client receives confirmation can require staff reconciliation. A trusted provisioning service is the durable SaaS solution.
- A slug read before account creation prevents known duplicates but is not an atomic uniqueness guarantee under simultaneous requests.
- Custom module selection does not yet validate dependencies, plan limits, or payment status. The separate multi-tenant release still requires legacy ownership review, public catalog and workshop projection checks, compatible rules/index rollout, and live two-organization isolation tests.
- No real organization or sign-in account is created merely to test this patch. Live acceptance requires an authorized operator to create a designated tenant and confirm its admin can sign in and use its selected modules.
