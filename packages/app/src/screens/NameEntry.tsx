import { useState } from "preact/hooks";
import { BackIcon } from "../components/BackIcon.tsx";

interface NameEntryProps {
  title: string;
  submitLabel: string;
  initialName: string;
  note?: string;
  onSubmit: (name: string) => Promise<string | null>;
  onCancel: () => void;
}

/** Name entry for creating or joining an online game. Returns an error message from onSubmit, if any. */
export function NameEntryScreen({ title, submitLabel, initialName, note, onSubmit, onCancel }: NameEntryProps) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      class="screen form-screen"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || busy) return;
        setBusy(true);
        setError(await onSubmit(name.trim()));
        setBusy(false);
      }}
    >
      <header class="form-header">
        <button type="button" class="icon-button" onClick={onCancel} aria-label="Back">
          <BackIcon />
        </button>
        <h1>{title}</h1>
      </header>
      <main class="form-main">
        <label class="field">
          <span>Your name</span>
          <input
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
            maxLength={16}
            autoComplete="nickname"
            enterKeyHint="go"
          />
        </label>
        {note && <p class="muted small">{note}</p>}
        <div class="message" role="status">
          {error}
        </div>
      </main>
      <footer class="form-footer">
        <button type="submit" class="btn btn-primary btn-wide" disabled={!name.trim() || busy}>
          {submitLabel}
        </button>
      </footer>
    </form>
  );
}
