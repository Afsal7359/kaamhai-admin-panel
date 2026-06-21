// Global install-prompt manager. The browser's `beforeinstallprompt` fires
// once, early — we capture it here (imported first in main.jsx) so any part of
// the UI can trigger install later, and components can subscribe to changes.

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

export const isIos = () =>
  typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const canPrompt = () => Boolean(deferredPrompt);

// Returns: "accepted" | "dismissed" | "unavailable"
export const promptInstall = async () => {
  if (!deferredPrompt) return "unavailable";
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
  return outcome;
};

export const onInstallChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
