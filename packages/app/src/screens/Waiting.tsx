import type { PlayerView } from "@wordtrap/engine";
import { Header } from "../components/Header.tsx";
import { shareInvite } from "./Invite.tsx";

interface WaitingProps {
  view: PlayerView;
  /** Invite link to share, while the friend hasn't joined. */
  inviteUrl?: string;
  joinCode?: string;
  /** This player's personal code for getting back in from another device. */
  rejoinCode?: string;
  onHome: () => void;
}

export function WaitingScreen({ view, inviteUrl, joinCode, rejoinCode, onHome }: WaitingProps) {
  const opponent = view.opponentName;
  const round = view.stage.kind === "finished" ? view.roundsTotal - 1 : view.stage.round;
  const title =
    view.stage.kind === "waitingForGuesses"
      ? `Waiting for ${opponent} to finish guessing.`
      : opponent
        ? `Word locked in. Waiting for ${opponent}.`
        : "Word locked in. Waiting for your friend to join.";

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
            <button type="button" class="btn btn-primary btn-wide" onClick={() => shareInvite(joinCode ?? "", inviteUrl)}>
              Share invite link
            </button>
          </div>
        )}
        {rejoinCode && (
          <p class="rejoin muted small">
            Your rejoin code: <strong class="rejoin-code">{rejoinCode}</strong>
            <br />
            Use it to get back into this game on another device or from the home-screen app.
          </p>
        )}
      </main>
    </div>
  );
}
