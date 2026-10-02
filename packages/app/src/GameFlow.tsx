import type { JSX } from "preact";
import { validateGuess, validateSetWord, type Dictionary, type PlayerView } from "@wordtrap/engine";
import type { ActionResult, GuessResult } from "./game.ts";
import { GuessScreen } from "./screens/Guess.tsx";
import { SetWordScreen } from "./screens/SetWord.tsx";
import { SummaryScreen } from "./screens/Summary.tsx";

export interface GameFlowProps {
  view: PlayerView;
  dictionary: Dictionary;
  /** Round whose reveal panel is showing (set when a player's guessing ends). */
  reveal: number | null;
  setReveal: (round: number | null) => void;
  setWord: (round: number, word: string) => Promise<ActionResult>;
  guess: (round: number, guess: string) => Promise<GuessResult>;
  summarySeen: (round: number) => void;
  /** Rendered when this player has nothing to do. */
  waiting: () => JSX.Element;
  final: () => JSX.Element;
  onHome: () => void;
  /** Distinguishes screens for different players on one device. */
  keyPrefix: string;
}

export function pendingSummary(view: PlayerView) {
  return view.rounds.find((r) => r.result && r.index >= view.summariesSeen);
}

/** Picks the screen for a player's view. Shared by pass-the-phone and online play. */
export function GameFlow(props: GameFlowProps) {
  const { view, dictionary, reveal, setReveal, onHome, keyPrefix } = props;

  if (reveal !== null && view.rounds[reveal]?.myDoneGuessing) {
    return (
      <GuessScreen
        key={`${keyPrefix}-reveal-${reveal}`}
        view={view}
        round={view.rounds[reveal]!}
        validate={() => null}
        onGuess={async () => ({ ok: false, message: "" })}
        onDone={() => setReveal(null)}
        onHome={onHome}
      />
    );
  }

  const summary = pendingSummary(view);
  if (summary) {
    return (
      <SummaryScreen
        key={`${keyPrefix}-summary-${summary.index}`}
        view={view}
        round={summary}
        onContinue={() => props.summarySeen(summary.index)}
      />
    );
  }

  const stage = view.stage;
  if (stage.kind === "set") {
    const round = view.rounds[stage.round]!;
    return (
      <SetWordScreen
        key={`${keyPrefix}-set-${stage.round}`}
        view={view}
        round={round}
        validate={(word) => {
          const r = validateSetWord(word, round.rack, dictionary);
          return r.ok ? null : r.message;
        }}
        onSubmit={(word) => props.setWord(stage.round, word)}
        onHome={onHome}
      />
    );
  }

  if (stage.kind === "guess") {
    const round = view.rounds[stage.round]!;
    return (
      <GuessScreen
        key={`${keyPrefix}-guess-${stage.round}`}
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
          const r = await props.guess(stage.round, guess);
          if (r.ok && r.doneGuessing) setReveal(stage.round);
          return r;
        }}
        onDone={() => setReveal(null)}
        onHome={onHome}
      />
    );
  }

  if (stage.kind === "finished") return props.final();
  return props.waiting();
}
