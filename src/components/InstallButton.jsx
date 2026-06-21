import { useEffect, useState } from "react";
import { canPrompt, isIos, isStandalone, onInstallChange, promptInstall } from "../pwa";
import Modal from "./Modal";
import { useToast } from "./Toast";

// Always-available "Install app" affordance. Uses Chrome's captured prompt when
// present; otherwise shows manual steps (iOS Safari / desktop) so installation
// is discoverable on every platform.
export default function InstallButton({ className = "btn sm", label = "Install app" }) {
  const toast = useToast();
  const [, force] = useState(0);
  const [howto, setHowto] = useState(false);

  useEffect(() => onInstallChange(() => force((n) => n + 1)), []);

  if (isStandalone()) return null; // already installed / running as app

  const onClick = async () => {
    if (canPrompt()) {
      const outcome = await promptInstall();
      if (outcome === "accepted") toast("App installed", "success");
      else if (outcome === "unavailable") setHowto(true);
    } else {
      setHowto(true);
    }
  };

  return (
    <>
      <button className={className} onClick={onClick}>
        ⬇️ {label}
      </button>
      {howto && (
        <Modal title="Install Kaamhai Admin" onClose={() => setHowto(false)}
          footer={<button className="btn primary" onClick={() => setHowto(false)}>Got it</button>}>
          {isIos() ? (
            <ol className="howto">
              <li>Open this site in <strong>Safari</strong> (not in-app browsers).</li>
              <li>Tap the <strong>Share</strong> button <span className="howto-ic">⬆️</span> at the bottom.</li>
              <li>Choose <strong>“Add to Home Screen”</strong>.</li>
              <li>Tap <strong>Add</strong> — Kaamhai Admin appears on your home screen.</li>
            </ol>
          ) : (
            <ol className="howto">
              <li>Use <strong>Chrome</strong> or <strong>Edge</strong> on this device.</li>
              <li>
                Look for the <strong>install icon</strong> <span className="howto-ic">⊕</span> at the right of the address bar,
                or open the <strong>⋮ menu</strong>.
              </li>
              <li>Choose <strong>“Install Kaamhai Admin”</strong> / <strong>“Add to Home screen”</strong>.</li>
              <li>Confirm <strong>Install</strong>.</li>
            </ol>
          )}
          <p className="form-hint" style={{ marginTop: 12 }}>
            Tip: the install option only appears on a secure (HTTPS) address or localhost.
          </p>
        </Modal>
      )}
    </>
  );
}
