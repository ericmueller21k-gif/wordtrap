import { useState } from "preact/hooks";
import {
  markSummarySeen,
  setWord,
  submitGuess,
  validateGuess,
  validateSetWord,
  viewFor,
  type Dictionary,
  type Seat,
} from "@wordtrap/engine";
import type { LocalMatch } from "./storage.ts";
import { FinalScreen } from "./screens/Final.tsx";
import { GuessScreen } from "./screens/Guess.tsx";
import { HandoffScreen } from "./screens/Handoff.tsx";
import { SetWordScreen } from "./screens/SetWord.tsx";
import { SummaryScreen } from "./screens/Summary.tsx";

interface LocalGameProps {
  match: LocalMatch;
  dictionary: Dictionary;
  onChange: (match: LocalMatch) => void;
  onHome: () => void;
  onRematch: () => void;
}

/** Pass-the-phone controller: both seats on one device, with a handoff screen between turns. */
export function LocalGame({ match, dictionary, onChange, onHome, onRematch }: LocalGameProps) {
  const { state, activeSeat: seat } = match;
  const [ready, setReady] = useState(false);
  const [reveal, setReveal] = useState<number | null>(null);
  const view = viewFor(state, seat);
  const other: Seat = seat === 0 ? 1 : 0;
  const update = (patch: Partial<LocalMatch>) => onChange({ ...match, ...patch, updatedAt: Date.now() });

  // Whose turn is it? The holder keeps the phone while they have something to do.
  const pendingSummary = view.rounds.find((r) => r.result && r.index >= view.summariesSeen);
  const hasWork = reveal !== null || pendingSummary || view.stage.kind === "set" || view.stage.kind === "guess" || view.stage.kind === "finished";

  if (!hasWork) {
    return (
      <HandoffScreen
        to={state.names[other]!}
        from={state.names[seat]}
        onHome={onHome}
        onReady={() => {
          update({ activeSeat: other });
          setReady(true);
        }}
      />
    );
  }
  if (!ready && view.stage.kind !== "finished") {
    return <HandoffScreen to={state.names[seat]!} from={null} onHome={onHome} onReady={() => setReady(true)} />;
  }

  if (reveal !== null) {
    const round = view.rounds[reveal]!;
    return (
      <GuessScreen
        key={`reveal-${seat}-${reveal}`}
        view={view}
        round={round}
        validate={() => null}
        onGuess={async () => ({ ok: false, message: "" })}
        onDone={() => setReveal(null)}
        onHome={onHome}
      />
    );
  }

  if (pendingSummary) {
    return (
      <SummaryScreen
        key={`summary-${seat}-${pendingSummary.index}`}
        view={view}
        round={pendingSummary}
        onContinue={() => update({ state: markSummarySeen(state, seat, pendingSummary.index) })}
      />
    );
  }

  const stage = view.stage;
  if (stage.kind === "set") {
    const round = view.rounds[stage.round]!;
    return (
      <SetWordScreen
        key={`set-${seat}-${stage.round}`}
        view={view}
        round={round}
        validate={(word) => {
          const r = validateSetWord(word, round.rack, dictionary);
          return r.ok ? null : r.message;
        }}
        onSubmit={async (word) => {
          const r = setWord(state, seat, stage.round, word, dictionary);
          if (!r.ok) return r;
          update({ state: r.state });
          return { ok: true };
        }}
        onHome={onHome}
      />
    );
  }

  if (stage.kind === "guess") {
    const round = view.rounds[stage.round]!;
    return (
      <GuessScreen
        key={`guess-${seat}-${stage.round}`}
        view={view}
        round={round}
        validate={(guess) => {
          const r = validateGuess(
            guess,
            { rack: round.rack, length: round.clue!.length, previousGuesses: round.myGuesses.map((g) => g.word) },
            dictionary,
          );
          return r.ok ? null : r.message;
        }}
        onGuess={async (guess) => {
          const r = submitGuess(state, seat, stage.round, guess, dictionary);
          if (!r.ok) return r;
          if (r.doneGuessing) setReveal(stage.round);
          update({ state: r.state });
          return { ok: true, marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
        }}
        onDone={() => setReveal(null)}
        onHome={onHome}
      />
    );
  }

  return <FinalScreen view={view} local onRematch={onRematch} onHome={onHome} />;
}
