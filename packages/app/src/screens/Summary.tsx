import type { GuessView, PlayerView, RoundView } from "@wordtrap/engine";
import { tileScore, lengthBonus, catchReward } from "@wordtrap/engine";
import { BoardRow } from "../components/BoardRow.tsx";

interface SummaryProps {
  view: PlayerView;
  round: RoundView;
  onContinue: () => void;
}

function WordBlock(props: {
  owner: string;
  guesser: string;
  word: string;
  guesses: GuessView[];
  caught: boolean;
  round: RoundView;
}) {
  const { owner, guesser, word, guesses, caught, round } = props;
  const tile = tileScore(word, round.board);
  const caughtOn = guesses.findIndex((g) => g.word === word) + 1;
  return (
    <section class="summary-block">
      <div class="summary-block-head">
        <span class="summary-owner">{owner}'s word</span>
        <span class={`outcome ${caught ? "outcome-caught" : "outcome-survived"}`}>
          {caught ? `Caught on guess ${caughtOn}` : "Survived"}
        </span>
      </div>
      <BoardRow board={round.board} letters={[...word]} size="sm" label={`${owner}'s word ${word}`} />
      <div class="summary-guesses">
        {guesses.map((g, i) => (
          <div class="summary-guess" key={i}>
            <span class="summary-guess-label muted">
              {guesser} #{i + 1}
            </span>
            <BoardRow board={round.board} letters={[...g.word]} marks={g.marks} size="sm" plain label={`${g.word}`} />
          </div>
        ))}
      </div>
      <div class="summary-points muted">
        {caught
          ? `${guesser} +${catchReward(tile)}, ${owner} +0`
          : `${owner} +${tile + lengthBonus(word.length)}${lengthBonus(word.length) ? ` (incl. +${lengthBonus(word.length)} length bonus)` : ""}`}
      </div>
    </section>
  );
}

export function SummaryScreen({ view, round, onContinue }: SummaryProps) {
  const result = round.result!;
  const opponent = view.opponentName ?? "Friend";
  return (
    <div class="screen game-screen">
      <main class="game-main summary">
        <h1 class="summary-title">Round {round.index + 1} results</h1>
        <WordBlock
          owner={view.myName}
          guesser={opponent}
          word={round.myWord!}
          guesses={round.opponentGuesses ?? []}
          caught={result.caught[0]}
          round={round}
        />
        <WordBlock
          owner={opponent}
          guesser={view.myName}
          word={round.opponentWord!}
          guesses={round.myGuesses}
          caught={result.caught[1]}
          round={round}
        />
        <div class="summary-totals">
          <div>
            <div class="muted">{view.myName}</div>
            <div class="summary-round-pts">+{result.scores[0]}</div>
            <div class="summary-total">{view.totals[0]}</div>
          </div>
          <div>
            <div class="muted">{opponent}</div>
            <div class="summary-round-pts">+{result.scores[1]}</div>
            <div class="summary-total">{view.totals[1]}</div>
          </div>
        </div>
      </main>
      <footer class="game-footer">
        <div class="actions">
          <button type="button" class="btn btn-primary btn-wide" onClick={onContinue}>
            {round.index + 1 < view.roundsTotal ? "Next round" : "Final score"}
          </button>
        </div>
      </footer>
    </div>
  );
}
