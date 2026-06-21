import { useEffect, useState } from "react";
import { getBranchFull } from "../api/endpoints";
import { fileUrl } from "../api/client";
import Badge from "./Badge";
import Modal from "./Modal";
import EmployeeDetail from "./EmployeeDetail";
import { useToast } from "./Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const img = (p) => fileUrl(p);

export default function BranchDetail({ branchId, onClose }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openEmployee, setOpenEmployee] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBranchFull(branchId);
        setData(res.data?.data || null);
      } catch (err) {
        toast(err.response?.data?.message || "Failed to load branch", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const b = data?.branch;

  return (
    <Modal title="Branch details" onClose={onClose} size="lg"
      footer={<button className="btn" onClick={onClose}>Close</button>}>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : !data ? (
        <div className="empty-state">No data</div>
      ) : (
        <>
          <div className="person-head">
            <div className="avatar-lg">🏬</div>
            <div className="who">
              <div className="nm">{b.branchName} <span className="mono" style={{ fontSize: 12 }}>({b.branchCode})</span></div>
              <div className="ph">
                {b.branchType || "branch"}
                {b.companyId?.companyName ? ` · ${b.companyId.companyName}` : ""}
                {b.location?.city ? ` · ${b.location.city}` : ""}
              </div>
              <div className="head-badges">
                <Badge value={b.isActive ? "active" : "inactive"} color={b.isActive ? "green" : ""} />
                {b.isDeleted && <Badge value="deleted" color="red" />}
              </div>
            </div>
          </div>

          {/* Counts */}
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label">Current employees</div><div className="stat-value">{data.stats.currentEmployees}</div></div>
            <div className="stat-card"><div className="stat-label">Distinct posts</div><div className="stat-value">{data.stats.posts}</div></div>
            <div className="stat-card"><div className="stat-label">Past employees</div><div className="stat-value">{data.stats.exEmployees}</div></div>
          </div>

          {/* Branch info */}
          <div className="form-section-title">Branch information</div>
          <div className="info-grid">
            <div className="info-cell"><div className="info-k">Owner</div><div className="info-v">{b.ownerId?.name || b.ownerId?.phoneNumber || "—"}</div></div>
            <div className="info-cell"><div className="info-k">Company</div><div className="info-v">{b.companyId?.companyName || "—"}</div></div>
            <div className="info-cell"><div className="info-k">Type</div><div className="info-v">{b.branchType || "—"}</div></div>
            <div className="info-cell"><div className="info-k">City</div><div className="info-v">{b.location?.city || "—"}</div></div>
            <div className="info-cell"><div className="info-k">State</div><div className="info-v">{b.location?.state || "—"}</div></div>
            <div className="info-cell"><div className="info-k">Pincode</div><div className="info-v">{b.location?.pincode || "—"}</div></div>
            <div className="info-cell" style={{ gridColumn: "1 / -1" }}><div className="info-k">Address</div><div className="info-v">{b.location?.address || "—"}</div></div>
          </div>

          {/* Posts breakdown */}
          {data.byPost.length > 0 && (
            <>
              <div className="form-section-title">Employees by post</div>
              <div className="pill-bar" style={{ marginBottom: 12, flexWrap: "wrap" }}>
                {data.byPost.map((p) => (
                  <span className="pill" key={p.post} style={{ cursor: "default" }}>
                    {p.post}<span className="count">{p.count}</span>
                  </span>
                ))}
              </div>
            </>
          )}

          {/* Current employees */}
          <div className="form-section-title">Current employees ({data.employees.length})</div>
          {data.employees.length ? (
            data.employees.map((e) => (
              <div className="vdoc-card emp-row" key={e._id} onClick={() => e.userId && setOpenEmployee(e.userId)}>
                <div className="emp-ava">
                  {img(e.photo) ? <img src={img(e.photo)} alt="" /> : (e.name || "U").charAt(0).toUpperCase()}
                </div>
                <div className="info">
                  <div className="t">{e.name} {e.verified && <Badge value="verified" color="green" />}</div>
                  <div className="s">
                    {e.phoneNumber}
                    {e.post ? ` · ${e.post}` : ""}
                    {e.salary ? ` · ₹${e.salary} ${e.salaryType || ""}` : ""}
                    {e.since ? ` · since ${fmtDate(e.since)}` : ""}
                  </div>
                </div>
                <span className="badge indigo">{e.post}</span>
              </div>
            ))
          ) : (
            <div className="tl-desc">No current employees at this branch.</div>
          )}

          {/* Ex employees */}
          {data.exEmployees.length > 0 && (
            <>
              <div className="form-section-title">Past employees ({data.exEmployees.length})</div>
              {data.exEmployees.map((x) => (
                <div className="vdoc-card" key={x._id}>
                  <div className="info">
                    <div className="t">{x.name}</div>
                    <div className="s">{x.phoneNumber}{x.lastWorkingDay ? ` · last day ${fmtDate(x.lastWorkingDay)}` : ""}</div>
                  </div>
                  <Badge value={x.reason} />
                </div>
              ))}
            </>
          )}
        </>
      )}

      {openEmployee && (
        <EmployeeDetail employeeId={openEmployee} onClose={() => setOpenEmployee(null)} />
      )}
    </Modal>
  );
}
