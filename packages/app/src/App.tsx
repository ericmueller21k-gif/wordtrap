import { useEffect, useMemo, useState } from "preact/hooks";
import {
  createMatch,
  generateMatchRounds,
  isMatchFinished,
  matchTotals,
  stageFor,
  type Dictionary,
  type MatchState,
} from "@wordtrap/engine";
import { LocalGame } from "./LocalGame.tsx";
import { HomeScreen, type MatchSummary } from "./screens/Home.tsx";
import { NewLocalGameScreen } from "./screens/NewLocalGame.tsx";
import { loadLocalMatches, newId, saveLocalMatches, type LocalMatch } from "./storage.ts";
import { loadDictionary } from "./words.ts";

type Route = { name: "home" } | { name: "new-local" } | { name: "local"; id: string };

function localStatus(state: MatchState): { status: string; finished: boolean } {
  if (isMatchFinished(state)) {
    const [a, b] = matchTotals(state);
    const [na, nb] = [state.names[0], state.names[1]!];
    return { status: a === b ? `Tied ${a}–${b}` : `${a > b ? na : nb} won ${Math.max(a, b)}–${Math.min(a, b)}`, finished: true };
  }
  const turns = ([0, 1] as const).filter((s) => ["set", "guess"].includes(stageFor(state, s).kind));
  const round = Math.min(...([0, 1] as const).map((s) => {
    const st = stageFor(state, s);
    return st.kind === "finished" ? state.rounds.length - 1 : st.round;
  }));
  const who = turns.length === 2 ? "Either player's turn" : turns.length === 1 ? `${state.names[turns[0]!]}'s turn` : "In progress";
  return { status: `Round ${round + 1} · ${who}`, finished: false };
}

export function App() {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [locals, setLocals] = useState<LocalMatch[]>(loadLocalMatches);

  useEffect(() => {
    loadDictionary().then(setDictionary, () => setLoadError(true));
  }, []);

  const saveLocal = (match: LocalMatch) => {
    setLocals((all) => {
      const next = all.some((m) => m.id === match.id) ? all.map((m) => (m.id === match.id ? match : m)) : [match, ...all];
      saveLocalMatches(next);
      return next;
    });
  };

  const removeLocal = (id: string) => {
    setLocals((all) => {
      const next = all.filter((m) => m.id !== id);
      saveLocalMatches(next);
      return next;
    });
  };

  const startLocal = (names: [string, string]) => {
    if (!dictionary) return;
    const now = Date.now();
    const match: LocalMatch = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      state: createMatch(generateMatchRounds(Math.random, dictionary), names[0], names[1]),
      activeSeat: 0,
    };
    saveLocal(match);
    setRoute({ name: "local", id: match.id });
  };

  const summaries = useMemo<MatchSummary[]>(
    () =>
      [...locals]
        .sort((x, y) => y.updatedAt - x.updatedAt)
        .map((m) => {
          const { status, finished } = localStatus(m.state);
          return {
            id: m.id,
            title: `${m.state.names[0]} vs ${m.state.names[1]}`,
            status,
            urgent: !finished,
            finished,
            onOpen: () => setRoute({ name: "local", id: m.id }),
            onRemove: () => removeLocal(m.id),
          };
        }),
    [locals],
  );

  if (!dictionary) {
    return (
      <div class="screen splash">
        <h1 class="logo" aria-label="Word Trap">
          <span class="logo-tile">W</span>ord <span class="logo-tile">T</span>rap
        </h1>
        {loadError && (
          <p class="message">
            Couldn't load the word list. Check your connection and{" "}
            <button type="button" class="link" onClick={() => location.reload()}>
              try again
            </button>
            .
          </p>
        )}
      </div>
    );
  }

  if (route.name === "new-local") {
    return <NewLocalGameScreen onStart={startLocal} onCancel={() => setRoute({ name: "home" })} />;
  }

  if (route.name === "local") {
    const match = locals.find((m) => m.id === route.id);
    if (match) {
      return (
        <LocalGame
          key={match.id}
          match={match}
          dictionary={dictionary}
          onChange={saveLocal}
          onHome={() => setRoute({ name: "home" })}
          onRematch={() => startLocal([match.state.names[0], match.state.names[1]!])}
        />
      );
    }
  }

  return <HomeScreen matches={summaries} onNewLocal={() => setRoute({ name: "new-local" })} />;
}
