interface HeaderProps {
  round: number;
  roundsTotal: number;
  myName: string;
  opponentName: string;
  totals: [number, number];
  onHome: () => void;
}

export function Header({ round, roundsTotal, myName, opponentName, totals, onHome }: HeaderProps) {
  return (
    <header class="game-header">
      <button type="button" class="icon-button" onClick={onHome} aria-label="Home">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <div class="header-round">
        Round {round + 1}
        <span class="muted"> of {roundsTotal}</span>
      </div>
      <div class="header-score" aria-label={`${myName} ${totals[0]}, ${opponentName} ${totals[1]}`}>
        <span class="score-me">{totals[0]}</span>
        <span class="muted">–</span>
        <span>{totals[1]}</span>
      </div>
    </header>
  );
}
