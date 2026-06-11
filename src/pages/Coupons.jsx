import { useEffect, useRef, useState } from "react";
import {
  createCoupon,
  deleteCoupon,
  getCouponAssociations,
  getCouponDetail,
  getCouponRedemptions,
  getCoupons,
  searchCouponUsers,
  updateCoupon,
} from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const AUDIENCES = [
  { value: "all", label: "All users (B2B + B2C)" },
  { value: "b2b", label: "B2B — employers only" },
  { value: "b2c", label: "B2C — employees only" },
  { value: "association", label: "Association members" },
  { value: "users", label: "Specific users" },
];

const AUDIENCE_BADGE = {
  all: "All users", b2b: "B2B", b2c: "B2C",
  association: "Association", users: "Specific users",
};

const emptyForm = {
  code: "", title: "", description: "",
  type: "flat", value: "", maxDiscount: "", minOrderAmount: "",
  audience: "all", associationId: "", allowedUsers: [],
  usageLimit: "", perUserLimit: "", expiresAt: "", isActive: true,
};

const toForm = (c) => ({
  code: c.code || "",
  title: c.title || "",
  description: c.description || "",
  type: c.type || "flat",
  value: c.value ?? "",
  maxDiscount: c.maxDiscount || "",
  minOrderAmount: c.minOrderAmount || "",
  audience: c.audience || "all",
  associationId: c.associationId?._id || c.associationId || "",
  allowedUsers: c.allowedUsers || [],
  usageLimit: c.usageLimit || "",
  perUserLimit: c.perUserLimit || "",
  expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 10) : "",
  isActive: c.isActive !== false,
  _id: c._id,
});

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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
        const res = await searchCouponUsers({ search: q.trim(), type });
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
      <label>Allowed users — search by phone number, name or ID</label>
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Coupons() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("coupons", "edit");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState("");

  const [form, setForm] = useState(null); // create/edit modal
  const [busy, setBusy] = useState(false);
  const [associations, setAssociations] = useState([]);
  const [detail, setDetail] = useState(null); // redemptions modal
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const res = await getCoupons({ page: p, limit: 20, search: search || undefined, audience: audience || undefined, status: status || undefined });
      const d = res.data?.data || {};
      setRows(d.coupons || []);
      setPages(d.pages || 1);
      setTotal(d.total || 0);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); setPage(1); /* eslint-disable-line */ }, [search, audience, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(page); /* eslint-disable-line */ }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const ensureAssociations = async () => {
    if (associations.length) return;
    try {
      const res = await getCouponAssociations();
      setAssociations(res.data?.data || []);
    } catch {
      toast("Could not load associations", "error");
    }
  };

  const openCreate = () => { ensureAssociations(); setForm({ ...emptyForm }); };
  const openEdit = (c) => { ensureAssociations(); setForm(toForm(c)); };

  const openDetail = async (c) => {
    try {
      const [d, r] = await Promise.all([
        getCouponDetail(c._id),
        getCouponRedemptions(c._id, { page: 1, limit: 50 }),
      ]);
      setDetail({
        coupon: d.data?.data?.coupon || c,
        stats: d.data?.data?.stats || {},
        redemptions: r.data?.data?.redemptions || [],
        redemptionsTotal: r.data?.data?.total || 0,
      });
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load coupon detail", "error");
    }
  };

  const save = async () => {
    if (!form.code.trim()) return toast("Coupon code is required", "error");
    if (form.value === "" || Number(form.value) < 0) return toast("Discount value is required", "error");
    if (form.audience === "association" && !form.associationId) return toast("Pick an association", "error");
    if (form.audience === "users" && !form.allowedUsers.length) return toast("Add at least one user", "error");

    const payload = {
      code: form.code.trim().toUpperCase(),
      title: form.title,
      description: form.description,
      type: form.type,
      value: Number(form.value),
      maxDiscount: Number(form.maxDiscount) || 0,
      minOrderAmount: Number(form.minOrderAmount) || 0,
      audience: form.audience,
      associationId: form.audience === "association" ? form.associationId : null,
      allowedUsers: form.audience === "users" ? form.allowedUsers : [],
      usageLimit: Number(form.usageLimit) || 0,
      perUserLimit: Number(form.perUserLimit) || 0,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
      isActive: form.isActive,
    };

    setBusy(true);
    try {
      if (form._id) {
        await updateCoupon(form._id, payload);
        toast("Coupon updated", "success");
      } else {
        await createCoupon(payload);
        toast("Coupon created", "success");
      }
      setForm(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteCoupon(confirmDelete._id);
      toast("Coupon deleted", "success");
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "code", label: "Code", render: (r) => <strong>{r.code}</strong> },
    {
      key: "value", label: "Discount",
      render: (r) => (r.type === "flat" ? `₹${r.value}` : `${r.value}%${r.maxDiscount ? ` (max ₹${r.maxDiscount})` : ""}`),
    },
    {
      key: "audience", label: "Audience",
      render: (r) => (
        <span>
          <Badge value={AUDIENCE_BADGE[r.audience || "all"]} color="orange" />
          {r.audience === "association" && r.associationId?.name ? ` ${r.associationId.name}` : ""}
          {r.audience === "users" ? ` (${(r.allowedUsers || []).length})` : ""}
        </span>
      ),
    },
    {
      key: "usedCount", label: "Used",
      render: (r) => `${r.usedCount || 0}${r.usageLimit ? ` / ${r.usageLimit}` : ""}`,
    },
    { key: "perUserLimit", label: "Per user", render: (r) => (r.perUserLimit ? r.perUserLimit : "∞") },
    { key: "expiresAt", label: "Expires", render: (r) => fmtDate(r.expiresAt) },
    {
      key: "isActive", label: "Status",
      render: (r) => {
        const expired = r.expiresAt && new Date(r.expiresAt) < new Date();
        return <Badge value={!r.isActive ? "inactive" : expired ? "expired" : "active"} />;
      },
    },
    {
      key: "actions", label: "",
      render: (r) => (
        <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {canEdit && <button className="btn sm" onClick={() => openEdit(r)}>Edit</button>}
          {canEdit && <button className="btn sm danger" onClick={() => setConfirmDelete(r)}>Delete</button>}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="filters-bar">
        <input className="input" style={{ maxWidth: 220 }} placeholder="Search code / title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" style={{ maxWidth: 190 }} value={audience} onChange={(e) => setAudience(e.target.value)}>
          <option value="">All audiences</option>
          {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 140 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
        {canEdit && <button className="btn primary" onClick={openCreate}>+ New coupon</button>}
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={openDetail} emptyText="No coupons yet — create the first one" />
        <Pagination page={page} totalPages={pages} total={total} onChange={setPage} />
      </div>

      {/* ── Create / edit ── */}
      {form && (
        <Modal
          size="lg"
          title={form._id ? `Edit coupon — ${form.code}` : "New coupon"}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save coupon"}</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Code *</label>
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME50" />
            </div>
            <div className="field">
              <label>Title (shown in app)</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Welcome offer" />
            </div>
            <div className="field full">
              <label>Description</label>
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short line shown under the coupon" />
            </div>

            <div className="field">
              <label>Discount type *</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="flat">Flat ₹</option>
                <option value="percentage">Percentage %</option>
              </select>
            </div>
            <div className="field">
              <label>{form.type === "flat" ? "Amount (₹) *" : "Percentage (%) *"}</label>
              <input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            {form.type === "percentage" && (
              <div className="field">
                <label>Max discount ₹ (0 = no cap)</label>
                <input className="input" type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label>Min order ₹ (0 = none)</label>
              <input className="input" type="number" value={form.minOrderAmount} onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })} />
            </div>

            <div className="field">
              <label>Audience *</label>
              <select
                className="input"
                value={form.audience}
                onChange={(e) => { setForm({ ...form, audience: e.target.value }); if (e.target.value === "association") ensureAssociations(); }}
              >
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>

            {form.audience === "association" && (
              <div className="field">
                <label>Association *</label>
                <select className="input" value={form.associationId} onChange={(e) => setForm({ ...form, associationId: e.target.value })}>
                  <option value="">Select association…</option>
                  {associations.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            )}

            {form.audience === "users" && (
              <UserPicker selected={form.allowedUsers} onChange={(allowedUsers) => setForm({ ...form, allowedUsers })} />
            )}

            <div className="field">
              <label>Total usage limit (0 = unlimited)</label>
              <input className="input" type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
            </div>
            <div className="field">
              <label>Per-user limit (0 = unlimited)</label>
              <input className="input" type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} />
            </div>
            <div className="field">
              <label>Expiry date (empty = never)</label>
              <input className="input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </div>
            <div className="field">
              <label>Active</label>
              <button type="button" className={`switch${form.isActive ? " on" : ""}`} onClick={() => setForm({ ...form, isActive: !form.isActive })}>
                <span className="knob" />
                <span className="switch-label">{form.isActive ? "Yes" : "No"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Detail + redemptions ── */}
      {detail && (
        <Modal size="lg" title={`Coupon — ${detail.coupon.code}`} onClose={() => setDetail(null)}>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="field"><label>Total uses</label><div>{detail.stats.totalRedemptions ?? detail.coupon.usedCount ?? 0}</div></div>
            <div className="field"><label>Unique users</label><div>{detail.stats.uniqueUsers ?? "—"}</div></div>
            <div className="field"><label>Total discount given</label><div>₹{(detail.stats.totalDiscount || 0).toLocaleString("en-IN")}</div></div>
            <div className="field"><label>Audience</label><div>{AUDIENCE_BADGE[detail.coupon.audience || "all"]}{detail.coupon.associationId?.name ? ` — ${detail.coupon.associationId.name}` : ""}</div></div>
          </div>

          <h4 style={{ margin: "10px 0 6px" }}>Who used this coupon</h4>
          <DataTable
            columns={[
              { key: "user", label: "User", render: (r) => r.user?.name || "—" },
              { key: "phone", label: "Phone", render: (r) => r.user?.phoneNumber || r.phoneNumber || "—" },
              { key: "userType", label: "Type", render: (r) => <Badge value={r.userType === "employee" ? "B2C" : "B2B"} color={r.userType === "employee" ? "green" : "orange"} /> },
              { key: "purpose", label: "Used for", render: (r) => r.purpose || "—" },
              { key: "discount", label: "Discount", render: (r) => `₹${r.discount || 0}` },
              { key: "usedAt", label: "When", render: (r) => fmtDate(r.usedAt) },
            ]}
            rows={detail.redemptions}
            loading={false}
            emptyText="No one has used this coupon yet"
            rowKey={(r) => r._id}
          />
        </Modal>
      )}

      {/* ── Delete confirm ── */}
      {confirmDelete && (
        <Modal
          title={`Delete coupon ${confirmDelete.code}?`}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn danger" onClick={doDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
            </>
          }
        >
          <p>This removes the coupon permanently. Redemption history is kept for audit. Users will no longer be able to apply this code.</p>
        </Modal>
      )}
    </div>
  );
}
