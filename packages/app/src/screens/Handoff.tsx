interface HandoffProps {
  to: string;
  from: string | null;
  onReady: () => void;
  onHome: () => void;
}

/** Pass-the-phone privacy screen, so nobody sees the other player's word. */
export function HandoffScreen({ to, from, onReady, onHome }: HandoffProps) {
  return (
    <div class="screen handoff">
      <button type="button" class="icon-button handoff-home" onClick={onHome} aria-label="Home">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="handoff-body">
        <div class="handoff-icon" aria-hidden="true">
          📱
        </div>
        <h1 class="handoff-title">Pass the phone to {to}</h1>
        {from && <p class="muted">{from}, no peeking.</p>}
      </div>
      <div class="handoff-footer">
        <button type="button" class="btn btn-primary btn-wide btn-tall" onClick={onReady}>
          I'm {to}. Show my turn
        </button>
      </div>
    </div>
  );
}
