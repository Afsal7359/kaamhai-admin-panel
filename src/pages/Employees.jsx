import { useEffect, useState } from "react";
import { getEmployees, updateBasicDetails } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export default function Employees() {
  const toast = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [applied, setApplied] = useState("");

  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (aadhar) params.aadharVerified = aadhar;
      if (applied) params.appliedJobs = applied;
      const res = await getEmployees(params);
      setRows(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (u) => {
    setEditing({
      id: u._id,
      name: u.basicDetails?.name || "",
      email: u.basicDetails?.email || "",
      city: u.basicDetails?.city || "",
      gender: u.basicDetails?.gender || "",
      dateOfBirth: u.basicDetails?.dateOfBirth || "",
    });
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await updateBasicDetails(editing);
      toast("Details updated", "success");
      setEditing(null);
      setSelected(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "name", label: "Name", render: (r) => r.basicDetails?.name || "—" },
    { key: "phoneNumber", label: "Phone" },
    { key: "city", label: "City", render: (r) => r.basicDetails?.city || "—" },
    {
      key: "roles",
      label: "Job Roles",
      render: (r) =>
        (r.workPreference?.jobRole || [])
          .map((j) => (typeof j === "string" ? j : j?.name))
          .filter(Boolean)
          .join(", ") || "—",
    },
    {
      key: "verified",
      label: "Verified",
      render: (r) => <Badge value={r.isPrimaryVerified || r.isEmployeeVerified ? "verified" : "pending"} />,
    },
    {
      key: "employee",
      label: "Working",
      render: (r) => <Badge value={r.isCurrentEmployee ? "active" : "no"} color={r.isCurrentEmployee ? "green" : ""} />,
    },
    { key: "appliedJobsCount", label: "Applied", render: (r) => r.totalAppliedJobs ?? 0 },
    { key: "createdAt", label: "Joined", render: (r) => fmtDate(r.createdAt) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn sm" onClick={() => setSelected(r)}>
            View
          </button>
          {can("employees", "edit") && (
            <button className="btn sm" onClick={() => startEdit(r)}>
              Edit
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="filters-bar">
        <input
          className="input"
          placeholder="Search name / phone / city / role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select className="select" value={aadhar} onChange={(e) => setAadhar(e.target.value)}>
          <option value="">Aadhaar: all</option>
          <option value="true">Aadhaar verified</option>
          <option value="false">Aadhaar not verified</option>
        </select>
        <select className="select" value={applied} onChange={(e) => setApplied(e.target.value)}>
          <option value="">Applications: all</option>
          <option value="true">Has applied</option>
          <option value="false">Never applied</option>
        </select>
        <button className="btn primary" onClick={() => load(1)}>
          Apply
        </button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {selected && (
        <Modal title={selected.basicDetails?.name || selected.phoneNumber} onClose={() => setSelected(null)} size="lg"
          footer={
            <>
              <button className="btn" onClick={() => setSelected(null)}>Close</button>
              {can("employees", "edit") && (
                <button className="btn primary" onClick={() => { startEdit(selected); }}>Edit details</button>
              )}
            </>
          }
        >
          <div className="kv-grid">
            <div className="k">Phone</div><div>{selected.phoneNumber}</div>
            <div className="k">Email</div><div>{selected.basicDetails?.email || "—"}</div>
            <div className="k">City</div><div>{selected.basicDetails?.city || "—"}</div>
            <div className="k">Gender</div><div>{selected.basicDetails?.gender || "—"}</div>
            <div className="k">Date of birth</div><div>{selected.basicDetails?.dateOfBirth || "—"}</div>
            <div className="k">Languages</div><div>{(selected.basicDetails?.language || []).join(", ") || "—"}</div>
            <div className="k">Verified</div>
            <div><Badge value={selected.isPrimaryVerified || selected.isEmployeeVerified ? "verified" : "pending"} /></div>
            <div className="k">Aadhaar name</div><div>{selected.aadharId?.name || "—"}</div>
            <div className="k">Job roles</div>
            <div>
              {(selected.workPreference?.jobRole || [])
                .map((j) => (typeof j === "string" ? j : j?.name))
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
            <div className="k">Preferred locations</div>
            <div>
              {(selected.workPreference?.jobLocation || [])
                .map((j) => (typeof j === "string" ? j : j?.name))
                .filter(Boolean)
                .join(", ") || "—"}
            </div>
            <div className="k">Salary expectation</div>
            <div>
              {selected.workPreference?.minSalaryAmount || "—"} – {selected.workPreference?.maxSalaryAmount || "—"} (
              {selected.workPreference?.salaryType || "—"})
            </div>
            <div className="k">Experience</div>
            <div>
              {(selected.experience || []).length
                ? selected.experience.map((e, i) => (
                    <div key={i}>
                      {e.jobRole} @ {e.companyName} ({fmtDate(e.startDate)} → {e.endDate ? fmtDate(e.endDate) : "now"})
                    </div>
                  ))
                : "—"}
            </div>
            <div className="k">Currently working</div><div>{selected.isCurrentEmployee ? "Yes" : "No"}</div>
            <div className="k">Jobs applied</div><div>{selected.totalAppliedJobs ?? 0}</div>
            <div className="k">Joined</div><div>{fmtDate(selected.createdAt)}</div>
            <div className="k">User ID</div><div className="mono">{selected._id}</div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit basic details"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            {["name", "email", "city", "gender", "dateOfBirth"].map((f) => (
              <div className="field" key={f}>
                <label>{f === "dateOfBirth" ? "Date of birth" : f[0].toUpperCase() + f.slice(1)}</label>
                <input
                  className="input"
                  value={editing[f]}
                  onChange={(e) => setEditing({ ...editing, [f]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
