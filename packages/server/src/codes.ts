/** Letters and digits that can't be confused when read aloud or typed (no I, L, O, 0, 1). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;
export const REJOIN_SECRET_LENGTH = 6;

export type RandomBytes = (n: number) => Uint8Array;

export const cryptoBytes: RandomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

export function randomCode(length: number, bytes: RandomBytes = cryptoBytes): string {
  // 256 % 31 != 0, so reject bytes past the last full multiple to keep letters uniform.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = "";
  while (out.length < length) {
    for (const b of bytes(length * 2)) {
      if (b < limit && out.length < length) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    }
  }
  return out;
}

export function randomToken(bytes: RandomBytes = cryptoBytes): string {
  return [...bytes(24)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Upper-cases and strips spaces and dashes, so "k7pm 2q" and "K7PM2Q" match. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function isJoinCode(code: string): boolean {
  return code.length === JOIN_CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c));
}

/** A rejoin code is the match's join code followed by the seat's secret, shown as "K7PM2Q-W3XRT9". */
export function formatRejoinCode(joinCode: string, secret: string): string {
  return `${joinCode}-${secret}`;
}

export function parseRejoinCode(input: string): { code: string; secret: string } | null {
  const c = normalizeCode(input);
  if (c.length !== JOIN_CODE_LENGTH + REJOIN_SECRET_LENGTH) return null;
  const code = c.slice(0, JOIN_CODE_LENGTH);
  const secret = c.slice(JOIN_CODE_LENGTH);
  if (!isJoinCode(code) || ![...secret].every((ch) => CODE_ALPHABET.includes(ch))) return null;
  return { code, secret };
}
