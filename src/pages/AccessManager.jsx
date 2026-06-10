import { useEffect, useMemo, useState } from "react";
import {
  createAdminAccount,
  deleteAdminAccount,
  getAdminAccounts,
  updateAdminAccount,
} from "../api/endpoints";
import { GROUPS, resourceKey } from "../resources";
import { useAuth } from "../context/AuthContext";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";

const ACTIONS = ["view", "create", "edit", "delete"];

// All grantable resources, grouped like the sidebar (Access Manager excluded —
// it is superadmin-only by design).
const PERM_GROUPS = GROUPS.map((g) => ({
  group: g.group,
  items: g.items
    .filter((it) => !it.superOnly)
    .map((it) => ({ key: resourceKey(it), label: it.label })),
})).filter((g) => g.items.length > 0);

const ALL_KEYS = PERM_GROUPS.flatMap((g) => g.items.map((it) => it.key));

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

// permissions array <-> matrix map { resource: Set(actions) }
const toMatrix = (permissions) => {
  const m = {};
  for (const p of permissions || []) m[p.resource] = new Set(p.actions || []);
  return m;
};
const fromMatrix = (m) =>
  Object.entries(m)
    .filter(([, set]) => set.size > 0)
    .map(([resource, set]) => ({ resource, actions: [...set] }));

