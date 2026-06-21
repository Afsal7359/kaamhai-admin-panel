import { useEffect, useState } from "react";
import { getCompanyFull } from "../api/endpoints";
import { fileUrl } from "../api/client";
import Badge from "./Badge";
import Modal from "./Modal";
import BranchDetail from "./BranchDetail";
import { useToast } from "./Toast";

const img = (p) => fileUrl(p);

export default function CompanyDetail({ companyId, onClose }) {
  const toast = useToast();
  const [openBranch, setOpenBranch] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCompanyFull(companyId);
        setData(res.data?.data || null);
      } catch (err) {
        toast(err.response?.data?.message || "Failed to load company", "error");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const c = data?.company;

  return (
    <Modal title="Company details" onClose={onClose} size="lg"
      footer={<button className="btn" onClick={onClose}>Close</button>}>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : !data ? (
        <div className="empty-state">No data</div>
      ) : (
        <>
          <div className="person-head">
            <div className="avatar-lg">
              {img(c.companyLogo) ? <img src={img(c.companyLogo)} alt="" /> : (c.companyName || "C").charAt(0).toUpperCase()}
            </div>
            <div className="who">
              <div className="nm">{c.companyName || "Unnamed company"}</div>
              <div className="ph">{c.companyRole || "—"}{c.isDeleted ? " · deleted" : ""}</div>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <div className="stat-card"><div className="stat-label">B2B users</div><div className="stat-value">{data.stats?.b2bUsers ?? (data.owners?.length || 0)}</div></div>
            <div className="stat-card"><div className="stat-label">Branches</div><div className="stat-value">{data.branches.length}</div></div>
            <div className="stat-card"><div className="stat-label">Employees</div><div className="stat-value">{data.stats?.currentEmployees ?? 0}</div></div>
            <div className="stat-card"><div className="stat-label">Documents</div><div className="stat-value">{data.gst.length + data.fssai.length + data.otherDocument.length}</div></div>
          </div>

          {/* B2B users linked to this company */}
          <div className="form-section-title">B2B users ({data.owners?.length || 0})</div>
          {(data.owners || []).length ? (
            data.owners.map((o) => (
              <div className="vdoc-card" key={o._id}>
                <div className="info">
                  <div className="t">{o.name || "Unnamed employer"}</div>
                  <div className="s">{o.phoneNumber}{o.currentCity ? ` · ${o.currentCity}` : ""}{o.email ? ` · ${o.email}` : ""}</div>
                </div>
                <Badge value={o.isVerified ? "verified" : "not verified"} color={o.isVerified ? "green" : "orange"} />
              </div>
            ))
          ) : (
            <div className="tl-desc">No B2B users linked.</div>
          )}

          <div className="form-section-title">GST records</div>
          {data.gst.length ? data.gst.map((d) => (
            <div className="vdoc-card" key={d._id}>
              <div className="info">
                <div className="t">{d.GSTIN || "—"}</div>
                <div className="s">
                  {d.legal_name_of_business || "—"}
                  {d.state ? ` · ${d.state}` : ""}
                  {d.gst_in_status ? ` · ${d.gst_in_status}` : ""}
                </div>
              </div>
              <Badge value={d.isLinked ? "linked" : "unlinked"} />
            </div>
          )) : <div className="tl-desc">No GST records.</div>}

          <div className="form-section-title">FSSAI records</div>
          {data.fssai.length ? data.fssai.map((d) => (
            <div className="vdoc-card" key={d._id}>
              <div className="info">
                <div className="t">{d.fssai || "—"}</div>
                <div className="s">{d.entity || "—"}{d.state ? ` · ${d.state}` : ""}{d.category ? ` · ${d.category}` : ""}</div>
              </div>
              <Badge value={d.isLinked ? "linked" : "unlinked"} />
            </div>
          )) : <div className="tl-desc">No FSSAI records.</div>}

          <div className="form-section-title">Other documents</div>
          {data.otherDocument.length ? data.otherDocument.map((d) => (
            <div className="vdoc-card" key={d._id}>
              <div className="info">
                <div className="t">{d.documentType || "Other"} · {d.documentNumber || "—"}</div>
                <div className="s">
                  {img(d.document) && <a href={img(d.document)} target="_blank" rel="noreferrer">view file</a>}
                  {d.adminRemarks ? ` · ${d.adminRemarks}` : ""}
                </div>
              </div>
              <Badge value={d.verificationStatus || "pending"} />
            </div>
          )) : <div className="tl-desc">No other documents.</div>}

          <div className="form-section-title">Branches</div>
          {data.branches.length ? data.branches.map((b) => (
            <div className="vdoc-card emp-row" key={b._id} onClick={() => setOpenBranch(b._id)}>
              <div className="info">
                <div className="t">{b.branchName} <span className="mono">({b.branchCode})</span></div>
                <div className="s">
                  {b.branchType || "branch"}{b.location?.city ? ` · ${b.location.city}` : ""}
                  {` · ${b.employeeCount ?? 0} employee${(b.employeeCount ?? 0) === 1 ? "" : "s"}`}
                </div>
              </div>
              <Badge value={b.isActive ? "active" : "inactive"} />
            </div>
          )) : <div className="tl-desc">No branches.</div>}
        </>
      )}

      {openBranch && <BranchDetail branchId={openBranch} onClose={() => setOpenBranch(null)} />}
    </Modal>
  );
}
