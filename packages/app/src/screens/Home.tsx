import type { ComponentChildren } from "preact";

export interface MatchSummary {
  id: string;
  title: string;
  status: string;
  /** Highlight as "your turn". */
  urgent: boolean;
  finished: boolean;
  onOpen: () => void;
  onRemove?: () => void;
}

interface HomeProps {
  matches: MatchSummary[];
  /** Running as the installed home-screen app. */
  standalone?: boolean;
  onNewOnline: () => void;
  onJoin: () => void;
  onNewLocal: () => void;
  children?: ComponentChildren;
}

export function HomeScreen({ matches, standalone, onNewOnline, onJoin, onNewLocal, children }: HomeProps) {
  return (
    <div class="screen home">
      <header class="home-header">
        <h1 class="logo" aria-label="Word Trap">
          <span class="logo-tile">W</span>ord <span class="logo-tile">T</span>rap
        </h1>
      </header>
      <main class="home-main">
        {matches.length === 0 ? (
          <div class="home-empty">
            <p>Both players get the same seven tiles and secretly build a word.</p>
            <p>Then you each get to see the length and score of the other's word, and try to catch it.</p>
            {standalone && (
              <p>
                Already playing in your browser? Tap <strong>Join with a code</strong> and enter your rejoin code to bring
                the game here.
              </p>
            )}
          </div>
        ) : (
          <ul class="match-list">
            {matches.map((m) => (
              <li key={m.id} class={`match-item ${m.urgent ? "match-urgent" : ""}`}>
                <button type="button" class="match-open" onClick={m.onOpen}>
                  <span class="match-title">{m.title}</span>
                  <span class="match-status">{m.status}</span>
                </button>
                {m.onRemove && (
                  <button type="button" class="icon-button match-remove" onClick={m.onRemove} aria-label={`Remove ${m.title}`}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer class="home-footer">
        {children}
        <button type="button" class="btn btn-primary btn-wide" onClick={onNewOnline}>
          New game
        </button>
        <div class="actions">
          <button type="button" class="btn btn-secondary" onClick={onJoin}>
            Join with a code
          </button>
          <button type="button" class="btn btn-secondary" onClick={onNewLocal}>
            Pass the phone
          </button>
        </div>
      </footer>
    </div>
  );
}
