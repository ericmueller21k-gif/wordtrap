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
import { api } from "./api.ts";
import { LocalGame } from "./LocalGame.tsx";
import { inviteUrl, OnlineGame, onlineStatus } from "./OnlineGame.tsx";
import { CodeEntryScreen } from "./screens/CodeEntry.tsx";
import { HomeScreen, type MatchSummary } from "./screens/Home.tsx";
import { InviteScreen } from "./screens/Invite.tsx";
import { NameEntryScreen } from "./screens/NameEntry.tsx";
import { NewLocalGameScreen } from "./screens/NewLocalGame.tsx";
import {
  loadLocalMatches,
  loadName,
  loadOnlineMatches,
  newId,
  saveLocalMatches,
  saveName,
  saveOnlineMatches,
  type LocalMatch,
  type OnlineMatch,
} from "./storage.ts";
import { loadDictionary } from "./words.ts";

type Route =
  | { name: "home" }
  | { name: "new-local" }
  | { name: "local"; id: string }
  | { name: "new-online" }
  | { name: "code"; code?: string }
  | { name: "join-name"; code: string }
  | { name: "invite"; code: string }
  | { name: "online"; code: string };

function localStatus(state: MatchState): { status: string; finished: boolean } {
  if (isMatchFinished(state)) {
    const [a, b] = matchTotals(state);
    const [na, nb] = [state.names[0], state.names[1]!];
    return { status: a === b ? `Tied ${a}–${b}` : `${a > b ? na : nb} won ${Math.max(a, b)}–${Math.min(a, b)}`, finished: true };
  }
  const turns = ([0, 1] as const).filter((s) => ["set", "guess"].includes(stageFor(state, s).kind));
  const round = Math.min(
    ...([0, 1] as const).map((s) => {
      const st = stageFor(state, s);
      return st.kind === "finished" ? state.rounds.length - 1 : st.round;
    }),
  );
  const who = turns.length === 2 ? "Either player's turn" : turns.length === 1 ? `${state.names[turns[0]!]}'s turn` : "In progress";
  return { status: `Round ${round + 1} · ${who} · Pass the phone`, finished: false };
}

/** An invite link (/join/K7PM2Q) opens the join flow. */
function initialRoute(): Route {
  const m = location.pathname.match(/^\/join\/([A-Za-z0-9]{6})\/?$/);
  if (m) {
    history.replaceState(null, "", "/");
    return { name: "join-name", code: m[1]!.toUpperCase() };
  }
  return { name: "home" };
}

function upsert<T>(all: T[], item: T, same: (a: T) => boolean): T[] {
  return all.some(same) ? all.map((m) => (same(m) ? item : m)) : [item, ...all];
}

