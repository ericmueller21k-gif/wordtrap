import type { PlayerView } from "@wordtrap/engine";
import { Header } from "../components/Header.tsx";

interface WaitingProps {
  view: PlayerView;
  /** Invite link to share, while the friend hasn't joined. */
  inviteUrl?: string;
  joinCode?: string;
  onHome: () => void;
}

export function WaitingScreen({ view, inviteUrl, joinCode, onHome }: WaitingProps) {
  const opponent = view.opponentName;
  const round = view.stage.kind === "finished" ? view.roundsTotal - 1 : view.stage.round;
  const title =
    view.stage.kind === "waitingForGuesses"
      ? `Waiting for ${opponent} to finish guessing.`
      : opponent
        ? `Word locked in. Waiting for ${opponent}.`
        : "Word locked in. Waiting for your friend to join.";

  const share = async () => {
    if (!inviteUrl) return;
    const text = `Play Word Trap with me! Join code ${joinCode}`;
    try {
      if (navigator.share) await navigator.share({ title: "Word Trap", text, url: inviteUrl });
      else await navigator.clipboard.writeText(`${text}: ${inviteUrl}`);
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <div class="screen game-screen">
      <Header
        round={round}
        roundsTotal={view.roundsTotal}
        myName={view.myName}
        opponentName={opponent ?? "Friend"}
        totals={view.totals}
        onHome={onHome}
      />
      <main class="game-main waiting">
        <div class="waiting-spinner" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h1 class="waiting-title">{title}</h1>
        <p class="muted">You can close the app. Open it again later to see whose turn it is.</p>
        {inviteUrl && (
          <div class="invite">
            <div class="invite-code-label muted">Join code</div>
            <div class="invite-code">{joinCode}</div>
            <button type="button" class="btn btn-primary btn-wide" onClick={share}>
              Share invite link
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
