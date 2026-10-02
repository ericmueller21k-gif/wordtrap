import { useState } from "preact/hooks";
import type { PlayerView } from "@wordtrap/engine";
import { BackIcon } from "./BackIcon.tsx";
import { ScoreSheet } from "./ScoreSheet.tsx";

interface HeaderProps {
  round: number;
  view: PlayerView;
  onHome: () => void;
}

export function Header({ round, view, onHome }: HeaderProps) {
  const [showScores, setShowScores] = useState(false);
  const opponent = view.opponentName ?? "Friend";
  const [mine, theirs] = view.totals;
  return (
    <header class="game-header">
      <button type="button" class="icon-button" onClick={onHome} aria-label="Home">
        <BackIcon />
      </button>
      <div class="header-round">
        Round {round + 1}
        <span class="muted"> of {view.roundsTotal}</span>
      </div>
      <button
        type="button"
        class="header-score"
        onClick={() => setShowScores(true)}
        aria-label={`Scores: ${view.myName} ${mine}, ${opponent} ${theirs}`}
      >
        <span class="header-score-names muted">
          You · {opponent.length > 8 ? opponent.slice(0, 7) + "…" : opponent}
        </span>
        <span class="header-score-nums">
          <span class="score-me">{mine}</span>
          <span class="muted">–</span>
          <span>{theirs}</span>
        </span>
      </button>
      {showScores && <ScoreSheet view={view} onClose={() => setShowScores(false)} />}
    </header>
  );
}