function PermissionMatrix({ matrix, onChange }) {
  const toggle = (key, action) => {
    const next = { ...matrix, [key]: new Set(matrix[key] || []) };
    if (next[key].has(action)) next[key].delete(action);
    else {
      next[key].add(action);
      if (action !== "view") next[key].add("view"); // anything implies view
    }
    onChange(next);
  };

  const rowAll = (key) => {
    const set = matrix[key] || new Set();
    const full = ACTIONS.every((a) => set.has(a));
    onChange({ ...matrix, [key]: full ? new Set() : new Set(ACTIONS) });
  };

  const groupAll = (items) => {
    const full = items.every((it) => ACTIONS.every((a) => matrix[it.key]?.has(a)));
    const next = { ...matrix };
    for (const it of items) next[it.key] = full ? new Set() : new Set(ACTIONS);
    onChange(next);
  };

  const presets = (mode) => {
    const next = {};
    if (mode === "viewAll") for (const k of ALL_KEYS) next[k] = new Set(["view"]);
    if (mode === "fullAll") for (const k of ALL_KEYS) next[k] = new Set(ACTIONS);
    onChange(next);
  };

  return (
    <div>
      <div className="filters-bar" style={{ marginBottom: 10 }}>
        <button type="button" className="btn sm" onClick={() => presets("viewAll")}>View-only everything</button>
        <button type="button" className="btn sm" onClick={() => presets("fullAll")}>Full access everything</button>
        <button type="button" className="btn sm" onClick={() => presets("clear")}>Clear all</button>
      </div>
      <div className="perm-matrix">
        <div className="perm-head">
          <div>Page / Collection</div>
          {ACTIONS.map((a) => (
            <div key={a} className="perm-action">{a}</div>
          ))}
          <div className="perm-action">all</div>
        </div>
        {PERM_GROUPS.map((g) => (
          <div key={g.group}>
            <div className="perm-group-row">
              <span>{g.group}</span>
              <button type="button" className="btn sm" onClick={() => groupAll(g.items)}>
                Toggle group
              </button>
            </div>
            {g.items.map((it) => {
              const set = matrix[it.key] || new Set();
              return (
                <div className="perm-row" key={it.key}>
                  <div className="perm-label" title={it.key}>{it.label}</div>
                  {ACTIONS.map((a) => (
                    <div key={a} className="perm-action">
                      <input
                        type="checkbox"
                        checked={set.has(a)}
                        onChange={() => toggle(it.key, a)}
                      />
                    </div>
                  ))}
                  <div className="perm-action">
                    <input
                      type="checkbox"
                      checked={ACTIONS.every((a) => set.has(a))}
                      onChange={() => rowAll(it.key)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AccessManager() {
  const toast = useToast();
  const { admin: me, refreshAccess } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  // { mode: 'create' | 'edit', id?, name, phoneNumber, password, role, isActive, matrix }
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminAccounts();
      setRows(res.data?.data || []);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load admins", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const supers = rows.filter((r) => !r.role || r.role === "superadmin").length;
    return {
      total: rows.length,
      superadmins: supers,
      admins: rows.length - supers,
      disabled: rows.filter((r) => r.isActive === false).length,
    };
  }, [rows]);

  const openCreate = () =>
    setForm({
      mode: "create",
      name: "",
      phoneNumber: "",
      password: "",
      role: "admin",
      isActive: true,
      matrix: {},
    });

  const openEdit = (r) =>
    setForm({
      mode: "edit",
      id: r._id,
      name: r.name || "",
      phoneNumber: r.phoneNumber,
      password: "",
      role: r.role || "superadmin",
      isActive: r.isActive !== false,
      matrix: toMatrix(r.permissions),
    });

  const save = async () => {
    if (!form.name.trim() || !form.phoneNumber.trim()) {
      toast("Name and phone number are required", "error");
      return;
    }
    if (form.mode === "create" && form.password.length < 6) {
      toast("Password must be at least 6 characters", "error");
      return;
    }
    if (form.role === "admin" && fromMatrix(form.matrix).length === 0) {
      toast("Grant at least one permission, or make them a super admin", "error");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        isActive: form.isActive,
        permissions: form.role === "admin" ? fromMatrix(form.matrix) : [],
      };
      if (form.mode === "create") {
        await createAdminAccount({ ...payload, phoneNumber: form.phoneNumber.trim(), password: form.password });
        toast("Admin created", "success");
      } else {
        if (form.password) payload.password = form.password;
        await updateAdminAccount(form.id, payload);
        toast("Admin updated", "success");
      }
      setForm(null);
      load();
      refreshAccess();
    } catch (err) {
      toast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteAdminAccount(deleting._id);
      toast("Admin deleted", "success");
      setDeleting(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const isSelf = (r) => String(r._id) === String(me?._id);

  const columns = [
    { key: "name", label: "Name", render: (r) => `${r.name}${isSelf(r) ? " (you)" : ""}` },
    { key: "phoneNumber", label: "Phone" },
    {
      key: "role",
      label: "Role",
      render: (r) =>
        !r.role || r.role === "superadmin" ? (
          <Badge value="super admin" color="indigo" />
        ) : (
          <Badge value="admin" />
        ),
    },
    {
      key: "perms",
      label: "Access",
      render: (r) =>
        !r.role || r.role === "superadmin"
          ? "Everything"
          : `${(r.permissions || []).length} page${(r.permissions || []).length === 1 ? "" : "s"}`,
    },
    {
      key: "isActive",
      label: "Status",
      render: (r) => <Badge value={r.isActive === false ? "disabled" : "active"} />,
    },
    { key: "createdBy", label: "Created by", render: (r) => r.createdBy?.name || "—" },
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn sm" onClick={() => openEdit(r)}>Edit</button>
          {!isSelf(r) && (
            <button className="btn sm ghost-danger" onClick={() => setDeleting(r)}>
              Delete
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="stat-grid">
        <StatCard label="Admin accounts" value={stats.total} />
        <StatCard label="Super admins" value={stats.superadmins} sub="full access" />
        <StatCard label="Restricted admins" value={stats.admins} sub="custom permissions" />
        <StatCard label="Disabled" value={stats.disabled} />
      </div>

      <div className="filters-bar">
        <button className="btn primary" onClick={openCreate}>+ Create admin</button>
        <span style={{ color: "var(--text-soft)", fontSize: 13 }}>
          Super admins can do everything. Restricted admins only see and act on what you grant below.
        </span>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={openEdit} />
      </div>

      {form && (
        <Modal
          title={form.mode === "create" ? "Create admin" : `Edit admin — ${form.name || form.phoneNumber}`}
          onClose={() => setForm(null)}
          size="lg"
          footer={
            <>
              <button className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : form.mode === "create" ? "Create admin" : "Save changes"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Name<span className="req-star">*</span></label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Phone number<span className="req-star">*</span></label>
              <input
                className="input"
                value={form.phoneNumber}
                disabled={form.mode === "edit"}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
            </div>
            <div className="field">
              <label>
                Password{form.mode === "create" && <span className="req-star">*</span>}
              </label>
              <input
                className="input"
                type="password"
                placeholder={form.mode === "edit" ? "Leave blank to keep current" : "Min 6 characters"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Role</label>
              <select
                className="select"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="admin">Admin (restricted access)</option>
                <option value="superadmin">Super admin (full access)</option>
              </select>
            </div>
            <div className="field">
              <label>Account status</label>
              <button
                type="button"
                className={`switch${form.isActive ? " on" : ""}`}
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
              >
                <span className="knob" />
                <span className="switch-label">{form.isActive ? "Active" : "Disabled"}</span>
              </button>
            </div>
          </div>

          {form.role === "superadmin" ? (
            <p className="form-hint" style={{ fontSize: 13 }}>
              Super admins have unrestricted access to every page, every collection, and the Access
              Manager itself — including creating other admins and super admins.
            </p>
          ) : (
            <>
              <div className="form-section-title">Page & data permissions</div>
              <PermissionMatrix
                matrix={form.matrix}
                onChange={(matrix) => setForm({ ...form, matrix })}
              />
            </>
          )}
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Delete admin — ${deleting.name}?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "Deleting…" : "Delete admin"}
              </button>
            </>
          }
        >
          <p>
            {deleting.name} ({deleting.phoneNumber}) will lose access to the admin panel immediately.
            This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  );
}
