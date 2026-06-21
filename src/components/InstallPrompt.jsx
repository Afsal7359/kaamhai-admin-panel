import { useEffect, useState } from "react";
import { canPrompt, isIos, isStandalone, onInstallChange, promptInstall } from "../pwa";

// Bottom banner shown once per session inviting the user to install.
// The always-available button lives in the sidebar (InstallButton); this is the
// proactive nudge. Dismissing hides it for the session only (not forever).
export default function InstallPrompt() {
  const [, force] = useState(0);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("kh_install_dismissed") === "1",
  );

  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);

  if (isStandalone() || dismissed) return null;
  const installable = canPrompt();
  const iosHint = isIos();
  if (!installable && !iosHint) return null; // nothing useful to offer (e.g. desktop, no prompt yet)

  const close = () => {
    setDismissed(true);
    sessionStorage.setItem("kh_install_dismissed", "1");
  };

  const install = async () => {
    await promptInstall();
    close();
  };

  return (
    <div className="install-banner">
      <div className="install-icon">⬇️</div>
      <div className="install-text">
        <strong>Install Kaamhai Admin</strong>
        <span>
          {installable
            ? "Add it to your device to use it like a native app."
            : "Tap Share, then “Add to Home Screen”."}
        </span>
      </div>
      {installable && (
        <button className="btn primary sm" onClick={install}>
          Install
        </button>
      )}
      <button className="install-close" onClick={close} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
