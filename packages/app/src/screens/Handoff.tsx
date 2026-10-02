import { BackIcon } from "../components/BackIcon.tsx";
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
        <BackIcon />
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
