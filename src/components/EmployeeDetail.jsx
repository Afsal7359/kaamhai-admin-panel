import { useEffect, useRef, useState } from "react";
import { getEmployeeFull, terminateEmployee, updateDocument, updateEmployeePhoto } from "../api/endpoints";
import { fileUrl, profilePhotoUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Badge from "./Badge";
import Modal from "./Modal";
import { buildPayload, EditSection, initEdit, ViewSection } from "./EditableSection";
import { useToast } from "./Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "—");
const img = (p) => fileUrl(p);

const TERMINATION_REASONS = [
  { value: "resignation", label: "Resignation" },
  { value: "performance", label: "Performance" },
  { value: "misconduct", label: "Misconduct" },
  { value: "contract_end", label: "Contract end" },
  { value: "absconding", label: "Absconding" },
  { value: "other", label: "Other" },
];

// Editable profile sections (drive both view + edit modes).
const SECTIONS = [
  {
    title: "Basic details",
    fields: [
      { path: "basicDetails.name", label: "Name" },
      { path: "basicDetails.email", label: "Email" },
      { path: "basicDetails.city", label: "City" },
      { path: "basicDetails.gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { path: "basicDetails.dateOfBirth", label: "Date of birth" },
      { path: "basicDetails.permenantAdress", label: "Permanent address", long: true },
      { path: "basicDetails.eductaion", label: "Education", array: true },
      { path: "basicDetails.language", label: "Languages", array: true },
    ],
  },
  {
    title: "Work preference",
    fields: [
      { path: "workPreference.jobRole", label: "Job roles", array: true },
      { path: "workPreference.jobLocation", label: "Preferred locations", array: true },
      { path: "workPreference.salaryType", label: "Salary type" },
      { path: "workPreference.minSalaryAmount", label: "Min salary", num: true },
      { path: "workPreference.maxSalaryAmount", label: "Max salary", num: true },
      { path: "workPreference.jobType", label: "Job type" },
      { path: "workPreference.shiftType", label: "Shift type" },
      { path: "workPreference.jobNature", label: "Job nature" },
    ],
  },
  {
    title: "Other details",
    fields: [
      { path: "otherDetails.fatherName", label: "Father name" },
      { path: "otherDetails.bloodGroup", label: "Blood group" },
      { path: "otherDetails.emergencyContact", label: "Emergency contact" },
      { path: "otherDetails.localContact", label: "Local contact" },
      { path: "otherDetails.emergencyAddress", label: "Emergency address", long: true },
    ],
  },
];

function DocThumb({ src, label }) {
  const url = img(src);
  if (!url) return null;
  return (
    <div className="doc-card">
      <img src={url} alt={label} onClick={() => window.open(url, "_blank")} />
      <div className="cap">{label}</div>
    </div>
  );
}

export default function EmployeeDetail({ employeeId, onClose, onChanged }) {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("user", "edit") || can("employees", "edit");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({});
  const [term, setTerm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [showPhotoLink, setShowPhotoLink] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getEmployeeFull(employeeId);
      setData(res.data?.data || null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load employee", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const startEdit = () => {
    setEdit(initEdit(SECTIONS, data.user));
    setEditing(true);
  };

  const saveEdit = async () => {
    const payload = buildPayload(SECTIONS, edit, data.user);
    if (!Object.keys(payload).length) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await updateDocument("user", employeeId, payload);
      toast("Profile updated", "success");
      setEditing(false);
      load();
      onChanged?.();
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const savePhoto = async (formData, successMsg) => {
    setPhotoBusy(true);
    try {
      await updateEmployeePhoto(employeeId, formData);
      toast(successMsg, "success");
      setShowPhotoLink(false);
      setPhotoUrlInput("");
      load();
      onChanged?.();
    } catch (err) {
      toast(err.response?.data?.message || "Photo update failed", "error");
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file", "error");
      return;
    }
    const fd = new FormData();
    fd.append("photo", file);
    savePhoto(fd, "Profile photo updated");
  };

  const savePhotoLink = () => {
    const url = photoUrlInput.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast("Enter a valid image URL (http/https)", "error");
      return;
    }
    const fd = new FormData();
    fd.append("photoUrl", url);
    savePhoto(fd, "Profile photo updated");
  };

  const doTerminate = async () => {
    setBusy(true);
    try {
      const res = await terminateEmployee({
        employeeId,
        reason: term.reason,
        lastWorkingDay: term.lastWorkingDay || undefined,
        notes: term.notes || undefined,
      });
      if (res.data?.success) {
        toast(term.reason === "resignation" ? "Marked as resigned" : "Employee terminated", "success");
        setTerm(null);
        load();
        onChanged?.();
      } else {
        toast(res.data?.message || "Action failed", "error");
      }
    } catch (err) {
      toast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const u = data?.user;
  const name = u?.basicDetails?.name || "Unnamed user";
  const ce = data?.currentEmployment;
  const aad = data?.aadhaar;

  return (
    <Modal
      title="Employee details"
      onClose={onClose}
      size="lg"
      footer={
        editing ? (
          <>
            <button className="btn" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn primary" onClick={saveEdit} disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </>
        ) : (
          <>
            <button className="btn" onClick={onClose}>Close</button>
            {canEdit && !term && data?.isCurrentlyEmployed && (
              <button className="btn ghost-danger" onClick={() => setTerm({ reason: "resignation", lastWorkingDay: "", notes: "" })}>
                Terminate / Resign
              </button>
            )}
            {canEdit && data && <button className="btn primary" onClick={startEdit}>Edit profile</button>}
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
            <div
              className={`avatar-lg${canEdit ? " avatar-editable" : ""}`}
              onClick={canEdit && !photoBusy ? () => fileRef.current?.click() : undefined}
              title={canEdit ? "Upload profile photo" : undefined}
            >
              {profilePhotoUrl(u.profile) ? (
                <img src={profilePhotoUrl(u.profile)} alt="" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
              {canEdit && (
                <span className="avatar-cam">{photoBusy ? "…" : "📷"}</span>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickFile} />
            <div className="who">
              <div className="nm">{name}</div>
              <div className="ph">
                {u.phoneNumber}
                {u.basicDetails?.city ? ` · ${u.basicDetails.city}` : ""}
                {u.basicDetails?.gender ? ` · ${u.basicDetails.gender}` : ""}
              </div>
              <div className="head-badges">
                {data.isCurrentlyEmployed ? <Badge value="working" color="green" /> : <Badge value="not employed" />}
                {u.isPrimaryVerified && <Badge value="primary verified" color="green" />}
                {u.isEmployeeVerified && <Badge value="employee verified" color="green" />}
                {u.isDeleted && <Badge value="deleted" color="red" />}
                {u.jobSearchLocked && <Badge value="search locked" color="orange" />}
              </div>
              {canEdit && (
                <div className="photo-actions">
                  <button className="link-btn" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                    {profilePhotoUrl(u.profile) ? "Change photo" : "Upload photo"}
                  </button>
                  <span className="sep">·</span>
                  <button className="link-btn" onClick={() => setShowPhotoLink((v) => !v)} disabled={photoBusy}>
                    Use image link
                  </button>
                </div>
              )}
              {showPhotoLink && (
                <div className="photo-link-row">
                  <input
                    className="input"
                    placeholder="https://…/photo.jpg"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePhotoLink()}
                  />
                  <button className="btn sm primary" onClick={savePhotoLink} disabled={photoBusy}>
                    {photoBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <>
              {SECTIONS.map((s) => (
                <EditSection
                  key={s.title}
                  title={s.title}
                  fields={s.fields}
                  edit={edit}
                  onChange={(path, val) => setEdit((e) => ({ ...e, [path]: val }))}
                />
              ))}
            </>
          ) : (
            <>
              {SECTIONS.map((s) => (
                <ViewSection key={s.title} title={s.title} fields={s.fields} doc={u} />
              ))}

              {/* Currently working at */}
              <div className="form-section-title">Currently working at</div>
              {ce ? (
                <div className="vdoc-card" style={{ alignItems: "flex-start" }}>
                  <div className="info">
                    <div className="t">{ce.companyId?.companyName || "—"}</div>
                    <div className="s">
                      {ce.branchObjectId?.branchName ? `Branch: ${ce.branchObjectId.branchName}` : ""}
                      {ce.branchObjectId?.location?.city ? ` · ${ce.branchObjectId.location.city}` : ""}
                    </div>
                    <div className="s">
                      Employer: {ce.userId?.name || ce.userId?.phoneNumber || "—"}
                      {ce.offerLetterId?.salary ? ` · Salary ₹${ce.offerLetterId.salary} (${ce.offerLetterId.salaryType || ""})` : ""}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="tl-desc">Not currently employed on the platform.</div>
              )}

              {/* Verification — full data, not just a checklist */}
              <div className="form-section-title">Verification</div>
              <div className="verif-list">
                {data.verification.map((v, i) => (
                  <div className={`verif-row ${v.ok ? "ok" : "no"}`} key={i}>
                    <span className="verif-ic">{v.ok ? "✓" : "○"}</span>
                    <span className="verif-label">{v.label}</span>
                    {v.detail && <span className="verif-detail">{v.detail}</span>}
                    {v.when && <span className="verif-when">{fmtDate(v.when)}</span>}
                  </div>
                ))}
              </div>

              {/* Aadhaar record details */}
              {aad && (
                <>
                  <div className="form-section-title">Aadhaar record</div>
                  <div className="info-grid">
                    <div className="info-cell"><div className="info-k">Name</div><div className="info-v">{aad.name || "—"}</div></div>
                    <div className="info-cell"><div className="info-k">Aadhaar no.</div><div className="info-v">{aad.aadharId || "—"}</div></div>
                    <div className="info-cell"><div className="info-k">Gender</div><div className="info-v">{aad.gender || "—"}</div></div>
                    <div className="info-cell"><div className="info-k">Date of birth</div><div className="info-v">{aad.dateOfBirth || "—"}</div></div>
                    <div className="info-cell" style={{ gridColumn: "1 / -1" }}><div className="info-k">Address</div><div className="info-v">{aad.address || "—"}</div></div>
                  </div>
                </>
              )}

              {/* Document images */}
              {(aad?.image || data.document?.image || u.manualVerificationDocFront || u.manualVerificationSelfie) && (
                <>
                  <div className="form-section-title">Identity documents</div>
                  <div className="doc-row">
                    <DocThumb src={aad?.image} label="Aadhaar" />
                    <DocThumb src={data.document?.image} label={data.document?.type || "Document"} />
                    <DocThumb src={u.manualVerificationDocFront} label="Doc front" />
                    <DocThumb src={u.manualVerificationDocBack} label="Doc back" />
                    <DocThumb src={u.manualVerificationSelfie} label="Selfie" />
                  </div>
                  {u.manualVerificationSubmittedAt && (
                    <div className="tl-desc">Manual docs submitted {fmtDateTime(u.manualVerificationSubmittedAt)}</div>
                  )}
                  {u.manualVerificationRejectedReason && (
                    <div className="tl-desc" style={{ color: "var(--danger)" }}>
                      Rejected: {u.manualVerificationRejectedReason}
                    </div>
                  )}
                </>
              )}

              {/* Last verification message sent */}
              {u.verificationMessage?.text && (
                <>
                  <div className="form-section-title">Last message sent</div>
                  <div className={`sent-msg ${u.verificationMessage.kind === "verified" ? "ok" : "warn"}`}>
                    <div className="sent-msg-text">{u.verificationMessage.text}</div>
                    <div className="form-hint" style={{ marginTop: 6 }}>{fmtDateTime(u.verificationMessage.sentAt)}</div>
                  </div>
                </>
              )}

              {/* Work experience */}
              <div className="form-section-title">Work experience</div>
              {(data.experience || []).length ? (
                data.experience.map((e, i) => (
                  <div className="vdoc-card" key={i}>
                    <div className="info">
                      <div className="t">{e.jobRole || e.role || "Role"} {e.companyName ? `· ${e.companyName}` : ""}</div>
                      <div className="s">
                        {fmtDate(e.startDate)} → {e.endDate ? fmtDate(e.endDate) : "present"}
                        {e.companyLocation ? ` · ${e.companyLocation}` : ""}
                        {e.salaryAmount ? ` · ₹${e.salaryAmount}` : ""}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="tl-desc">No experience recorded.</div>
              )}

              {/* Past employment on platform */}
              {(data.exEmployment || []).length > 0 && (
                <>
                  <div className="form-section-title">Past employment (platform)</div>
                  {data.exEmployment.map((x, i) => (
                    <div className="vdoc-card" key={i}>
                      <div className="info">
                        <div className="t">{x.companyId?.companyName || x.userId?.name || "Employer"}</div>
                        <div className="s">
                          <Badge value={x.terminationReason || "ended"} />{" "}
                          {x.lastWorkingDay ? `· last day ${fmtDate(x.lastWorkingDay)}` : ""}
                          {x.terminationNotes ? ` · ${x.terminationNotes}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Account meta */}
              <div className="form-section-title">Account</div>
              <div className="info-grid">
                <div className="info-cell"><div className="info-k">WhatsApp updates</div><div className="info-v">{u.whatsappupdatesenabled ? "On" : "Off"}</div></div>
                <div className="info-cell"><div className="info-k">Notifications</div><div className="info-v">{u.notificationupdatespermissionenabled ? "On" : "Off"}</div></div>
                <div className="info-cell"><div className="info-k">Joined</div><div className="info-v">{fmtDate(u.createdAt)}</div></div>
                <div className="info-cell"><div className="info-k">User ID</div><div className="info-v mono">{u._id}</div></div>
              </div>
            </>
          )}

          {/* Termination form */}
          {term && !editing && (
            <>
              <div className="form-section-title">Terminate / mark resigned</div>
              <div className="form-grid">
                <div className="field">
                  <label>Reason</label>
                  <select className="select" value={term.reason} onChange={(e) => setTerm({ ...term, reason: e.target.value })}>
                    {TERMINATION_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Last working day</label>
                  <input className="input" type="date" value={term.lastWorkingDay} onChange={(e) => setTerm({ ...term, lastWorkingDay: e.target.value })} />
                </div>
                <div className="field full">
                  <label>Notes (optional)</label>
                  <textarea className="textarea" rows={2} maxLength={280} value={term.notes} onChange={(e) => setTerm({ ...term, notes: e.target.value })} placeholder="Context for this termination…" />
                </div>
              </div>
              <div className="filters-bar" style={{ marginBottom: 0 }}>
                <button className="btn" onClick={() => setTerm(null)} disabled={busy}>Cancel</button>
                <button className="btn danger" onClick={doTerminate} disabled={busy}>
                  {busy ? "Working…" : term.reason === "resignation" ? "Mark resigned" : "Terminate employee"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
