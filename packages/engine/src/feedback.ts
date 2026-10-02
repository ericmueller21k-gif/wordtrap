/**
 * Marks each slot of the guess whose letter matches the secret in that slot.
 * There is deliberately no "right letter, wrong slot" feedback.
 */
export function guessFeedback(secret: string, guess: string): boolean[] {
  if (secret.length !== guess.length) {
    throw new Error("Guess and secret must be the same length");
  }
  return Array.from(guess, (ch, i) => ch === secret[i]);
}

export function isCatch(secret: string, guess: string): boolean {
  return secret === guess;
}
