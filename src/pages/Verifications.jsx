import { useEffect, useState } from "react";
import {
  approveVerification,
  getEmployerVerifications,
  getUserVerifications,
  rejectVerification,
  reviewBusinessDocument,
  setEmployerVerified,
} from "../api/endpoints";
import { fileUrl } from "../api/client";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import StatCard from "../components/StatCard";
import MessageComposer, { buildMessage, DEFAULT_APP_URL, SentMessageCard } from "../components/MessageComposer";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

// Initial composer state for a verify/reject action.
const initComposer = (audience, kind, reason) => ({
  enabled: true,
  sendSms: false,
  url: DEFAULT_APP_URL,
  text: buildMessage({ audience, kind, reason, url: DEFAULT_APP_URL }),
});
const composerPayload = (c) =>
  c?.enabled ? { sendSms: c.sendSms, message: c.text, appUrl: c.url } : { sendSms: false };

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "—");
const imgSrc = (p) => fileUrl(p);

function DocThumb({ src, label }) {
  const url = imgSrc(src);
  if (!url) return null;
  return (
    <div className="doc-card">
      <img src={url} alt={label} onClick={() => window.open(url, "_blank")} />
      <div className="cap">{label}</div>
    </div>
  );
}

// ── Steppers ─────────────────────────────────────────────────────────────────

