import { useEffect, useState } from "react";
import { getIndustries, createIndustry, updateIndustry, deleteIndustry } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const RESOURCE = "industries";

export default function Industries() {
  const toast = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getIndustries();
      setRows(res.data?.data || []);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load industries", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    if (!editing.name?.trim()) {
      toast("Industry name is required", "error");
      return;
    }
    const subCategories = String(editing.subCategoriesText || "")
      .split("\n").map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    try {
      const payload = {
        name: editing.name.trim(),
        subCategories,
        isActive: editing.isActive !== false,
        position: Number(editing.position) || 0,
      };
      if (editing._id) await updateIndustry(editing._id, payload);
      else await createIndustry(payload);
      toast("Industry saved", "success");
      setEditing(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete industry "${r.name}"? Employers who already picked it keep their value.`)) return;
    try {
      await deleteIndustry(r._id);
      toast("Industry deleted", "success");
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  const openEdit = (r) =>
    setEditing(
      r
        ? { ...r, subCategoriesText: (r.subCategories || []).join("\n") }
        : { name: "", subCategoriesText: "", isActive: true, position: rows.length },
    );

  const columns = [
    { key: "position", label: "#", render: (r) => r.position ?? "—" },
    { key: "name", label: "Industry" },
    {
      key: "subCategories",
      label: "Sub-categories",
      render: (r) => (
        <span title={(r.subCategories || []).join(", ")}>
          {(r.subCategories || []).length} · {(r.subCategories || []).slice(0, 3).join(", ")}
          {(r.subCategories || []).length > 3 ? "…" : ""}
        </span>
      ),
    },
    { key: "isActive", label: "Active", render: (r) => <Badge value={r.isActive !== false ? "active" : "inactive"} /> },
    {
      key: "actions",
      label: "",
      render: (r) =>
        can(RESOURCE, "edit") && (
          <span style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={() => openEdit(r)}>Edit</button>
            <button className="btn sm danger" onClick={() => remove(r)}>Delete</button>
          </span>
        ),
    },
  ];

  return (
    <div>
      <div className="filters-bar">
        {can(RESOURCE, "edit") && (
          <button className="btn primary" onClick={() => openEdit(null)}>+ New industry</button>
        )}
      </div>
      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} rowKey={(r) => r._id} />
      </div>

      {editing && (
        <Modal
          title={editing._id ? `Edit — ${editing.name}` : "New industry"}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field">
              <label>Industry name</label>
              <input
                className="input"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Hospitality & Tourism"
              />
            </div>
            <div className="field">
              <label>Display order</label>
              <input
                className="input"
                type="number"
                value={editing.position ?? 0}
                onChange={(e) => setEditing({ ...editing, position: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Sub-categories (one per line)</label>
              <textarea
                className="input"
                rows={8}
                value={editing.subCategoriesText}
                onChange={(e) => setEditing({ ...editing, subCategoriesText: e.target.value })}
                placeholder={"Hotel\nRestaurant\nCafé\nCloud Kitchen"}
              />
            </div>
            <div className="field">
              <label>Active</label>
              <button
                type="button"
                className={`switch${editing.isActive ? " on" : ""}`}
                onClick={() => setEditing({ ...editing, isActive: !editing.isActive })}
              >
                <span className="knob" />
                <span className="switch-label">{editing.isActive ? "Yes" : "No"}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
