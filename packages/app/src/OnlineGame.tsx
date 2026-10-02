import { useEffect, useRef, useState } from "preact/hooks";
import type { Dictionary } from "@wordtrap/engine";
import { api, type MatchResponse } from "./api.ts";
import { GameFlow, pendingSummary } from "./GameFlow.tsx";
import { FinalScreen } from "./screens/Final.tsx";
import { WaitingScreen } from "./screens/Waiting.tsx";
import type { OnlineMatch } from "./storage.ts";

interface OnlineGameProps {
  entry: OnlineMatch;
  dictionary: Dictionary;
  onUpdate: (entry: OnlineMatch) => void;
  /** Switches to another match (a rematch). */
  onOpen: (entry: OnlineMatch) => void;
  onHome: () => void;
}

const POLL_MS = 5_000;
const SLOW_POLL_MS = 30_000;
/** After this long with nothing changing, poll slowly to stay well inside the free plan. */
const SLOW_AFTER_MS = 10 * 60_000;

export function inviteUrl(code: string): string {
  return `${location.origin}/join/${code}`;
}

/**
 * Online controller. The server is the authority; this shows the last view
 * immediately (no spinner) and refreshes it, polling while waiting.
 */
export function OnlineGame({ entry, dictionary, onUpdate, onOpen, onHome }: OnlineGameProps) {
  const [reveal, setReveal] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const entryRef = useRef(entry);
  entryRef.current = entry;
  // Ignore responses to requests sent before the last applied one, so a slow poll can't undo a move.
  const lastSent = useRef(0);
  const lastChange = useRef(Date.now());

  const apply = (match: MatchResponse, sentAt: number) => {
    if (sentAt < lastSent.current) return;
    lastSent.current = sentAt;
    const prev = entryRef.current;
    if (JSON.stringify(prev.match) !== JSON.stringify(match)) lastChange.current = Date.now();
    onUpdate({ ...prev, match, updatedAt: Date.now() });
  };

  const refresh = async () => {
    const sentAt = performance.now();
    const r = await api.get(entry.code, entry.token);
    if (r.ok) {
      setBanner(null);
      apply(r.match, sentAt);
    } else {
      setBanner(r.message);
    }
  };

  const view = entry.match.view;
  const kind = view.stage.kind;
  const waiting =
    kind === "waitingForWord" ||
    kind === "waitingForGuesses" ||
    view.opponentName === null ||
    (kind === "finished" && !entry.match.rematchCode);

  useEffect(() => {
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [entry.code]);

  useEffect(() => {
    if (!waiting) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const slow = Date.now() - lastChange.current > SLOW_AFTER_MS;
      timer = setTimeout(async () => {
        if (document.visibilityState === "visible") await refresh();
        tick();
      }, slow ? SLOW_POLL_MS : POLL_MS);
    };
    tick();
    return () => clearTimeout(timer);
  }, [waiting, entry.code]);

  const rematch = async () => {
    const r = await api.rematch(entry.code, entry.token);
    if (!r.ok) return setBanner(r.message);
    onOpen({ ...r.credentials, match: r.match, updatedAt: Date.now() });
  };

  const opponent = view.opponentName ?? "your friend";

  return (
    <>
      {banner && (
        <div class="banner" role="alert" onClick={refresh}>
          {banner} <span class="banner-retry">Retry</span>
        </div>
      )}
      <GameFlow
        view={view}
        dictionary={dictionary}
        keyPrefix={entry.code}
        reveal={reveal}
        setReveal={setReveal}
        setWord={async (round, word) => {
          const sentAt = performance.now();
          const r = await api.setWord(entry.code, entry.token, round, word);
          if (!r.ok) return r;
          apply(r.match, sentAt);
          return { ok: true };
        }}
        guess={async (round, guess) => {
          const sentAt = performance.now();
          const r = await api.guess(entry.code, entry.token, round, guess);
          if (!r.ok) return r;
          apply(r.match, sentAt);
          return { ok: true, marks: r.marks, caught: r.caught, doneGuessing: r.doneGuessing };
        }}
        summarySeen={(round) => {
          // Move on at once; the server catches up.
          const local = { ...entry.match, view: { ...view, summariesSeen: Math.max(view.summariesSeen, round + 1) } };
          onUpdate({ ...entry, match: local, updatedAt: Date.now() });
          const sentAt = performance.now();
          lastSent.current = sentAt;
          api.summarySeen(entry.code, entry.token, round).then((r) => r.ok && apply(r.match, sentAt));
        }}
        waiting={() => (
          <WaitingScreen
            view={view}
            inviteUrl={view.opponentName === null ? inviteUrl(entry.code) : undefined}
            joinCode={entry.code}
            rejoinCode={entry.rejoinCode}
            onHome={onHome}
          />
        )}
        final={() => (
          <FinalScreen
            view={view}
            local={false}
            onRematch={rematch}
            onHome={onHome}
            rematchLabel={entry.match.rematchCode ? `Play ${opponent}'s rematch` : "Rematch"}
          />
        )}
        onHome={onHome}
      />
    </>
  );
}

/** Home-screen status line for an online match. */
export function onlineStatus(
  entry: OnlineMatch,
  /** Whether this device has already joined the rematch. */
  inRematch = false,
): { status: string; urgent: boolean; finished: boolean } {
  const view = entry.match.view;
  const opp = view.opponentName;
  if (pendingSummary(view)) return { status: "Your turn: see the round results", urgent: true, finished: false };
  switch (view.stage.kind) {
    case "set":
    case "guess":
      return { status: `Round ${view.stage.round + 1} · Your turn`, urgent: true, finished: false };
    case "waitingForWord":
      return { status: opp ? `Waiting for ${opp}` : "Waiting for your friend to join", urgent: false, finished: false };
    case "waitingForGuesses":
      return { status: `Waiting for ${opp}`, urgent: false, finished: false };
    case "finished": {
      const [me, them] = view.totals;
      const result = me === them ? `Tied ${me}–${them}` : me > them ? `You won ${me}–${them}` : `${opp} won ${them}–${me}`;
      const rematchReady = !!entry.match.rematchCode && !inRematch;
      return { status: rematchReady ? `${result} · Rematch ready` : result, urgent: rematchReady, finished: true };
    }
  }
}
