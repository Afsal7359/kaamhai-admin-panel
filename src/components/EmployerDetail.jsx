import { useEffect, useState } from "react";
import { getEmployerFull, updateDocument } from "../api/endpoints";
import { fileUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Badge from "./Badge";
import Modal from "./Modal";
import CompanyDetail from "./CompanyDetail";
import { buildPayload, EditSection, initEdit, ViewSection } from "./EditableSection";
import { useToast } from "./Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const img = (p) => fileUrl(p);

const SECTIONS = [
  {
    title: "Owner details",
    fields: [
      { path: "name", label: "Name" },
      { path: "phoneNumber", label: "Phone" },
      { path: "email", label: "Email" },
      { path: "currentCity", label: "City" },
      { path: "referralCode", label: "Referral code" },
      { path: "walletBalance", label: "Wallet balance", num: true },
    ],
  },
];

function DocRow({ kind, code, name, status }) {
  return (
    <div className="vdoc-card">
      <div className="info">
        <div className="t">{kind} · {code || "—"}</div>
        {name && <div className="s">{name}</div>}
      </div>
      <Badge value={status} />
    </div>
  );
}

function CompanyCard({ c, onOpen }) {
  const docCount = (c.gst?.length || 0) + (c.fssai?.length || 0) + (c.otherDocument?.length || 0);
  return (
    <div className="company-block">
      <div className="company-block-head">
        <div className="company-logo">
          {img(c.companyLogo) ? <img src={img(c.companyLogo)} alt="" /> : (c.companyName || "C").charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="company-name">{c.companyName || "Unnamed company"}</div>
          <div className="company-sub">
            {c.companyRole || "—"} · {docCount} document{docCount === 1 ? "" : "s"}
            {c.isDeleted ? " · deleted" : ""}
          </div>
        </div>
        {onOpen && (
          <button className="btn sm" onClick={() => onOpen(c._id)}>Open profile</button>
        )}
      </div>
      {docCount === 0 ? (
        <div className="tl-desc">No documents on this company.</div>
      ) : (
        <>
          {(c.gst || []).map((d) => (
            <DocRow key={d._id} kind="GST" code={d.GSTIN} name={d.legal_name_of_business} status={d.isLinked ? "approved" : "pending"} />
          ))}
          {(c.fssai || []).map((d) => (
            <DocRow key={d._id} kind="FSSAI" code={d.fssai} name={d.entity} status={d.isLinked ? "approved" : "pending"} />
          ))}
          {(c.otherDocument || []).map((d) => (
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
          ))}
        </>
      )}
    </div>
  );
}

export default function EmployerDetail({ employerId, onClose, onChanged }) {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("businessOwner", "edit") || can("employers", "edit");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);
  const [openCompany, setOpenCompany] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEmployerFull(employerId);
      setData(res.data?.data || null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load employer", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId]);

  const startEdit = () => {
    setEdit(initEdit(SECTIONS, data.owner));
    setEditing(true);
  };

  const saveEdit = async () => {
    const payload = buildPayload(SECTIONS, edit, data.owner);
    if (!Object.keys(payload).length) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await updateDocument("businessOwner", employerId, payload);
      toast("Employer updated", "success");
      setEditing(false);
      load();
      onChanged?.();
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const o = data?.owner;

  return (
    <Modal
      title="Employer details"
      onClose={onClose}
      size="lg"
      footer={
        editing ? (
          <>
            <button className="btn" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn primary" onClick={saveEdit} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={onClose}>Close</button>
            {canEdit && data && <button className="btn primary" onClick={startEdit}>Edit details</button>}
          </>
        )
      }
    >
      {loading ? (
        <div className="loading">Loading…</div>
      ) : !data ? (
        <div className="empty-state">No data</div>
      ) : (
        <>
          <div className="person-head">
            <div className="avatar-lg">
              {img(o.image) ? <img src={img(o.image)} alt="" /> : (o.name || "E").charAt(0).toUpperCase()}
            </div>
            <div className="who">
              <div className="nm">{o.name || "Unnamed employer"}</div>
              <div className="ph">
                {o.phoneNumber}
                {o.currentCity ? ` · ${o.currentCity}` : ""}
                {o.email ? ` · ${o.email}` : ""}
              </div>
              <div className="head-badges">
                {o.isVerified ? <Badge value="verified" color="green" /> : <Badge value="not verified" color="orange" />}
                {o.isDeleted && <Badge value="deleted" color="red" />}
              </div>
            </div>
          </div>

          {editing ? (
            SECTIONS.map((s) => (
              <EditSection key={s.title} title={s.title} fields={s.fields} edit={edit} onChange={(path, val) => setEdit((e) => ({ ...e, [path]: val }))} />
            ))
          ) : (
            <>
              <div className="stat-grid" style={{ marginBottom: 16 }}>
                <div className="stat-card"><div className="stat-label">Companies</div><div className="stat-value">{data.companies.length}</div></div>
                <div className="stat-card"><div className="stat-label">Branches</div><div className="stat-value">{data.branches.length}</div></div>
                <div className="stat-card"><div className="stat-label">Current staff</div><div className="stat-value">{data.stats.currentEmployees}</div></div>
                <div className="stat-card"><div className="stat-label">Job posts</div><div className="stat-value">{data.stats.jobPosts}</div></div>
              </div>

              {SECTIONS.map((s) => (
                <ViewSection key={s.title} title={s.title} fields={s.fields} doc={o} />
              ))}

              {/* Team members */}
              <div className="form-section-title">Team members</div>
              {(o.members || []).length ? (
                o.members.map((m, i) => (
                  <div className="vdoc-card" key={i}>
                    <div className="info">
                      <div className="t">{m.name || "—"} <span className="mono">{m.phoneNumber || ""}</span></div>
                      <div className="s">{m.allBranches ? "All branches" : `${(m.branchIds || []).length} branch(es)`}</div>
                    </div>
                    <Badge value={m.role || "manager"} />
                  </div>
                ))
              ) : (
                <div className="tl-desc">No additional team members.</div>
              )}

              {/* Companies & docs */}
              <div className="form-section-title">Companies & documents</div>
              {data.companies.length ? (
                data.companies.map((c) => <CompanyCard key={c._id} c={c} onOpen={setOpenCompany} />)
              ) : (
                <div className="tl-desc">No companies registered.</div>
              )}

              {/* Branches */}
              <div className="form-section-title">Branches</div>
              {data.branches.length ? (
                data.branches.map((b) => (
                  <div className="vdoc-card" key={b._id}>
                    <div className="info">
                      <div className="t">{b.branchName} <span className="mono">({b.branchCode})</span></div>
                      <div className="s">
                        {b.branchType || "branch"}
                        {b.companyId?.companyName ? ` · ${b.companyId.companyName}` : ""}
                        {b.location?.city ? ` · ${b.location.city}` : ""}
                        {b.location?.state ? `, ${b.location.state}` : ""}
                      </div>
                      <div className="s">
                        {b.verificationDocuments?.gstId?.GSTIN ? `GST ${b.verificationDocuments.gstId.GSTIN}` : ""}
                        {b.verificationDocuments?.fssaiId?.fssai ? ` · FSSAI ${b.verificationDocuments.fssaiId.fssai}` : ""}
                        {b.verificationDocuments?.otherDocIds?.length ? ` · ${b.verificationDocuments.otherDocIds.length} other doc(s)` : ""}
                      </div>
                    </div>
                    <Badge value={b.isActive ? "active" : "inactive"} />
                  </div>
                ))
              ) : (
                <div className="tl-desc">No branches.</div>
              )}

              {/* Account meta */}
              <div className="form-section-title">Account</div>
              <div className="info-grid">
                <div className="info-cell"><div className="info-k">Verified at</div><div className="info-v">{fmtDate(o.verifiedAt)}</div></div>
                <div className="info-cell"><div className="info-k">Joined</div><div className="info-v">{fmtDate(o.createdAt)}</div></div>
                <div className="info-cell" style={{ gridColumn: "1 / -1" }}><div className="info-k">Owner ID</div><div className="info-v mono">{o._id}</div></div>
              </div>
            </>
          )}
        </>
      )}
      {openCompany && (
        <CompanyDetail
          companyId={openCompany}
          onClose={() => setOpenCompany(null)}
          onChanged={() => { load(); onChanged?.(); }}
        />
      )}
    </Modal>
  );
}
