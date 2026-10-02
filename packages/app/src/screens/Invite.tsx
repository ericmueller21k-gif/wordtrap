interface InviteProps {
  code: string;
  url: string;
  onContinue: () => void;
}

export async function shareInvite(code: string, url: string) {
  const text = `Play Word Trap with me! Join code ${code}`;
  try {
    if (navigator.share) await navigator.share({ title: "Word Trap", text, url });
    else await navigator.clipboard.writeText(`${text}: ${url}`);
  } catch {
    // Share sheet dismissed.
  }
}

export function InviteScreen({ code, url, onContinue }: InviteProps) {
  return (
    <div class="screen game-screen">
      <main class="game-main waiting">
        <h1 class="waiting-title">Invite a friend</h1>
        <p class="muted">Send them the link, or have them tap "Join with a code" and enter:</p>
        <div class="invite">
          <div class="invite-code">{code}</div>
          <button type="button" class="btn btn-primary btn-wide" onClick={() => shareInvite(code, url)}>
            Share invite link
          </button>
        </div>
      </main>
      <footer class="game-footer">
        <div class="actions">
          <button type="button" class="btn btn-secondary btn-wide" onClick={onContinue}>
            Set your word
          </button>
        </div>
      </footer>
    </div>
  );
}
