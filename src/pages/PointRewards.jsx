import { useEffect, useState } from "react";
import { getPointRewards, upsertPointReward } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

export default function PointRewards() {
  const toast = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getPointRewards();
      setRows(res.data?.data || []);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load rewards", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!editing.key || editing.amount === "") {
      toast("Key and amount are required", "error");
      return;
    }
    setBusy(true);
    try {
      await upsertPointReward({
        key: editing.key,
        amount: Number(editing.amount),
        description: editing.description,
        isActive: editing.isActive,
      });
      toast("Reward saved", "success");
      setEditing(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "key", label: "Event key" },
    { key: "amount", label: "Points" },
    { key: "description", label: "Description", render: (r) => r.description || "—" },
    { key: "isActive", label: "Active", render: (r) => <Badge value={r.isActive !== false ? "active" : "inactive"} /> },
    {
      key: "actions",
      label: "",
      render: (r) => can("point-rewards", "edit") && (
        <button
          className="btn sm"
          onClick={() =>
            setEditing({
              key: r.key,
              amount: r.amount,
              description: r.description || "",
              isActive: r.isActive !== false,
              existing: true,
            })
          }
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="filters-bar">
        {can("point-rewards", "edit") && (
          <button
            className="btn primary"
            onClick={() => setEditing({ key: "", amount: "", description: "", isActive: true })}
          >
            + New reward
          </button>
        )}
      </div>
      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} rowKey={(r) => r._id || r.key} />
      </div>

      {editing && (
        <Modal
          title={editing.existing ? `Edit reward — ${editing.key}` : "New reward"}
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
              <label>Event key</label>
              <input
                className="input"
                value={editing.key}
                disabled={editing.existing}
                onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                placeholder="e.g. referral_signup"
              />
            </div>
            <div className="field">
              <label>Points amount</label>
              <input
                className="input"
                type="number"
                value={editing.amount}
                onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
              />
            </div>
            <div className="field full">
              <label>Description</label>
              <input
                className="input"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
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
