import { useEffect, useRef, useState } from "react";
import {
  sendAdminNotification,
  getNotificationCampaigns,
  searchNotificationUsers,
  getNotificationTemplates,
  upsertNotificationTemplate,
} from "../api/endpoints";
import Badge from "../components/Badge";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const AUDIENCES = [
  { value: "all", label: "All users (B2B + B2C)" },
  { value: "b2c", label: "B2C — employees only" },
  { value: "b2b", label: "B2B — employers only" },
  { value: "users", label: "Specific users" },
];

const AUDIENCE_BADGE = { all: "All users", b2c: "B2C", b2b: "B2B", users: "Specific users" };

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// ── User picker (audience: specific users) ────────────────────────────────────
function UserPicker({ selected, onChange }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchNotificationUsers({ search: q.trim(), type });
        setResults(res.data?.data || []);
      } catch (err) {
        toast(err.response?.data?.message || "User search failed", "error");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type]);

  const isPicked = (u) => selected.some((s) => String(s.userId) === String(u.userId));
  const add = (u) => { if (!isPicked(u)) onChange([...selected, u]); };
  const remove = (u) => onChange(selected.filter((s) => String(s.userId) !== String(u.userId)));

  return (
    <div className="field full">
      <label>Recipients — search by phone number, name or ID</label>
      <div style={{ display: "flex", gap: 8 }}>
        <select className="input" style={{ maxWidth: 140 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">B2B + B2C</option>
          <option value="b2c">Employees</option>
          <option value="b2b">Employers</option>
        </select>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. 9876543210 or a name"
        />
      </div>

      {searching && <div className="loading" style={{ padding: 8 }}>Searching…</div>}
      {!searching && results.length > 0 && (
        <div className="panel" style={{ marginTop: 8, maxHeight: 180, overflowY: "auto" }}>
          {results.map((u) => (
            <div
              key={`${u.userType}-${u.userId}`}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderBottom: "1px solid var(--border, #eee)" }}
            >
              <span>
                {u.name || "(no name)"} · {u.phoneNumber || "—"}{" "}
                <Badge value={u.userType === "employee" ? "B2C" : "B2B"} color={u.userType === "employee" ? "green" : "orange"} />
              </span>
              <button type="button" className="btn sm" disabled={isPicked(u)} onClick={() => add(u)}>
                {isPicked(u) ? "Added" : "+ Add"}
              </button>
            </div>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {selected.map((u) => (
            <span key={`${u.userType}-${u.userId}`} className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {(u.name || u.phoneNumber || String(u.userId).slice(-6))} ({u.userType === "employee" ? "B2C" : "B2B"})
              <button type="button" className="icon-btn" style={{ padding: 0 }} onClick={() => remove(u)}>✕</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Templates tab — DB-managed copy, B2B/B2C variants ─────────────────────────
function TemplatesTab({ canEdit }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState({}); // id -> edited fields

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotificationTemplates();
      setRows(res.data?.data || []);
      setDraft({});
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-line */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const edit = (t, field, value) =>
    setDraft((d) => ({ ...d, [t._id]: { ...t, ...d[t._id], [field]: value } }));
  const valOf = (t, field) => (draft[t._id]?.[field] !== undefined ? draft[t._id][field] : t[field]);

  const save = async (t) => {
    const merged = { ...t, ...draft[t._id] };
    try {
      await upsertNotificationTemplate({
        key: merged.key,
        audience: merged.audience,
        title: merged.title,
        body: merged.body,
        imageUrl: merged.imageUrl || "",
        delayMinutes: Number(merged.delayMinutes) || 0,
        enabled: merged.enabled !== false,
        label: merged.label || "",
      });
      toast("Template saved", "success");
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save template", "error");
    }
  };

  if (loading) return <div className="loading" style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <p className="muted">
        Edit the copy for automated notifications. The <strong>verify_reminder</strong> template is sent
        as a push ~{rows[0]?.delayMinutes ?? 30} min after signup to new users who haven't verified —
        with separate messages for employers (B2B) and job seekers (B2C).
      </p>
      {rows.map((t) => (
        <div key={t._id} className="panel" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <strong>{t.label || t.key}</strong>
            <Badge value={t.audience === "b2c" ? "B2C" : "B2B"} color={t.audience === "b2c" ? "green" : "orange"} />
            <span className="muted" style={{ fontSize: 12 }}>key: {t.key}</span>
          </div>
          <div className="field">
            <label>Title</label>
            <input className="input" value={valOf(t, "title")} maxLength={80} disabled={!canEdit}
              onChange={(e) => edit(t, "title", e.target.value)} />
          </div>
          <div className="field">
            <label>Message</label>
            <textarea className="input" rows={2} value={valOf(t, "body")} maxLength={240} disabled={!canEdit}
              onChange={(e) => edit(t, "body", e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label>Image URL (optional)</label>
              <input className="input" value={valOf(t, "imageUrl") || ""} disabled={!canEdit}
                onChange={(e) => edit(t, "imageUrl", e.target.value)} placeholder="https://…" />
            </div>
            <div className="field" style={{ maxWidth: 130 }}>
              <label>Delay (min)</label>
              <input className="input" type="number" min={0} value={valOf(t, "delayMinutes") ?? 30} disabled={!canEdit}
                onChange={(e) => edit(t, "delayMinutes", e.target.value)} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <input type="checkbox" checked={valOf(t, "enabled") !== false} disabled={!canEdit}
                onChange={(e) => edit(t, "enabled", e.target.checked)} />
              Enabled
            </label>
            <button className="btn primary" disabled={!canEdit} onClick={() => save(t)} style={{ marginBottom: 10 }}>
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const emptyForm = { title: "", body: "", imageUrl: "", audience: "all", targetUsers: [] };

export default function Notifications() {
  const toast = useToast();
  const { can } = useAuth();
  const canSend = can("notifications", "edit");
  const [tab, setTab] = useState("send"); // send | templates

  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await getNotificationCampaigns({ page: 1, limit: 30 });
      setCampaigns(res.data?.data || []);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load history", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); /* eslint-disable-line */ }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast("Title is required", "error");
    if (!form.body.trim()) return toast("Message body is required", "error");
    if (form.audience === "users" && form.targetUsers.length === 0) {
      return toast("Select at least one recipient", "error");
    }
    setSending(true);
    try {
      const res = await sendAdminNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        imageUrl: form.imageUrl.trim(),
        audience: form.audience,
        targetUsers: form.audience === "users" ? form.targetUsers : [],
      });
      toast(res.data?.message || "Notification sent", "success");
      setForm(emptyForm);
      loadHistory();
    } catch (err) {
      toast(err.response?.data?.message || "Failed to send notification", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Notifications</h1>
        <p className="muted">Send promotional push + in-app notifications, and manage automated message templates.</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button className={`btn ${tab === "send" ? "primary" : ""}`} onClick={() => setTab("send")}>Send notification</button>
        <button className={`btn ${tab === "templates" ? "primary" : ""}`} onClick={() => setTab("templates")}>Message templates</button>
      </div>

      {tab === "templates" ? (
        <TemplatesTab canEdit={canSend} />
      ) : (
      <>
      <div className="panel" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={submit} className="form-grid">
          <div className="field full">
            <label>Title *</label>
            <input className="input" value={form.title} maxLength={80}
              onChange={(e) => set("title", e.target.value)} placeholder="e.g. New jobs near you!" />
          </div>

          <div className="field full">
            <label>Message *</label>
            <textarea className="input" rows={3} value={form.body} maxLength={240}
              onChange={(e) => set("body", e.target.value)} placeholder="Notification message body…" />
          </div>

          <div className="field full">
            <label>Image URL (optional) — shown as a big picture in the notification</label>
            <input className="input" value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://… (public PNG/JPG URL)" />
            {form.imageUrl ? (
              <img src={form.imageUrl} alt="preview" style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, objectFit: "cover" }}
                onError={(e) => { e.target.style.display = "none"; }} />
            ) : null}
          </div>

          <div className="field">
            <label>Audience</label>
            <select className="input" value={form.audience} onChange={(e) => set("audience", e.target.value)}>
              {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          {form.audience === "users" && (
            <UserPicker selected={form.targetUsers} onChange={(v) => set("targetUsers", v)} />
          )}

          <div className="field full" style={{ marginTop: 8 }}>
            <button type="submit" className="btn primary" disabled={!canSend || sending}>
              {sending ? "Sending…" : "Send Notification"}
            </button>
            {!canSend && <span className="muted" style={{ marginLeft: 12 }}>You don't have permission to send.</span>}
          </div>
        </form>
      </div>

      <h2 style={{ margin: "0 0 12px" }}>Sent history</h2>
      <div className="panel">
        {loading ? (
          <div className="loading" style={{ padding: 16 }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="muted" style={{ padding: 16 }}>No notifications sent yet.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Message</th><th>Audience</th><th>Recipients</th><th>Image</th><th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id}>
                  <td><strong>{c.title}</strong></td>
                  <td style={{ maxWidth: 280 }}>{c.body}</td>
                  <td><Badge value={AUDIENCE_BADGE[c.audience] || c.audience} /></td>
                  <td>{c.recipientCount ?? 0}</td>
                  <td>{c.imageUrl ? <a href={c.imageUrl} target="_blank" rel="noreferrer">view</a> : "—"}</td>
                  <td>{fmtDateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}
    </div>
  );
}
