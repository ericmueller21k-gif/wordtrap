import { useState } from "preact/hooks";
import { markSummarySeen, setWord, submitGuess, viewFor, type Dictionary, type Seat } from "@wordtrap/engine";
import { GameFlow, pendingSummary } from "./GameFlow.tsx";
import type { LocalMatch } from "./storage.ts";
import { FinalScreen } from "./screens/Final.tsx";
import { HandoffScreen } from "./screens/Handoff.tsx";

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

  // The holder keeps the phone while they have something to do.
  const kind = view.stage.kind;
  const hasWork = reveal !== null || pendingSummary(view) || kind === "set" || kind === "guess" || kind === "finished";

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
  if (!ready && kind !== "finished") {
    return <HandoffScreen to={state.names[seat]!} from={null} onHome={onHome} onReady={() => setReady(true)} />;
  }

  return (
    <GameFlow
      view={view}
      dictionary={dictionary}
      keyPrefix={`seat${seat}`}
      reveal={reveal}
      setReveal={setReveal}
      setWord={async (round, word) => {
        const r = setWord(state, seat, round, word, dictionary);
        if (!r.ok) return r;
        update({ state: r.state });
        return { ok: true };
      }}
      guess={async (round, guess) => {
        const r = submitGuess(state, seat, round, guess, dictionary);
        if (!r.ok) return r;
        update({ state: r.state });
        return { ok: true, marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
      }}
      summarySeen={(round) => update({ state: markSummarySeen(state, seat, round) })}
      waiting={() => <></>}
      final={() => <FinalScreen view={view} local onRematch={onRematch} onHome={onHome} />}
      onHome={onHome}
    />
  );
}
