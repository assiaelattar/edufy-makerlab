// Shared formatting policy extracted unchanged from helpers.ts.
export const normalizePhoneForWhatsApp = (
  phone: string | undefined | null,
  defaultCountryCode = '212'
): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`;
  if (digits.length === 9) return `${defaultCountryCode}${digits}`;
  return digits;
};
