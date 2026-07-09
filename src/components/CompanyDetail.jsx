import { useEffect, useRef, useState } from "react";
import { getCompanyFull, updateCompanyProfile } from "../api/endpoints";
import { fileUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Badge from "./Badge";
import Modal from "./Modal";
import BranchDetail from "./BranchDetail";
import { useToast } from "./Toast";

const img = (p) => fileUrl(p);
const MAX_LOGO_MB = 50;

export default function CompanyDetail({ companyId, onClose, onChanged }) {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("companiess", "edit");
  const fileRef = useRef(null);
  const [openBranch, setOpenBranch] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await getCompanyFull(companyId);
      setData(res.data?.data || null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load company", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const startEdit = () => {
    setName(data.company.companyName || "");
    setLogoFile(null);
    setLogoPreview("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setLogoFile(null);
    setLogoPreview("");
  };

  const pickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) {
      toast("Please choose an image file", "error");
      return;
    }
    if (f.size > MAX_LOGO_MB * 1024 * 1024) {
      toast(`Image is too large (max ${MAX_LOGO_MB}MB)`, "error");
      return;
    }
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const saveProfile = async () => {
    const fd = new FormData();
    const trimmed = name.trim();
    if (trimmed && trimmed !== data.company.companyName) fd.append("companyName", trimmed);
    if (logoFile) fd.append("logo", logoFile);
    if (![...fd.keys()].length) {
      cancelEdit();
      return;
    }
    setBusy(true);
    try {
      await updateCompanyProfile(companyId, fd);
      toast("Company profile updated", "success");
      cancelEdit();
      await load();
      onChanged?.();
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const c = data?.company;

  return (
    <Modal title="Company profile" onClose={onClose} size="lg"
      footer={
        editing ? (
          <>
            <button className="btn" onClick={cancelEdit} disabled={busy}>Cancel</button>
            <button className="btn primary" onClick={saveProfile} disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </button>
          </>
        ) : (
          <button className="btn" onClick={onClose}>Close</button>
        )
      }>
      {loading ? (
        <div className="loading">Loading…</div>
      ) : !data ? (
        <div className="empty-state">No data</div>
      ) : (
        <>
          {/* ── Company profile header (with name + logo edit) ── */}
          <div className="company-profile">
            <div className={`company-profile-logo${editing ? " editable" : ""}`}
                 onClick={editing ? () => fileRef.current?.click() : undefined}>
              {logoPreview || img(c.companyLogo) ? (
                <img src={logoPreview || img(c.companyLogo)} alt="" />
              ) : (
                <span>{(c.companyName || "C").charAt(0).toUpperCase()}</span>
              )}
              {editing && <div className="logo-edit-overlay">📷 Change</div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />

            <div className="company-profile-body">
              {editing ? (
                <div className="field" style={{ marginBottom: 6, maxWidth: 360 }}>
                  <label>Company name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" autoFocus />
                </div>
              ) : (
                <div className="company-profile-name">{c.companyName || "Unnamed company"}</div>
              )}
              <div className="company-profile-sub">
                {c.companyRole || "—"}{c.isDeleted ? " · deleted" : ""}
              </div>
              {editing ? (
                <button className="btn sm" style={{ marginTop: 8 }} onClick={() => fileRef.current?.click()}>
                  {logoFile ? "Logo selected ✓ — change" : "Upload new logo"}
                </button>
              ) : (
                canEdit && (
                  <button className="btn sm" style={{ marginTop: 8 }} onClick={startEdit}>
                    ✎ Edit name & logo
                  </button>
                )
              )}
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
