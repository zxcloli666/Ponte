/**
 * Phone number formatting and normalization utilities.
 */

/** Remove all non-digit characters except leading + */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("8") && cleaned.length === 11) {
    return `+7${cleaned.slice(1)}`;
  }
  return `+${cleaned}`;
}

/** Format phone number for display: +7 999 123-45-67 */
export function formatPhoneNumber(phone: string): string {
  const normalized = normalizePhone(phone);

  // Russian numbers
  if (normalized.startsWith("+7") && normalized.length === 12) {
    const digits = normalized.slice(2);
    return `+7 ${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }

  // US numbers
  if (normalized.startsWith("+1") && normalized.length === 12) {
    const digits = normalized.slice(2);
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Generic: just add spaces every 3 digits after country code
  return normalized;
}

/** Get initials from a phone number (last 2 digits) */
export function phoneInitials(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-2);
}

/** Check if two phone numbers are the same (normalized comparison) */
export function isSamePhone(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}