function MiniStepper({ steps }) {
  return (
    <div className="mini-steps" title={steps.map((s) => `${s.title}: ${s.status}`).join("\n")}>
      {steps.map((s, i) => (
        <div className="mini-step" key={s.key}>
          {i > 0 && <div className={`mini-line${steps[i - 1].status === "complete" ? " complete" : ""}`} />}
          <div className={`mini-dot ${s.status}`}>
            {s.status === "complete" ? "✓" : s.status === "rejected" ? "✕" : i + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ steps }) {
  return (
    <div className="timeline">
      {steps.map((s, i) => (
        <div className={`timeline-step${s.status === "complete" ? " complete" : ""}`} key={s.key}>
          <div className={`tl-dot ${s.status}`}>
            {s.status === "complete" ? "✓" : s.status === "rejected" ? "✕" : i + 1}
          </div>
          <div className="tl-body">
            <div className="tl-title">
              {s.title}
              {s.status === "current" && <Badge value="in progress" color="orange" />}
              {s.status === "rejected" && <Badge value="rejected" color="red" />}
              {s.status === "complete" && <Badge value="done" color="green" />}
            </div>
            {s.desc && <div className="tl-desc">{s.desc}</div>}
            {s.content && <div className="tl-content">{s.content}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── B2C: employee verification flow ─────────────────────────────────────────

const userIdMethod = (u) => {
  if (u.verificationMode === "PRIMARY" || u.isPrimaryVerified) return "DigiLocker (Aadhaar)";
  if (u.isAadharOtpVerfied) return "Aadhaar OTP";
  if (u.isAadharphotoVerified || u.isDocumentVerified) return "Aadhaar photo";
  if (u.manualVerificationDocFront) return "Manual documents";
  if (u.aadharId) return "Aadhaar";
  return null;
};

const computeUserSteps = (u, withContent = false) => {
  const verified = Boolean(u.isPrimaryVerified || u.isEmployeeVerified);
  const profileDone = Boolean(u.basicDetails?.name);
  const method = userIdMethod(u);
  const idSubmitted = Boolean(method);
  const pendingReview = Boolean(u.isManualVerificationPending);
  const rejected = Boolean(u.manualVerificationRejectedReason) && !verified && !pendingReview;

  const steps = [
    {
      key: "reg",
      title: "Registration",
      status: "complete",
      desc: `${u.phoneNumber}${u.isStubUser ? " · stub account" : ""} · joined ${fmtDate(u.createdAt)}`,
    },
    {
      key: "profile",
      title: "Profile details",
      status: profileDone ? "complete" : "current",
      desc: profileDone
        ? [u.basicDetails?.name, u.basicDetails?.city].filter(Boolean).join(" · ")
        : "Name not added yet",
    },
    {
      key: "id",
      title: "Identity documents",
      status: idSubmitted ? "complete" : profileDone ? "current" : "upcoming",
      desc: idSubmitted ? `Method: ${method}` : "No ID submitted yet",
      content:
        withContent && idSubmitted ? (
          <>
            {u.aadharId && (
              <div className="tl-desc" style={{ marginBottom: 8 }}>
                Aadhaar: <strong>{u.aadharId.name}</strong>
                {u.aadharId.aadharId ? ` · ${u.aadharId.aadharId}` : ""}
                {u.aadharId.gender ? ` · ${u.aadharId.gender}` : ""}
                {u.aadharId.dateOfBirth ? ` · DOB ${u.aadharId.dateOfBirth}` : ""}
              </div>
            )}
            <div className="doc-row">
              <DocThumb src={u.aadharId?.image} label="Aadhaar image" />
              <DocThumb src={u.manualVerificationDocFront} label="Doc front" />
              <DocThumb src={u.manualVerificationDocBack} label="Doc back" />
              <DocThumb src={u.manualVerificationSelfie} label="Selfie" />
              <DocThumb src={u.document?.image} label={u.document?.type || "Document"} />
            </div>
          </>
        ) : null,
    },
    {
      key: "approval",
      title: "Review & approval",
      status: verified ? "complete" : rejected ? "rejected" : pendingReview ? "current" : "upcoming",
      desc: verified
        ? `Verified${u.verificationMode ? ` · mode: ${u.verificationMode}` : ""}`
        : rejected
          ? `Rejected: ${u.manualVerificationRejectedReason}`
          : pendingReview
            ? `Submitted ${fmtDateTime(u.manualVerificationSubmittedAt)} — waiting for admin review`
            : "Not reached yet",
    },
  ];
  return steps;
};

const USER_PILLS = [
  { key: "pending", label: "Pending review" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Rejected" },
  { key: "unverified", label: "Not verified" },
  { key: "", label: "All users" },
];

function EmployeeVerifications() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("verifications", "edit");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [approveComposer, setApproveComposer] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [rejectComposer, setRejectComposer] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (p = page, s = stage) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (s) params.stage = s;
      if (search) params.search = search;
      const res = await getUserVerifications(params);
      setRows(res.data?.data || []);
      setCounts(res.data?.counts || null);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load verifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const approve = async (u) => {
    setBusy(true);
    try {
      const res = await approveVerification(u._id, composerPayload(approveComposer));
      const sent = res.data?.data?.verificationMessage;
      toast(`${u.basicDetails?.name || u.phoneNumber} verified ✓`, "success");
      // Reflect the sent message immediately in the open detail view.
      setSelected((s) => (s && s._id === u._id ? { ...s, isEmployeeVerified: true, verificationMessage: sent } : s));
      setApproveComposer(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Approval failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    setBusy(true);
    try {
      const res = await rejectVerification(rejecting._id, reason, composerPayload(rejectComposer));
      const sent = res.data?.data?.verificationMessage;
      toast("Verification rejected", "success");
      setSelected((s) =>
        s && s._id === rejecting._id ? { ...s, manualVerificationRejectedReason: reason, verificationMessage: sent } : s,
      );
      setRejecting(null);
      setReason("");
      setRejectComposer(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Rejection failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "name", label: "Employee", render: (r) => r.basicDetails?.name || "—" },
    { key: "phone", label: "Phone", render: (r) => r.phoneNumber },
    { key: "steps", label: "Verification progress", render: (r) => <MiniStepper steps={computeUserSteps(r)} /> },
    { key: "method", label: "ID method", render: (r) => userIdMethod(r) || "—" },
    {
      key: "state",
      label: "Status",
      render: (r) =>
        r.isPrimaryVerified || r.isEmployeeVerified ? (
          <Badge value="verified" />
        ) : r.isManualVerificationPending ? (
          <Badge value="pending review" color="orange" />
        ) : r.manualVerificationRejectedReason ? (
          <Badge value="rejected" />
        ) : (
          <Badge value="incomplete" />
        ),
    },
    { key: "submitted", label: "Submitted", render: (r) => fmtDate(r.manualVerificationSubmittedAt || r.createdAt) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <button className="btn sm primary" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
          {canEdit ? "Review" : "View"}
        </button>
      ),
    },
  ];

  const selectedVerified = selected && (selected.isPrimaryVerified || selected.isEmployeeVerified);

  return (
    <div>
      {counts && (
        <div className="stat-grid">
          <StatCard label="Pending review" value={counts.pending} sub="needs your action" />
          <StatCard label="Verified employees" value={counts.verified?.toLocaleString()} />
          <StatCard label="Rejected" value={counts.rejected} />
          <StatCard label="Total employees" value={counts.total?.toLocaleString()} />
        </div>
      )}

      <div className="filters-bar">
        <div className="pill-bar">
          {USER_PILLS.map((p) => (
            <button key={p.key} className={`pill${stage === p.key ? " active" : ""}`} onClick={() => setStage(p.key)}>
              {p.label}
              {counts && p.key === "pending" && <span className="count">{counts.pending}</span>}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Search name / phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="btn" onClick={() => load(1)}>Search</button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} emptyText="No users in this stage" />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {selected && (
        <Modal
          title="Employee verification"
          onClose={() => setSelected(null)}
          size="lg"
          footer={
            <>
              <button className="btn" onClick={() => setSelected(null)}>Close</button>
              {!selectedVerified && canEdit && (
                <>
                  <button
                    className="btn ghost-danger"
                    disabled={busy}
                    onClick={() => {
                      setReason("");
                      setRejectComposer(initComposer("b2c", "rejected", ""));
                      setRejecting(selected);
                    }}
                  >
                    Reject
                  </button>
                  {approveComposer ? (
                    <button className="btn primary" disabled={busy} onClick={() => approve(selected)}>
                      {busy ? "Working…" : approveComposer.enabled ? "Confirm — verify & send" : "Confirm — verify"}
                    </button>
                  ) : (
                    <button
                      className="btn primary"
                      disabled={busy}
                      onClick={() => setApproveComposer(initComposer("b2c", "verified"))}
                    >
                      Approve & verify
                    </button>
                  )}
                </>
              )}
            </>
          }
        >
          <div className="person-head">
            <div className="avatar-lg">
              {imgSrc(selected.profile?.fileName) ? (
                <img src={imgSrc(selected.profile.fileName)} alt="" />
              ) : (
                (selected.basicDetails?.name || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="who">
              <div className="nm">{selected.basicDetails?.name || "Unnamed user"}</div>
              <div className="ph">
                {selected.phoneNumber}
                {selected.basicDetails?.city ? ` · ${selected.basicDetails.city}` : ""}
              </div>
            </div>
            <div className="right">
              {selectedVerified ? (
                <Badge value="verified" color="green" />
              ) : selected.isManualVerificationPending ? (
                <Badge value="pending review" color="orange" />
              ) : (
                <Badge value="not verified" />
              )}
            </div>
          </div>
          <Timeline steps={computeUserSteps(selected, true)} />

          {/* Message already sent to this user */}
          {selected.verificationMessage && <SentMessageCard record={selected.verificationMessage} />}

          {/* Compose the verification-complete message before approving */}
          {!selectedVerified && canEdit && approveComposer && (
            <>
              <div className="form-section-title">Verification message</div>
              <MessageComposer
                audience="b2c"
                kind="verified"
                value={approveComposer}
                onChange={setApproveComposer}
              />
            </>
          )}
        </Modal>
      )}

      {rejecting && (
        <Modal
          title={`Reject — ${rejecting.basicDetails?.name || rejecting.phoneNumber}`}
          onClose={() => setRejecting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setRejecting(null)}>Cancel</button>
              <button className="btn danger" onClick={doReject} disabled={busy}>
                {busy ? "Rejecting…" : "Reject verification"}
              </button>
            </>
          }
        >
          <div className="field">
            <label>Reason (shown to the user)</label>
            <textarea
              className="textarea"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Document photo is blurred, please re-upload"
            />
          </div>
          {rejectComposer && (
            <MessageComposer
              audience="b2c"
              kind="rejected"
              reason={reason}
              value={rejectComposer}
              onChange={setRejectComposer}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

// ── B2B: employer verification flow ──────────────────────────────────────────

const employerDocs = (o) => {
  const companies = (o.company || []).filter((c) => c && !c.isDeleted);
  const gst = companies.flatMap((c) => c.gst || []).filter((d) => d && !d.isDeleted);
  const fssaiDocs = companies.flatMap((c) => c.fssai || []).filter((d) => d && !d.isDeleted);
  const other = companies.flatMap((c) => c.otherDocument || []).filter((d) => d && !d.isDeleted);
  return { companies, gst, fssai: fssaiDocs, other };
};

// Fully verified = step 4 complete: at least one approved document, none pending.
const ownerVerified = (o) => {
  const { gst, fssai: fssaiDocs, other } = employerDocs(o);
  const approved =
    gst.filter((d) => d.isLinked).length +
    fssaiDocs.filter((d) => d.isLinked).length +
    other.filter((d) => d.verificationStatus === "approved").length;
  const pending = other.filter((d) => d.verificationStatus === "pending").length;
  return approved > 0 && pending === 0;
};

const computeOwnerSteps = (o) => {
  const { companies, gst, fssai: fssaiDocs, other } = employerDocs(o);
  const profileDone = Boolean(o.name);
  const companyDone = companies.length > 0;
  const allDocs = gst.length + fssaiDocs.length + other.length;
  const approvedDocs =
    gst.filter((d) => d.isLinked).length +
    fssaiDocs.filter((d) => d.isLinked).length +
    other.filter((d) => d.verificationStatus === "approved").length;
  const pendingOther = other.filter((d) => d.verificationStatus === "pending").length;
  const docsDone = approvedDocs > 0 && pendingOther === 0;

  return [
    { key: "reg", title: "Registration", status: "complete", desc: `${o.phoneNumber} · joined ${fmtDate(o.createdAt)}` },
    {
      key: "profile",
      title: "Profile details",
      status: profileDone ? "complete" : "current",
      desc: profileDone ? [o.name, o.currentCity, o.email].filter(Boolean).join(" · ") : "Profile not completed",
    },
    {
      key: "company",
      title: "Company added",
      status: companyDone ? "complete" : profileDone ? "current" : "upcoming",
      desc: companyDone ? companies.map((c) => c.companyName).filter(Boolean).join(", ") : "No company yet",
    },
    {
      key: "docs",
      title: "Business documents — final step",
      status: docsDone ? "complete" : allDocs > 0 ? "current" : companyDone ? "current" : "upcoming",
      desc: docsDone
        ? `Fully verified ✓ · ${approvedDocs}/${allDocs} documents approved`
        : allDocs === 0
          ? "No documents submitted"
          : `${approvedDocs}/${allDocs} approved${pendingOther ? ` · ${pendingOther} pending review` : ""}`,
    },
  ];
};

const OWNER_PILLS = [
  { key: "", label: "All employers", count: "total" },
  { key: "step1", label: "Step 1 · Registered", count: "step1" },
  { key: "step2", label: "Step 2 · Profile done", count: "step2" },
  { key: "step3", label: "Step 3 · Company added", count: "step3" },
  { key: "step4", label: "Step 4 · Docs pending", count: "step4" },
  { key: "verified", label: "Fully verified", count: "verified" },
];

function EmployerVerifications() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("verifications", "edit");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stage, setStage] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [docReject, setDocReject] = useState(null); // { type, id, reason, composer }
  const [verifyMsg, setVerifyMsg] = useState(null); // composer for verification-complete msg
  const [busy, setBusy] = useState(false);

  const load = async (p = page, s = stage) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (s) params.stage = s;
      if (search) params.search = search;
      const res = await getEmployerVerifications(params);
      setRows(res.data?.data || []);
      setCounts(res.data?.counts || null);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
      if (selected) {
        const fresh = (res.data?.data || []).find((r) => r._id === selected._id);
        if (fresh) setSelected(fresh);
      }
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load employers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // Approve a document (or revoke). Rejections go through the modal below so a
  // re-upload message can be composed.
  const reviewDoc = async (type, id, action) => {
    if (action === "reject") {
      setDocReject({ type, id, reason: "", composer: initComposer("b2b", "rejected", "") });
      return;
    }
    setBusy(true);
    try {
      await reviewBusinessDocument(type, id, action);
      toast(`Document ${action === "approve" ? "approved" : "updated"}`, "success");
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const submitDocReject = async () => {
    setBusy(true);
    try {
      await reviewBusinessDocument(
        docReject.type,
        docReject.id,
        "reject",
        docReject.reason,
        composerPayload(docReject.composer),
      );
      toast("Document rejected — re-upload request sent", "success");
      setDocReject(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  // Send the "verification complete" message (also flips the isVerified flag).
  const sendVerifiedMessage = async () => {
    setBusy(true);
    try {
      const res = await setEmployerVerified(selected._id, true, composerPayload(verifyMsg));
      const sent = res.data?.data?.verificationMessage;
      toast("Verification message sent ✓", "success");
      setSelected((s) => (s ? { ...s, isVerified: true, verificationMessage: sent } : s));
      setVerifyMsg(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to send", "error");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "name", label: "Employer", render: (r) => r.name || "—" },
    { key: "phone", label: "Phone", render: (r) => r.phoneNumber },
    {
      key: "companies",
      label: "Company",
      render: (r) => employerDocs(r).companies.map((c) => c.companyName).filter(Boolean).join(", ") || "—",
    },
    { key: "steps", label: "Verification progress", render: (r) => <MiniStepper steps={computeOwnerSteps(r)} /> },
    {
      key: "docs",
      label: "Documents",
      render: (r) => {
        const { gst, fssai: f, other } = employerDocs(r);
        const n = gst.length + f.length + other.length;
        const pend = other.filter((d) => d.verificationStatus === "pending").length;
        return n === 0 ? "—" : pend ? <Badge value={`${pend} pending`} color="orange" /> : `${n} docs`;
      },
    },
    {
      key: "state",
      label: "Status",
      render: (r) => (ownerVerified(r) ? <Badge value="verified" /> : <Badge value="not verified" color="orange" />),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <button className="btn sm primary" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
          Review
        </button>
      ),
    },
  ];

  const docsBlock = (o) => {
    const { gst, fssai: f, other } = employerDocs(o);
    if (gst.length + f.length + other.length === 0)
      return <div className="tl-desc">No business documents submitted yet.</div>;
    return (
      <>
        {gst.map((d) => (
          <div className="vdoc-card" key={d._id}>
            <div className="info">
              <div className="t">GST · {d.GSTIN || "—"}</div>
              <div className="s">{d.legal_name_of_business || "—"}{d.state ? ` · ${d.state}` : ""}</div>
            </div>
            <div className="row-actions">
              <Badge value={d.isLinked ? "approved" : "pending"} />
              {!canEdit ? null : d.isLinked ? (
                <button className="btn sm ghost-danger" disabled={busy} onClick={() => reviewDoc("gst", d._id, "reject")}>
                  Revoke
                </button>
              ) : (
                <button className="btn sm primary" disabled={busy} onClick={() => reviewDoc("gst", d._id, "approve")}>
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}
        {f.map((d) => (
          <div className="vdoc-card" key={d._id}>
            <div className="info">
              <div className="t">FSSAI · {d.fssai || "—"}</div>
              <div className="s">{d.entity || "—"}{d.state ? ` · ${d.state}` : ""}</div>
            </div>
            <div className="row-actions">
              <Badge value={d.isLinked ? "approved" : "pending"} />
              {!canEdit ? null : d.isLinked ? (
                <button className="btn sm ghost-danger" disabled={busy} onClick={() => reviewDoc("fssai", d._id, "reject")}>
                  Revoke
                </button>
              ) : (
                <button className="btn sm primary" disabled={busy} onClick={() => reviewDoc("fssai", d._id, "approve")}>
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}
        {other.map((d) => (
          <div className="vdoc-card" key={d._id}>
            <div className="info">
              <div className="t">{d.documentType || "Other document"} · {d.documentNumber || "—"}</div>
              <div className="s">
                Uploaded {fmtDate(d.createdAt)}
                {d.adminRemarks ? ` · remarks: ${d.adminRemarks}` : ""}
                {imgSrc(d.document) && (
                  <>
                    {" · "}
                    <a href={imgSrc(d.document)} target="_blank" rel="noreferrer">view file</a>
                  </>
                )}
              </div>
            </div>
            <div className="row-actions">
              <Badge value={d.verificationStatus || "pending"} />
              {canEdit && d.verificationStatus !== "approved" && (
                <button className="btn sm primary" disabled={busy} onClick={() => reviewDoc("other", d._id, "approve")}>
                  Approve
                </button>
              )}
              {canEdit && d.verificationStatus !== "rejected" && (
                <button className="btn sm ghost-danger" disabled={busy} onClick={() => reviewDoc("other", d._id, "reject")}>
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div>
      {counts && (
        <div className="stat-grid">
          <StatCard label="Docs pending review (step 4)" value={counts.step4?.toLocaleString()} sub="needs your action" />
          <StatCard label="Fully verified" value={counts.verified?.toLocaleString()} sub="all 4 steps complete" />
          <StatCard label="Company added (step 3)" value={counts.step3?.toLocaleString()} sub="no documents yet" />
          <StatCard label="Total employers" value={counts.total?.toLocaleString()} />
        </div>
      )}

      <div className="filters-bar">
        <div className="pill-bar">
          {OWNER_PILLS.map((p) => (
            <button key={p.key} className={`pill${stage === p.key ? " active" : ""}`} onClick={() => setStage(p.key)}>
              {p.label}
              {counts && counts[p.count] != null && <span className="count">{counts[p.count].toLocaleString()}</span>}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Search name / phone / email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="btn" onClick={() => load(1)}>Search</button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} emptyText="No employers in this stage" />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {selected && (
        <Modal
          title="Employer verification"
          onClose={() => { setSelected(null); setVerifyMsg(null); }}
          size="lg"
          footer={
            <>
              <button className="btn" onClick={() => { setSelected(null); setVerifyMsg(null); }}>Close</button>
              {canEdit && ownerVerified(selected) && (
                verifyMsg ? (
                  <button className="btn primary" disabled={busy} onClick={sendVerifiedMessage}>
                    {busy ? "Sending…" : verifyMsg.enabled ? "Send message" : "Mark verified"}
                  </button>
                ) : (
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => setVerifyMsg(initComposer("b2b", "verified"))}
                  >
                    Send “verification complete” message
                  </button>
                )
              )}
            </>
          }
        >
          <div className="person-head">
            <div className="avatar-lg">
              {imgSrc(selected.image) ? (
                <img src={imgSrc(selected.image)} alt="" />
              ) : (
                (selected.name || "E").charAt(0).toUpperCase()
              )}
            </div>
            <div className="who">
              <div className="nm">{selected.name || "Unnamed employer"}</div>
              <div className="ph">
                {selected.phoneNumber}
                {selected.currentCity ? ` · ${selected.currentCity}` : ""}
                {selected.email ? ` · ${selected.email}` : ""}
              </div>
            </div>
            <div className="right">
              {ownerVerified(selected) ? <Badge value="verified" color="green" /> : <Badge value="not verified" color="orange" />}
            </div>
          </div>
          <Timeline
            steps={computeOwnerSteps(selected).map((s) =>
              s.key === "docs" ? { ...s, content: docsBlock(selected) } : s,
            )}
          />

          {selected.verificationMessage && <SentMessageCard record={selected.verificationMessage} />}

          {canEdit && ownerVerified(selected) && verifyMsg && (
            <>
              <div className="form-section-title">Verification-complete message</div>
              <MessageComposer audience="b2b" kind="verified" value={verifyMsg} onChange={setVerifyMsg} />
            </>
          )}
        </Modal>
      )}

      {docReject && (
        <Modal
          title="Reject document & request re-upload"
          onClose={() => setDocReject(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDocReject(null)}>Cancel</button>
              <button className="btn danger" onClick={submitDocReject} disabled={busy}>
                {busy ? "Rejecting…" : "Reject & notify"}
              </button>
            </>
          }
        >
          <div className="field">
            <label>Reason (shown to the employer)</label>
            <textarea
              className="textarea"
              rows={2}
              value={docReject.reason}
              onChange={(e) => setDocReject({ ...docReject, reason: e.target.value })}
              placeholder="e.g. GST certificate is unclear, please re-upload"
            />
          </div>
          <MessageComposer
            audience="b2b"
            kind="rejected"
            reason={docReject.reason}
            value={docReject.composer}
            onChange={(composer) => setDocReject((d) => ({ ...d, composer }))}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Verifications() {
  const [tab, setTab] = useState("b2c");
  return (
    <div>
      <div className="tabs">
        <button className={`tab${tab === "b2c" ? " active" : ""}`} onClick={() => setTab("b2c")}>
          B2C — Employee verification
        </button>
        <button className={`tab${tab === "b2b" ? " active" : ""}`} onClick={() => setTab("b2b")}>
          B2B — Employer verification
        </button>
      </div>
      {tab === "b2c" ? <EmployeeVerifications /> : <EmployerVerifications />}
    </div>
  );
}
