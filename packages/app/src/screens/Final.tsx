import type { PlayerView } from "@wordtrap/engine";

interface FinalProps {
  view: PlayerView;
  /** In pass-the-phone mode both names are shown; online, "You". */
  local: boolean;
  onRematch: () => void;
  onHome: () => void;
  rematchLabel?: string;
}

export function FinalScreen({ view, local, onRematch, onHome, rematchLabel = "Rematch" }: FinalProps) {
  const opponent = view.opponentName ?? "Friend";
  const [mine, theirs] = view.totals;
  const headline =
    mine === theirs ? "It's a tie!" : local ? `${mine > theirs ? view.myName : opponent} wins!` : mine > theirs ? "You win!" : `${opponent} wins`;
  return (
    <div class="screen game-screen">
      <main class="game-main final">
        <div class="final-trophy" aria-hidden="true">
          {mine === theirs ? "🤝" : "🏆"}
        </div>
        <h1 class="final-title">{headline}</h1>
        <div class="final-score">
          {mine} – {theirs}
        </div>
        <table class="final-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>{view.myName}</th>
              <th>{opponent}</th>
            </tr>
          </thead>
          <tbody>
            {view.rounds.map((r) => (
              <tr key={r.index}>
                <td class="muted">{r.index + 1}</td>
                <td>
                  <span class="final-word">{r.myWord}</span> {r.result?.scores[0]}
                </td>
                <td>
                  <span class="final-word">{r.opponentWord}</span> {r.result?.scores[1]}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{mine}</td>
              <td>{theirs}</td>
            </tr>
          </tfoot>
        </table>
      </main>
      <footer class="game-footer">
        <div class="actions">
          <button type="button" class="btn btn-secondary" onClick={onHome}>
            Home
          </button>
          <button type="button" class="btn btn-primary" onClick={onRematch}>
            {rematchLabel}
          </button>
        </div>
      </footer>
    </div>
  );
}
