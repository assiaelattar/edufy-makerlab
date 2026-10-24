# Public workshop booking repair — 2026-10-24

## Failure addressed

The public booking flow previously created a slot, created a booking, and incremented capacity in three separate writes. A retry could duplicate a booking or leave capacity out of sync. Browser translation could also rewrite React-managed markup after submission, producing the observed `NotFoundError` error boundary.

## Implementation

- `services/publicWorkshopBooking.ts` creates or updates the slot and creates the booking in one Firestore transaction.
- A stable random booking document ID is retained for the browser attempt. The slot stores `lastBookingId`, allowing an uncertain retry to finish as a no-op without exposing booking documents to public reads.
- Deterministic virtual-slot IDs prevent simultaneous first bookings from creating duplicate session documents.
- Firestore rules require the booking and slot increment to reference each other in the same atomic write, enforce tenant/template identity, and cap `bookedCount` at capacity.
- The public route declares French before React starts and marks the document and booking root `translate=no` / `notranslate`. All remaining visible English fallback text was translated.
- Full, unavailable, network, and retry outcomes have French feedback.

## Verification

- Firestore emulator passed atomic first booking, same-attempt retry with one booking and one increment, second booking, full-session denial, and cross-organization/template denial.
- Root production build and whitespace checks passed.
- The build retains the existing Firebase mixed-import and large-chunk warnings.

Production acceptance after release must confirm the published phone link, one booking/count increment, full-session message, and browser translation behavior.
