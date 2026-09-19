import type {
  AdmissionOfferSnapshot,
  Enrollment,
  Payment,
  PaymentPromise,
  Program,
} from '../../../types';
import { getProgramPackPriceCatalog, resolveProgramPackStandardPrice } from '../../../utils/programPackPricing.ts';

export interface AdmissionOriginLink {
  organizationId: string;
  admissionCaseId: string;
  sourceLeadId: string;
}

export interface BuildAdmissionOfferInput {
  origin: AdmissionOriginLink;
  program: Program;
  packName: string;
  paymentPlan: Enrollment['paymentPlan'];
  agreedAmount: number;
  quotedAt: string;
}

export interface AdmissionFinanceFacts {
  promisedAmount: number;
  proofReceivedAmount: number;
  awaitingVerificationAmount: number;
  clearedAmount: number;
  checkInProgressAmount: number;
  rejectedAmount: number;
}

const CLEARED_PAYMENT_STATUSES = new Set(['paid', 'verified']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const normalizeAdmissionPaymentPlan = (
  value: string | null | undefined,
): Enrollment['paymentPlan'] => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('month') || normalized.includes('mois')) return 'monthly';
  if (normalized.includes('trimester') || normalized.includes('trimestr')) return 'trimester';
  if (normalized.includes('semester') || normalized.includes('semestr')) return 'semestre';
  if (normalized.includes('annual') || normalized.includes('annuel') || normalized.includes('year')) return 'annual';
  return 'full';
};

const requireSafeId = (value: string, label: string) => {
  if (!SAFE_ID.test(value)) throw new Error(`${label} must be a safe document ID.`);
};

export const buildAdmissionOfferSnapshot = ({
  origin,
  program,
  packName,
  paymentPlan,
  agreedAmount,
  quotedAt,
}: BuildAdmissionOfferInput): AdmissionOfferSnapshot => {
  requireSafeId(origin.admissionCaseId, 'Admission case ID');
  requireSafeId(origin.sourceLeadId, 'Source lead ID');
  if (!origin.organizationId || program.organizationId !== origin.organizationId) {
    throw new Error('The offer and program must belong to the same organization.');
  }
  if (program.status !== 'active') throw new Error('The selected program is not active.');

  const pack = program.packs.find(candidate => candidate.name === packName);
  if (!pack) throw new Error('The selected pricing pack does not exist on the program.');

  const standardPrice = resolveProgramPackStandardPrice(pack);
  if (!standardPrice) throw new Error('The selected pricing pack has no valid canonical price.');
  if (!Number.isFinite(agreedAmount) || agreedAmount <= 0) throw new Error('The agreed amount must be greater than zero.');
  if (Number.isNaN(new Date(quotedAt).getTime())) throw new Error('The offer timestamp is invalid.');

  return {
    version: 1,
    organizationId: origin.organizationId,
    admissionCaseId: origin.admissionCaseId,
    sourceLeadId: origin.sourceLeadId,
    programId: program.id,
    programName: program.name,
    packName: pack.name,
    paymentPlan,
    pricingSource: 'program_pack',
    standardPriceField: standardPrice.field,
    priceCatalog: getProgramPackPriceCatalog(pack),
    standardAmount: standardPrice.amount,
    agreedAmount,
    discountAmount: Math.max(0, standardPrice.amount - agreedAmount),
    currency: 'MAD',
    quotedAt,
  };
};

type FinancePaymentEvidence = Pick<Payment, 'amount' | 'method' | 'status' | 'proofUrl'>;

/**
 * Reports independent financial facts. A promise or uploaded proof never
 * contributes to clearedAmount; only Finance-owned paid/verified statuses do.
 */
export const summarizeAdmissionFinanceFacts = (
  payments: ReadonlyArray<FinancePaymentEvidence>,
  promises: ReadonlyArray<PaymentPromise> = [],
): AdmissionFinanceFacts => payments.reduce<AdmissionFinanceFacts>((facts, payment) => {
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) return facts;

  if (payment.method === 'virement' && String(payment.proofUrl || '').trim()) facts.proofReceivedAmount += amount;
  if (payment.status === 'pending_verification') facts.awaitingVerificationAmount += amount;
  if (CLEARED_PAYMENT_STATUSES.has(payment.status)) facts.clearedAmount += amount;
  if (payment.status === 'check_received' || payment.status === 'check_deposited') facts.checkInProgressAmount += amount;
  if (payment.status === 'check_bounced') facts.rejectedAmount += amount;
  return facts;
}, {
  promisedAmount: promises.reduce((sum, promise) => {
    const amount = Number(promise.amount);
    return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
  }, 0),
  proofReceivedAmount: 0,
  awaitingVerificationAmount: 0,
  clearedAmount: 0,
  checkInProgressAmount: 0,
  rejectedAmount: 0,
});
