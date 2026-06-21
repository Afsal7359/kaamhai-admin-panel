import { useEffect, useState } from "react";

// Default app download link (AppsFlyer OneLink → routes to the right store).
export const DEFAULT_APP_URL = "https://kaamhai.onelink.me/FcOC/u7va2q0v";

// Mirrors backend buildVerificationMessage() so the admin previews the exact text.
export const buildMessage = ({ audience, kind, reason, url }) => {
  const link = url || DEFAULT_APP_URL;
  if (kind === "verified") {
    return audience === "b2b"
      ? `Congratulations! Your Kaamhai business is verified. You can now post jobs and manage your workforce. Open the app: ${link}`
      : `Congratulations! Your Kaamhai identity is verified. You can now apply for jobs. Open the app: ${link}`;
  }
  const why = reason && reason.trim() ? reason.trim() : "Your documents could not be verified.";
  return `Your Kaamhai verification could not be completed. Reason: ${why}. Please re-upload your documents in the app: ${link}`;
};

/**
 * Composer for the message sent to a user/employer on verify or reject.
 * Controlled via `value` = { enabled, sendSms, url, text } and onChange.
 * The text auto-syncs to the template while the admin hasn't manually edited it.
 */
export default function MessageComposer({ audience, kind, reason, value, onChange }) {
  const [touched, setTouched] = useState(false);

  // Keep the preview in sync with reason/url until the admin edits it by hand.
  useEffect(() => {
    if (!touched) {
      onChange({ ...value, text: buildMessage({ audience, kind, reason, url: value.url }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, kind, reason, value.url, touched]);

  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="msg-composer">
      <label className="msg-check">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
        <span>
          {kind === "verified"
            ? "Send a message to the user"
            : "Notify the user & ask them to re-upload documents"}
        </span>
      </label>

      {value.enabled && (
        <div className="msg-body">
          <div className="field">
            <label>App link</label>
            <input
              className="input"
              value={value.url}
              placeholder={DEFAULT_APP_URL}
              onChange={(e) => set({ url: e.target.value })}
            />
            <span className="form-hint">Included in the message — routes the user to the app store / app.</span>
          </div>

          <div className="field">
            <label>
              Message preview {touched && <span className="form-hint">(edited)</span>}
            </label>
            <textarea
              className="textarea"
              rows={4}
              value={value.text}
              onChange={(e) => {
                setTouched(true);
                set({ text: e.target.value });
              }}
            />
            <div className="msg-meta">
              <span className="form-hint">{value.text.length} chars</span>
              {touched && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    setTouched(false);
                    set({ text: buildMessage({ audience, kind, reason, url: value.url }) });
                  }}
                >
                  Reset to template
                </button>
              )}
            </div>
          </div>

          <label className="msg-check">
            <input
              type="checkbox"
              checked={value.sendSms}
              onChange={(e) => set({ sendSms: e.target.checked })}
            />
            <span>
              Also send by SMS to their phone <span className="form-hint">(in-app notification is always sent)</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

// Card that shows a message that was already sent (after verify/reject).
export function SentMessageCard({ record }) {
  if (!record) return null;
  const ch = record.channels || {};
  return (
    <div className={`sent-msg ${record.kind === "verified" ? "ok" : "warn"}`}>
      <div className="sent-msg-head">
        <span className="sent-msg-title">
          {record.kind === "verified" ? "✓ Message sent" : "⚠ Re-upload request sent"}
        </span>
        <span className="form-hint">{record.sentAt ? new Date(record.sentAt).toLocaleString("en-IN") : ""}</span>
      </div>
      <div className="sent-msg-text">{record.text}</div>
      <div className="sent-msg-channels">
        {ch.inApp && <span className="chip">In-app ✓</span>}
        {ch.push && <span className="chip">Push ✓</span>}
        {ch.sms && (
          <span className={`chip ${record.smsStatus === "sent" ? "ok" : record.smsStatus === "failed" ? "bad" : ""}`}>
            SMS {record.smsStatus === "sent" ? "✓" : record.smsStatus === "failed" ? "failed" : record.smsStatus}
          </span>
        )}
      </div>
    </div>
  );
}
