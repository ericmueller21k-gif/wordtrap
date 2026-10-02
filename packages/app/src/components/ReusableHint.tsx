/** One line explaining the round's reusable letter. */
export function ReusableHint({ letter }: { letter: string | null }) {
  if (!letter) return null;
  return (
    <div class="reusable-hint">
      <span class="reusable-badge-inline">∞</span> <strong>{letter}</strong> can be used as many times as you like this round
    </div>
  );
}
