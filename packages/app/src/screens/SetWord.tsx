import { useState } from "preact/hooks";
import { DEFAULT_SETTINGS, lengthBonus, tileScore, type PlayerView, type RoundView } from "@wordtrap/engine";
import { BoardRow } from "../components/BoardRow.tsx";
import { ConfirmDialog } from "../components/ConfirmDialog.tsx";
import { Header } from "../components/Header.tsx";
import { RackView } from "../components/RackView.tsx";
import { ReusableHint } from "../components/ReusableHint.tsx";
import { useWordBuilder } from "../components/useWordBuilder.ts";
import type { ActionResult } from "../game.ts";

interface SetWordProps {
  view: PlayerView;
  round: RoundView;
  /** Returns an error message, or null if the word is acceptable. */
  validate: (word: string) => string | null;
  onSubmit: (word: string) => Promise<ActionResult>;
  onHome: () => void;
}

export function SetWordScreen({ view, round, validate, onSubmit, onHome }: SetWordProps) {
  const b = useWordBuilder(round.rack, DEFAULT_SETTINGS.rackSize, round.reusable);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const score = b.word ? tileScore(b.word, round.board) : 0;
  const bonus = lengthBonus(b.word.length);

  const tryLock = () => {
    if (b.hasGap) return setMessage("Close the gap. Words run from the first slot with no spaces.");
    const problem = validate(b.word);
    if (problem) return setMessage(problem);
    setConfirming(true);
  };

  const lock = async () => {
    setConfirming(false);
    setBusy(true);
    const result = await onSubmit(b.word);
    setBusy(false);
    if (!result.ok) setMessage(result.message);
  };

  const edit = (fn: () => void) => () => {
    setMessage(null);
    fn();
  };

  return (
    <div class="screen game-screen">
      <Header
        round={round.index}
        roundsTotal={view.roundsTotal}
        myName={view.myName}
        opponentName={view.opponentName ?? "Friend"}
        totals={view.totals}
        onHome={onHome}
      />
      <main class="game-main">
        <div class="prompt">
          <div class="prompt-who">{view.myName}</div>
          <h1 class="prompt-title">Set your word</h1>
          <p class="prompt-sub">
            {view.opponentName
              ? round.opponentSubmitted
                ? `${view.opponentName} has set their word.`
                : `${view.opponentName} hasn't set theirs yet.`
              : "Your friend hasn't joined yet."}
          </p>
        </div>
        <BoardRow board={round.board} letters={b.letters} onTapSlot={(i) => {
            setMessage(null);
            b.unplace(i);
          }} label="Your word" />
        <div class="score-line" aria-live="polite">
          {b.word ? (
            <>
              <span class="score-big">{score}</span>
              <span class="score-unit">points</span>
              {bonus > 0 && <span class="bonus-chip">+{bonus} if it survives</span>}
            </>
          ) : (
            <span class="muted">Tap tiles to build a word</span>
          )}
        </div>
        <div class="message" role="status">
          {message}
        </div>
      </main>
      <footer class="game-footer">
        <ReusableHint letter={round.reusable} />
        <RackView rack={round.rack} builder={b} disabled={busy} />
        <div class="actions">
          <button type="button" class="btn btn-secondary" onClick={edit(b.shuffle)}>
            Shuffle
          </button>
          <button type="button" class="btn btn-secondary" onClick={edit(b.clear)} disabled={!b.placed.size}>
            Clear
          </button>
          <button type="button" class="btn btn-primary" onClick={tryLock} disabled={b.word.length === 0 || busy}>
            Lock in
          </button>
        </div>
      </footer>
      {confirming && (
        <ConfirmDialog
          title={`Lock in ${b.word}?`}
          confirmLabel="Lock in"
          onConfirm={lock}
          onCancel={() => setConfirming(false)}
        >
          It scores {score}
          {bonus > 0 ? `, plus ${bonus} if it survives` : ""}. You can't change it once it's locked in.
        </ConfirmDialog>
      )}
    </div>
  );
}
