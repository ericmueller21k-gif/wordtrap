import { useState } from "preact/hooks";
import { catchReward, lengthBonus, tileScore, type PlayerView, type RoundView } from "@wordtrap/engine";
import { BoardRow } from "../components/BoardRow.tsx";
import { Header } from "../components/Header.tsx";
import { RackView } from "../components/RackView.tsx";
import { ReusableHint } from "../components/ReusableHint.tsx";
import { useWordBuilder } from "../components/useWordBuilder.ts";
import type { GuessResult } from "../game.ts";

interface GuessProps {
  view: PlayerView;
  round: RoundView;
  validate: (guess: string) => string | null;
  onGuess: (guess: string) => Promise<GuessResult>;
  /** Called from the reveal panel once guessing is over. */
  onDone: () => void;
  onHome: () => void;
}

export function GuessScreen({ view, round, validate, onGuess, onDone, onHome }: GuessProps) {
  const clue = round.clue!;
  const b = useWordBuilder(round.rack, clue.length, round.reusable);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const opponent = view.opponentName ?? "Your friend";
  const left = view.guessesPerWord - round.myGuesses.length;
  const done = round.myDoneGuessing;
  const caught = done && round.myGuesses.some((g) => g.word === round.opponentWord);

  const complete = b.word.length === clue.length;
  const score = b.word ? tileScore(b.word, round.board) : 0;

  const submit = async () => {
    if (b.hasGap) return setMessage("Close the gap. Words run from the first slot with no spaces.");
    if (!complete) return setMessage(`Their word has ${clue.length} letters.`);
    const problem = validate(b.word);
    if (problem) return setMessage(problem);
    setBusy(true);
    const result = await onGuess(b.word);
    setBusy(false);
    if (!result.ok) return setMessage(result.message);
    b.clear();
    if (!result.doneGuessing) setMessage("Not quite. The marked letters are in the right slots.");
  };

  return (
    <div class="screen game-screen">
      <Header
        round={round.index}
        roundsTotal={view.roundsTotal}
        myName={view.myName}
        opponentName={opponent}
        totals={view.totals}
        onHome={onHome}
      />
      <main class="game-main">
        <div class="clue-card">
          <div class="clue-label">{opponent}'s word</div>
          <div class="clue-facts">
            <span>
              <strong>{clue.length}</strong> letters
            </span>
            <span class="clue-dot" />
            <span>
              <strong>{clue.tileScore}</strong> points
            </span>
          </div>
          <div class="clue-mine muted">Your word: {round.myWord}</div>
        </div>

        <div class="guess-rows">
          {round.myGuesses.map((g, i) => (
            <BoardRow
              key={`${i}-${g.word}`}
              board={round.board}
              letters={[...g.word]}
              marks={g.marks}
              label={`Guess ${i + 1}: ${g.word}`}
            />
          ))}
          {!done && (
            <BoardRow
              board={round.board}
              letters={b.letters}
              onTapSlot={(i) => {
                setMessage(null);
                b.unplace(i);
              }}
              label="Your guess"
            />
          )}
        </div>

        {done ? (
          <div class={`reveal ${caught ? "reveal-caught" : "reveal-survived"}`} role="status">
            <div class="reveal-title">{caught ? "Caught it!" : "It got away"}</div>
            <div class="reveal-word">
              {opponent}'s word was <strong>{round.opponentWord}</strong>
            </div>
            <div class="reveal-points">
              {caught
                ? `You earn ${catchReward(clue.tileScore)} points.`
                : `${opponent} scores ${clue.tileScore + lengthBonus(clue.length)} for it.`}
            </div>
          </div>
        ) : (
          <>
            <div class="score-line" aria-live="polite">
              {b.word ? (
                complete ? (
                  score === clue.tileScore ? (
                    <span class="check-ok">Scores {score}, matches the clue ✓</span>
                  ) : (
                    <span class="check-off">
                      Scores {score}, the clue is {clue.tileScore}
                    </span>
                  )
                ) : (
                  <span class="muted">Scores {score} so far</span>
                )
              ) : (
                <span class="muted">Build a guess from your tiles</span>
              )}
            </div>
            <div class="guesses-left" aria-label={`${left} guesses left`}>
              {Array.from({ length: view.guessesPerWord }, (_, i) => (
                <span key={i} class={`pip ${i < left ? "pip-on" : ""}`} />
              ))}
              <span class="muted">
                {left} {left === 1 ? "guess" : "guesses"} left
              </span>
            </div>
            <div class="message" role="status">
              {message}
            </div>
          </>
        )}
      </main>
      <footer class="game-footer">
        {done ? (
          <div class="actions">
            <button type="button" class="btn btn-primary btn-wide" onClick={onDone}>
              Continue
            </button>
          </div>
        ) : (
          <>
            <ReusableHint letter={round.reusable} />
            <RackView rack={round.rack} builder={b} disabled={busy} />
            <div class="actions">
              <button type="button" class="btn btn-secondary" onClick={() => (setMessage(null), b.shuffle())}>
                Shuffle
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                onClick={() => (setMessage(null), b.clear())}
                disabled={!b.placed.size}
              >
                Clear
              </button>
              <button type="button" class="btn btn-primary" onClick={submit} disabled={!b.word || busy}>
                Guess
              </button>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
