import assert from 'node:assert/strict';
import type { Program } from '../../../types';
import {
  buildAdmissionOfferSnapshot,
  normalizeAdmissionPaymentPlan,
  summarizeAdmissionFinanceFacts,
} from './admissionOffer.ts';
import { getProgramPackPriceCatalog, resolveProgramPackStandardPrice } from '../../../utils/programPackPricing.ts';

const program: Program = {
  id: 'program-1',
  organizationId: 'org-1',
  name: 'Robotics Lab',
  type: 'Regular Program',
  description: 'Build and code robots.',
  status: 'active',
  packs: [{ name: 'Explorer', priceAnnual: 4_800, priceTrimester: 1_800, promoPrice: 4_200 }],
  grades: [],
};
const origin = { organizationId: 'org-1', admissionCaseId: 'lead-1', sourceLeadId: 'lead-1' };
const makeOffer = (overrides: Partial<Parameters<typeof buildAdmissionOfferSnapshot>[0]> = {}) => buildAdmissionOfferSnapshot({
  origin,
  program,
  packName: 'Explorer',
  paymentPlan: 'full',
  agreedAmount: 4_500,
  quotedAt: '2026-09-09T10:00:00.000Z',
  ...overrides,
});

const catalog = getProgramPackPriceCatalog(program.packs[0]);
assert.deepEqual(catalog, { priceAnnual: 4_800, priceTrimester: 1_800, price: null, promoPrice: 4_200 });
assert.deepEqual(resolveProgramPackStandardPrice(program.packs[0]), { field: 'priceAnnual', amount: 4_800 });
assert.equal(resolveProgramPackStandardPrice({ name: 'Empty' }), null);
assert.equal(normalizeAdmissionPaymentPlan('month'), 'monthly');
assert.equal(normalizeAdmissionPaymentPlan('Paiement trimestriel'), 'trimester');
assert.equal(normalizeAdmissionPaymentPlan('Annual plan'), 'annual');
assert.equal(normalizeAdmissionPaymentPlan('unknown'), 'full');

const offer = makeOffer();
assert.equal(offer.admissionCaseId, 'lead-1');
assert.equal(offer.sourceLeadId, 'lead-1');
assert.equal(offer.programId, 'program-1');
assert.equal(offer.packName, 'Explorer');
assert.equal(offer.paymentPlan, 'full');
assert.equal(offer.standardAmount, 4_800);
assert.equal(offer.agreedAmount, 4_500);
assert.equal(offer.discountAmount, 300);
assert.equal(offer.pricingSource, 'program_pack');
assert.equal('paymentStatus' in offer, false, 'an offer must not claim a payment state');
assert.equal(makeOffer({ agreedAmount: 5_000 }).discountAmount, 0, 'a higher agreement must not create a negative discount');

assert.throws(() => makeOffer({ origin: { ...origin, organizationId: 'org-2' } }), /same organization/);
assert.throws(() => makeOffer({ program: { ...program, status: 'archived' } }), /not active/);
assert.throws(() => makeOffer({ packName: 'Missing' }), /does not exist/);
assert.throws(() => makeOffer({ agreedAmount: 0 }), /greater than zero/);
assert.throws(() => makeOffer({ quotedAt: 'not-a-date' }), /timestamp is invalid/);
assert.throws(() => makeOffer({ origin: { ...origin, admissionCaseId: 'lead/1' } }), /safe document ID/);

const promisesOnly = summarizeAdmissionFinanceFacts([], [{ month: '2026-10', amount: 1_000 }]);
assert.equal(promisesOnly.promisedAmount, 1_000);
assert.equal(promisesOnly.clearedAmount, 0, 'a promise is not cleared money');

const pendingTransfer = summarizeAdmissionFinanceFacts([{
  amount: 1_200,
  method: 'virement',
  status: 'pending_verification',
  proofUrl: 'data:image/png;base64,proof',
}]);
assert.equal(pendingTransfer.proofReceivedAmount, 1_200);
assert.equal(pendingTransfer.awaitingVerificationAmount, 1_200);
assert.equal(pendingTransfer.clearedAmount, 0, 'proof must not clear a transfer');

const clearedTransfer = summarizeAdmissionFinanceFacts([{
  amount: 1_200,
  method: 'virement',
  status: 'verified',
  proofUrl: 'data:image/png;base64,proof',
}]);
assert.equal(clearedTransfer.proofReceivedAmount, 1_200);
assert.equal(clearedTransfer.awaitingVerificationAmount, 0);
assert.equal(clearedTransfer.clearedAmount, 1_200);

const checks = summarizeAdmissionFinanceFacts([
  { amount: 500, method: 'check', status: 'check_received' },
  { amount: 300, method: 'check', status: 'check_deposited' },
  { amount: 200, method: 'check', status: 'check_bounced' },
  { amount: 400, method: 'cash', status: 'paid' },
  { amount: -1, method: 'cash', status: 'paid' },
]);
assert.equal(checks.checkInProgressAmount, 800);
assert.equal(checks.rejectedAmount, 200);
assert.equal(checks.clearedAmount, 400);

console.log('Admissions offer and Finance fact smoke checks passed (28 safeguards).');
