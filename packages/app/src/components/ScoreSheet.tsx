import { DEFAULT_SETTINGS, type PlayerView } from "@wordtrap/engine";

interface ScoreSheetProps {
  view: PlayerView;
  onClose: () => void;
}

/** Round-by-round scoreboard, opened by tapping the score in the header. */
export function ScoreSheet({ view, onClose }: ScoreSheetProps) {
  const opponent = view.opponentName ?? "Friend";
  const bonus = Object.entries(DEFAULT_SETTINGS.lengthBonus)
    .map(([len, pts]) => `${len} letters +${pts}`)
    .join(", ");
  return (
    <div class="dialog-backdrop" onClick={onClose}>
      <div class="dialog score-sheet" role="dialog" aria-modal="true" aria-label="Scores" onClick={(e) => e.stopPropagation()}>
        <h2 class="dialog-title">Scores</h2>
        <table class="final-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>{view.myName}</th>
              <th>{opponent}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: view.roundsTotal }, (_, i) => {
              const r = view.rounds[i];
              return (
                <tr key={i}>
                  <td class="muted">{i + 1}</td>
                  {r?.result ? (
                    <>
                      <td>
                        <span class="final-word">{r.myWord}</span> +{r.result.scores[0]}
                      </td>
                      <td>
                        <span class="final-word">{r.opponentWord}</span> +{r.result.scores[1]}
                      </td>
                    </>
                  ) : (
                    <td colSpan={2} class="muted">
                      {r ? "In progress" : "–"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{view.totals[0]}</td>
              <td>{view.totals[1]}</td>
            </tr>
          </tfoot>
        </table>
        <p class="dialog-body small">
          <strong>Your word survives:</strong> you get its points plus a length bonus ({bonus}).
          <br />
          <strong>You catch their word:</strong> you get half its points, rounded up, and they get nothing for it.
        </p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
