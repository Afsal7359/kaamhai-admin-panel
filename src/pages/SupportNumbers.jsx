import { useEffect, useState } from "react";
import { createDocument, getDocuments, updateDocument } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const MODEL = "supportConfig";

const FIELDS = [
  {
    group: "Employee app (B2C)",
    icon: "👷",
    items: [
      { key: "employeeSupportWhatsapp", label: "Support WhatsApp number", placeholder: "+91XXXXXXXXXX" },
      { key: "employeeSupportEmail", label: "Support email", placeholder: "support@kaamhai.in" },
    ],
  },
  {
    group: "Employer app (B2B)",
    icon: "🏢",
    items: [
      { key: "employerSupportWhatsapp", label: "Support WhatsApp number", placeholder: "+91XXXXXXXXXX" },
      { key: "employerSupportEmail", label: "Support email", placeholder: "business@kaamhai.in" },
    ],
  },
];

export default function SupportNumbers() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can(MODEL, "edit") || can(MODEL, "create");
  const [docId, setDocId] = useState(null);
  const [values, setValues] = useState({});
  const [initial, setInitial] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Singleton config — the app reads the first document.
      const res = await getDocuments(MODEL, { limit: 1 });
      const doc = (res.data?.data || [])[0] || null;
      const v = {
        employeeSupportWhatsapp: doc?.employeeSupportWhatsapp || "",
        employeeSupportEmail: doc?.employeeSupportEmail || "",
        employerSupportWhatsapp: doc?.employerSupportWhatsapp || "",
        employerSupportEmail: doc?.employerSupportEmail || "",
      };
      setDocId(doc?._id || null);
      setValues(v);
      setInitial(v);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load support config", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const save = async () => {
    setBusy(true);
    try {
      if (docId) {
        await updateDocument(MODEL, docId, values);
      } else {
        await createDocument(MODEL, values);
      }
      toast("Support contacts saved — live in the app immediately", "success");
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="loading">Loading support contacts…</div>;

  return (
    <div style={{ maxWidth: 860 }}>
      <p style={{ color: "var(--text-soft)", marginTop: 0 }}>
        These contact details are shown on the in-app Support screens. Employees and employers can be
        routed to different WhatsApp numbers and mailboxes. Changes apply to the apps immediately.
      </p>

      <div className="chart-grid">
        {FIELDS.map((g) => (
          <div className="panel panel-pad" key={g.group}>
            <h3 className="panel-title">
              {g.icon} {g.group}
            </h3>
            {g.items.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
                <input
                  className="input"
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  disabled={!canEdit}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
                {values[f.key] && f.key.includes("Whatsapp") && (
                  <span className="form-hint">
                    Opens chat:{" "}
                    <a
                      href={`https://wa.me/${values[f.key].replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      wa.me/{values[f.key].replace(/[^\d]/g, "")}
                    </a>
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="filters-bar" style={{ marginTop: 18 }}>
          <button className="btn primary" onClick={save} disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save support contacts"}
          </button>
          {dirty && (
            <button className="btn" onClick={() => setValues(initial)} disabled={busy}>
              Discard changes
            </button>
          )}
          {!dirty && <span style={{ color: "var(--text-soft)", fontSize: 13 }}>All changes saved</span>}
        </div>
      )}
    </div>
  );
}
