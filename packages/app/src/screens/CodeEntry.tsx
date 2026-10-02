import { useState } from "preact/hooks";
import { BackIcon } from "../components/BackIcon.tsx";

interface CodeEntryProps {
  initialCode?: string;
  /** Returns an error message, or null when it handled the code. */
  onSubmit: (code: string) => Promise<string | null>;
  onCancel: () => void;
}

/** One box for both a friend's join code and your own rejoin code. */
export function CodeEntryScreen({ initialCode = "", onSubmit, onCancel }: CodeEntryProps) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const ready = clean.length === 6 || clean.length === 12;
  return (
    <form
      class="screen form-screen"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        setBusy(true);
        setError(await onSubmit(clean));
        setBusy(false);
      }}
    >
      <header class="form-header">
        <button type="button" class="icon-button" onClick={onCancel} aria-label="Back">
          <BackIcon />
        </button>
        <h1>Join with a code</h1>
      </header>
      <main class="form-main">
        <label class="field field-code">
          <span>Code</span>
          <input
            value={code}
            onInput={(e) => setCode(e.currentTarget.value)}
            maxLength={14}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellcheck={false}
            enterKeyHint="go"
            placeholder="K7PM2Q"
          />
        </label>
        <p class="muted small">
          Enter the 6-letter join code your friend sent you, or your own rejoin code (like K7PM2Q-W3XRT9) to get back into a
          game on this device.
        </p>
        <div class="message" role="status">
          {error}
        </div>
      </main>
      <footer class="form-footer">
        <button type="submit" class="btn btn-primary btn-wide" disabled={!ready || busy}>
          Continue
        </button>
      </footer>
    </form>
  );
}