export function App() {
  const [dictionary, setDictionary] = useState<Dictionary | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [route, setRoute] = useState<Route>(initialRoute);
  const [locals, setLocals] = useState<LocalMatch[]>(loadLocalMatches);
  const [onlines, setOnlines] = useState<OnlineMatch[]>(loadOnlineMatches);
  const home = () => setRoute({ name: "home" });

  useEffect(() => {
    loadDictionary().then(setDictionary, () => setLoadError(true));
  }, []);

  const saveLocal = (match: LocalMatch) =>
    setLocals((all) => {
      const next = upsert(all, match, (m) => m.id === match.id);
      saveLocalMatches(next);
      return next;
    });

  const removeLocal = (id: string) =>
    setLocals((all) => {
      const next = all.filter((m) => m.id !== id);
      saveLocalMatches(next);
      return next;
    });

  const saveOnline = (entry: OnlineMatch) =>
    setOnlines((all) => {
      const next = upsert(all, entry, (m) => m.code === entry.code);
      saveOnlineMatches(next);
      return next;
    });

  const removeOnline = (code: string) =>
    setOnlines((all) => {
      const next = all.filter((m) => m.code !== code);
      saveOnlineMatches(next);
      return next;
    });

  // Refresh every online match's status when Home is showing.
  useEffect(() => {
    if (route.name !== "home") return;
    const refreshAll = () =>
      loadOnlineMatches().forEach(async (entry) => {
        const r = await api.get(entry.code, entry.token);
        if (r.ok) saveOnline({ ...entry, match: r.match, updatedAt: Math.max(entry.updatedAt, Date.now()) });
      });
    refreshAll();
    const timer = setInterval(() => document.visibilityState === "visible" && refreshAll(), 20_000);
    const onVisible = () => document.visibilityState === "visible" && refreshAll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [route.name]);

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

  const summaries = useMemo<MatchSummary[]>(() => {
    const online = onlines.map((m) => {
      const inRematch = onlines.some((o) => o.code === m.match.rematchCode);
      const { status, urgent, finished } = onlineStatus(m, inRematch);
      return {
        id: `online-${m.code}`,
        sort: m.updatedAt,
        title: `${m.match.view.myName} vs ${m.match.view.opponentName ?? "…"}`,
        status,
        urgent,
        finished,
        onOpen: () => setRoute({ name: "online", code: m.code }),
        onRemove: finished ? () => removeOnline(m.code) : undefined,
      };
    });
    const local = locals.map((m) => {
      const { status, finished } = localStatus(m.state);
      return {
        id: m.id,
        sort: m.updatedAt,
        title: `${m.state.names[0]} vs ${m.state.names[1]}`,
        status,
        urgent: false,
        finished,
        onOpen: () => setRoute({ name: "local", id: m.id }),
        onRemove: () => removeLocal(m.id),
      };
    });
    // Your turn first, then most recent.
    return [...online, ...local].sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.sort - a.sort);
  }, [locals, onlines]);

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

  switch (route.name) {
    case "new-local":
      return <NewLocalGameScreen onStart={startLocal} onCancel={home} />;

    case "local": {
      const match = locals.find((m) => m.id === route.id);
      if (!match) break;
      return (
        <LocalGame
          key={match.id}
          match={match}
          dictionary={dictionary}
          onChange={saveLocal}
          onHome={home}
          onRematch={() => startLocal([match.state.names[0], match.state.names[1]!])}
        />
      );
    }

    case "new-online":
      return (
        <NameEntryScreen
          title="New game"
          submitLabel="Create game"
          initialName={loadName()}
          note="You'll get a link and a code to send to a friend."
          onCancel={home}
          onSubmit={async (name) => {
            const r = await api.create(name);
            if (!r.ok) return r.message;
            saveName(name);
            saveOnline({ ...r.credentials, match: r.match, updatedAt: Date.now() });
            setRoute({ name: "invite", code: r.credentials.code });
            return null;
          }}
        />
      );

    case "invite":
      return (
        <InviteScreen
          code={route.code}
          url={inviteUrl(route.code)}
          onContinue={() => setRoute({ name: "online", code: route.code })}
        />
      );

    case "code":
      return (
        <CodeEntryScreen
          initialCode={route.code}
          onCancel={home}
          onSubmit={async (code) => {
            if (code.length === 12) {
              const r = await api.rejoin(code);
              if (!r.ok) return r.message;
              saveOnline({ ...r.credentials, match: r.match, updatedAt: Date.now() });
              setRoute({ name: "online", code: r.credentials.code });
              return null;
            }
            if (onlines.some((m) => m.code === code)) {
              setRoute({ name: "online", code });
              return null;
            }
            setRoute({ name: "join-name", code });
            return null;
          }}
        />
      );

    case "join-name": {
      if (onlines.some((m) => m.code === route.code)) {
        return <AutoRoute go={() => setRoute({ name: "online", code: route.code })} />;
      }
      return (
        <NameEntryScreen
          title={`Join game ${route.code}`}
          submitLabel="Join game"
          initialName={loadName()}
          onCancel={home}
          onSubmit={async (name) => {
            const r = await api.join(route.code, name);
            if (!r.ok) return r.message;
            saveName(name);
            saveOnline({ ...r.credentials, match: r.match, updatedAt: Date.now() });
            setRoute({ name: "online", code: route.code });
            return null;
          }}
        />
      );
    }

    case "online": {
      const entry = onlines.find((m) => m.code === route.code);
      if (!entry) break;
      return (
        <OnlineGame
          key={entry.code}
          entry={entry}
          dictionary={dictionary}
          onUpdate={saveOnline}
          onOpen={(next) => {
            saveOnline(next);
            setRoute({ name: "online", code: next.code });
          }}
          onHome={home}
        />
      );
    }
  }

  return (
    <HomeScreen
      matches={summaries}
      onNewOnline={() => setRoute({ name: "new-online" })}
      onJoin={() => setRoute({ name: "code" })}
      onNewLocal={() => setRoute({ name: "new-local" })}
    />
  );
}

/** Redirects on mount (used when an invite link is for a game this device is already in). */
function AutoRoute({ go }: { go: () => void }) {
  useEffect(go, []);
  return null;
}
