/**
 * OTP / verification code detection and display from SMS text.
 */

const CODE_PATTERNS: RegExp[] = [
  /(?:код|code|пароль|password|pin|пин)[:\s]+(\d{4,8})/i,
  /\b([A-Z]{1,3}-\d{4,8})\b/,
  /(?:^|\s|:\s?)(\d{4,8})(?:\s|$|\.|\,)/,
];

/** Check if a message text likely contains a verification/OTP code. */
export function hasCode(text: string): boolean {
  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

/** Return the verification code from message text, or null. */
export function extractCode(text: string): string | null {
  for (const pattern of CODE_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

/** Split message text into { before, code, after } for highlighted rendering. */
export function formatCodeSegments(
  text: string,
): { before: string; code: string; after: string } | null {
  for (const pattern of CODE_PATTERNS) {
    const match = pattern.exec(text);
    if (match?.[1]) {
      const fullMatch = match[0];
      const idx = text.indexOf(fullMatch);
      const codeStart = text.indexOf(match[1], idx);
      return {
        before: text.slice(0, codeStart),
        code: match[1],
        after: text.slice(codeStart + match[1].length),
      };
    }
  }
  return null;
}
