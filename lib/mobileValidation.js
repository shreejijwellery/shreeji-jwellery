/**
 * Normalize Indian mobile to 10 digits (no leading 0 or 91).
 * Returns null if invalid (wrong length or doesn't start with 6-9).
 */
export function normalizeIndianMobile(value) {
  if (value == null || typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  let ten = digits;
  if (digits.length === 11 && digits.startsWith('0')) ten = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91')) ten = digits.slice(2);
  else if (digits.length !== 10) return null;
  if (ten.length !== 10 || !/^[6-9]/.test(ten)) return null;
  return ten;
}

/** Validate format: 10 digits, starting with 6-9 (after optional 0/91). */
export function isValidIndianMobile(value) {
  return normalizeIndianMobile(value) !== null;
}
