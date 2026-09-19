import type { Enrollment, Program } from '../types';
import { resolveProgramPackStandardPrice } from './programPackPricing';

export interface EnrollmentFinancialSummary {
  agreedAmount: number;
  listAmount: number;
  discountAmount: number;
  discountPercent: number;
}

const positiveAmount = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

/**
 * Resolves the family-facing price breakdown without changing the ledger.
 * New enrollments carry discountAmount/offerSnapshot; older records can still
 * be reconstructed from their program pack and agreed total.
 */
export const getEnrollmentFinancialSummary = (
  enrollment: Enrollment,
  programs: Program[] = []
): EnrollmentFinancialSummary => {
  const agreedAmount = Math.max(0, Number(enrollment.totalAmount) || 0);
  const storedDiscount = Math.max(
    positiveAmount(enrollment.discountAmount),
    positiveAmount(enrollment.offerSnapshot?.discountAmount)
  );
  const program = programs.find(item => item.id === enrollment.programId);
  const pack = program?.packs?.find(item => item.name === enrollment.packName);
  const packListAmount = pack ? positiveAmount(resolveProgramPackStandardPrice(pack)?.amount) : 0;
  const quotedListAmount = positiveAmount(enrollment.offerSnapshot?.standardAmount);
  // A legacy enrollment with a zero agreed amount and no stored offer is not
  // automatically a 100% discount. Only use the current pack catalogue as a
  // fallback when the enrollment carries an actual negotiated amount.
  const inferredPackListAmount = agreedAmount > 0 ? packListAmount : 0;
  const listAmount = Math.max(agreedAmount + storedDiscount, quotedListAmount, inferredPackListAmount);
  const discountAmount = Math.max(storedDiscount, listAmount - agreedAmount);
  const discountPercent = listAmount > 0 ? Math.round((discountAmount / listAmount) * 10000) / 100 : 0;

  return { agreedAmount, listAmount, discountAmount, discountPercent };
};
