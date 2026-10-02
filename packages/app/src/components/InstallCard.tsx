import { useEffect, useState } from "preact/hooks";
import {
  canPromptInstall,
  dismissInstall,
  installDismissed,
  isIos,
  isStandalone,
  onInstallChange,
  promptInstall,
} from "../install.ts";

interface InstallCardProps {
  /** Rejoin codes for this device's online games, so they can be carried into the installed app. */
  rejoinCodes: { title: string; code: string }[];
}

/**
 * "Add to Home Screen" prompt. Android/Chrome gets a real install button; iPhone Safari gets
 * instructions, because Safari has no install API. On iPhone the installed app doesn't share
 * storage with Safari, so the card also lists rejoin codes for games already in progress.
 */
export function InstallCard({ rejoinCodes }: InstallCardProps) {
  const [, rerender] = useState(0);
  const [hidden, setHidden] = useState(installDismissed);
  useEffect(() => onInstallChange(() => rerender((n) => n + 1)), []);

  if (hidden || isStandalone()) return null;
  const ios = isIos();
  if (!ios && !canPromptInstall()) return null;

  const close = () => {
    dismissInstall();
    setHidden(true);
  };

  return (
    <div class="install-card" role="region" aria-label="Install Word Trap">
      <button type="button" class="icon-button install-close" onClick={close} aria-label="Dismiss">
        ✕
      </button>
      <div class="install-title">Put Word Trap on your home screen</div>
      {ios ? (
        <>
          <p class="install-text">
            Tap{" "}
            <svg class="share-icon" viewBox="0 0 24 24" width="18" height="18" aria-label="Share">
              <path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>{" "}
            <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>.
          </p>
          {rejoinCodes.length > 0 && (
            <div class="install-codes">
              <p class="install-text small">
                The home-screen app starts empty. To carry these games over, open it, tap <strong>Join with a code</strong>{" "}
                and enter:
              </p>
              <ul>
                {rejoinCodes.map((r) => (
                  <li key={r.code}>
                    <span class="muted">{r.title}</span> <strong class="rejoin-code">{r.code}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <button type="button" class="btn btn-primary btn-wide" onClick={promptInstall}>
          Install app
        </button>
      )}
    </div>
  );
}
