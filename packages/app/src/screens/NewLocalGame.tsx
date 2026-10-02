import { BackIcon } from "../components/BackIcon.tsx";
import { useState } from "preact/hooks";

interface NewLocalGameProps {
  onStart: (names: [string, string]) => void;
  onCancel: () => void;
}

export function NewLocalGameScreen({ onStart, onCancel }: NewLocalGameProps) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const ready = a.trim() && b.trim() && a.trim().toLowerCase() !== b.trim().toLowerCase();
  return (
    <form
      class="screen form-screen"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onStart([a.trim(), b.trim()]);
      }}
    >
      <header class="form-header">
        <button type="button" class="icon-button" onClick={onCancel} aria-label="Back">
          <BackIcon />
        </button>
        <h1>Pass-the-phone game</h1>
      </header>
      <main class="form-main">
        <label class="field">
          <span>First player</span>
          <input value={a} onInput={(e) => setA(e.currentTarget.value)} maxLength={16} autoComplete="off" enterKeyHint="next" />
        </label>
        <label class="field">
          <span>Second player</span>
          <input value={b} onInput={(e) => setB(e.currentTarget.value)} maxLength={16} autoComplete="off" enterKeyHint="go" />
        </label>
        <p class="muted small">You'll pass the phone back and forth. Each screen hides the other player's word.</p>
      </main>
      <footer class="form-footer">
        <button type="submit" class="btn btn-primary btn-wide" disabled={!ready}>
          Start
        </button>
      </footer>
    </form>
  );
}
