/**
 * Pure function: extracts OTP/verification codes from SMS body text.
 *
 * Pipeline order matters — more specific patterns are checked first
 * (keyword-based), then the generic standalone-digit pattern as a fallback.
 */

// Keyword patterns: "код: 1234", "code: 1234", "your code is 1234", etc.
const KEYWORD_PATTERNS: RegExp[] = [
  // Russian patterns
  /(?:код|code|пароль|pin|пин)[:\s—–-]+(\d{4,8})/i,
  /(?:код подтверждения|код авторизации|код доступа|код верификации)[:\s—–-]+(\d{4,8})/i,
  /(?:ваш код|ваш пароль|ваш pin)[:\s—–-]+(\d{4,8})/i,
  // English patterns
  /(?:your (?:verification )?code is|your (?:one[- ]?time )?code is)[:\s]+(\d{4,8})/i,
  /(?:verification code|confirmation code|security code|login code)[:\s—–-]+(\d{4,8})/i,
  /(?:one[- ]?time (?:password|code|pin))[:\s—–-]+(\d{4,8})/i,
  /(?:OTP)[:\s—–-]+(\d{4,8})/i,
  // "Use XXXX to verify" or "enter XXXX" patterns
  /(?:use|enter|введите|используйте)\s+(\d{4,8})\b/i,
  // "XXXX is your code" pattern
  /\b(\d{4,8})\s+(?:is your|—\s*ваш|это ваш)\s+(?:code|код|пароль|pin)/i,
];

// Fallback: standalone 4-8 digit sequence surrounded by non-digit boundaries
const STANDALONE_DIGIT_PATTERN = /(?:^|[^\d])(\d{4,8})(?:[^\d]|$)/;

/**
 * Extracts an OTP or verification code from SMS body text.
 *
 * @param body - The SMS message body
 * @returns The extracted code string, or null if no code was found
 */
export function extractCode(body: string): string | null {
  if (!body || body.trim().length === 0) {
    return null;
  }

  // Try keyword-based patterns first (highest confidence)
  for (const pattern of KEYWORD_PATTERNS) {
    const match = body.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  // Fallback: standalone digit sequence (only if the message is short enough
  // to likely be an OTP message — skip long messages with random numbers)
  if (body.length <= 200) {
    const match = body.match(STANDALONE_DIGIT_PATTERN);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}
