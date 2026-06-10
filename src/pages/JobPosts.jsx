import { useEffect, useState } from "react";
import {
  createPaymentLink,
  editJobPost,
  getJobPosts,
  toggleB2cCalls,
  updatePostDate,
} from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export default function JobPosts() {
  const toast = useToast();
  const { can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (search) params.search = search;
      if (paymentStatus) params.paymentStatus = paymentStatus;
      const res = await getJobPosts(params);
      setRows(res.data?.data || res.data?.posts || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load job posts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doToggleCalls = async (post) => {
    setBusy(true);
    try {
      await toggleB2cCalls({ jobPostId: post._id, enableCallsfromB2c: !post.enableCallsfromB2c });
      toast("Call setting updated", "success");
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Toggle failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const doPaymentLink = async (post) => {
    setBusy(true);
    try {
      const res = await createPaymentLink({ jobPostId: post._id, numberOfHiring: post.numberOfAvailableHiring || 1 });
      const link = res.data?.paymentLink;
      if (link) {
        await navigator.clipboard.writeText(link).catch(() => {});
        toast(`Payment link created & copied: ${link}`, "success");
      } else {
        toast("Payment link created", "success");
      }
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.title || "Payment link failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const doBumpDate = async (post) => {
    setBusy(true);
    try {
      await updatePostDate({ id: post._id, date: new Date().toISOString() });
      toast("Post date refreshed to now", "success");
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (post) =>
    setEditing({
      id: post._id,
      jobDescription: post.jobDescription || "",
      jobType: post.jobType || "",
      employmentType: post.employmentType || "",
      salaryType: post.salaryType || "",
      preferredGender: post.preferredGender || "",
      minSalary: post.salaryRange?.minSalary ?? "",
      maxSalary: post.salaryRange?.maxSalary ?? "",
    });

  const saveEdit = async () => {
    setBusy(true);
    try {
      await editJobPost(editing);
      toast("Job post updated", "success");
      setEditing(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "title", label: "Job Title", render: (r) => r.jobTitle?.title || r.jobTitle?.name || "—" },
    { key: "company", label: "Company", render: (r) => r.companyId?.companyName || "—" },
    { key: "owner", label: "Owner", render: (r) => r.userId?.name || r.userId?.phoneNumber || "—" },
    {
      key: "salary",
      label: "Salary",
      render: (r) =>
        r.salaryRange ? `${r.salaryRange.minSalary ?? "—"}–${r.salaryRange.maxSalary ?? "—"} (${r.salaryType || ""})` : "—",
    },
    { key: "status", label: "Status", render: (r) => <Badge value={r.status} /> },
    { key: "paymentDone", label: "Payment", render: (r) => <Badge value={r.paymentDone ? "paid" : "unpaid"} /> },
    { key: "applicantCount", label: "Applicants", render: (r) => r.applicantCount ?? r.applicants?.length ?? 0 },
    { key: "hired", label: "Hired", render: (r) => `${r.hiredNumber ?? 0}/${r.numberOfAvailableHiring ?? 0}` },
    { key: "date", label: "Posted", render: (r) => fmtDate(r.date || r.createdAt) },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          {can("job-posts", "edit") && (
            <>
              <button className="btn sm" onClick={() => startEdit(r)}>Edit</button>
              <button className="btn sm" disabled={busy} onClick={() => doToggleCalls(r)}>
                {r.enableCallsfromB2c ? "Disable calls" : "Enable calls"}
              </button>
              <button className="btn sm" disabled={busy} onClick={() => doBumpDate(r)}>
                Bump date
              </button>
            </>
          )}
          {!r.paymentDone && can("payments", "create") && (
            <button className="btn sm" disabled={busy} onClick={() => doPaymentLink(r)}>
              Pay link
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
          placeholder="Search title / company / owner / phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <select className="select" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">Payment: all</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
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
        <Modal title={selected.jobTitle?.title || "Job post"} onClose={() => setSelected(null)} size="lg">
          <div className="kv-grid">
            <div className="k">Description</div><div style={{ whiteSpace: "normal" }}>{selected.jobDescription || "—"}</div>
            <div className="k">Company</div><div>{selected.companyId?.companyName || "—"}</div>
            <div className="k">Owner</div><div>{selected.userId?.name} ({selected.userId?.phoneNumber})</div>
            <div className="k">Type</div><div>{selected.jobType || "—"} / {selected.employmentType || "—"}</div>
            <div className="k">Salary</div>
            <div>{selected.salaryRange?.minSalary ?? "—"} – {selected.salaryRange?.maxSalary ?? "—"} ({selected.salaryType || "—"})</div>
            <div className="k">Preferred gender</div><div>{selected.preferredGender || "—"}</div>
            <div className="k">Status</div><div><Badge value={selected.status} /></div>
            <div className="k">Payment</div><div><Badge value={selected.paymentDone ? "paid" : "unpaid"} /></div>
            <div className="k">B2C calls</div><div><Badge value={selected.enableCallsfromB2c ? "active" : "inactive"} /></div>
            <div className="k">Hiring</div><div>{selected.hiredNumber ?? 0} hired of {selected.numberOfAvailableHiring ?? 0}</div>
            <div className="k">Share link</div><div>{selected.shareLink ? <a href={selected.shareLink} target="_blank" rel="noreferrer">{selected.shareLink}</a> : "—"}</div>
            <div className="k">Post ID</div><div className="mono">{selected._id}</div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal
          title="Edit job post"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn primary" onClick={saveEdit} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <div className="field full">
              <label>Description</label>
              <textarea
                className="textarea"
                rows={4}
                value={editing.jobDescription}
                onChange={(e) => setEditing({ ...editing, jobDescription: e.target.value })}
              />
            </div>
            {[
              ["jobType", "Job type"],
              ["employmentType", "Employment type"],
              ["salaryType", "Salary type"],
              ["preferredGender", "Preferred gender"],
              ["minSalary", "Min salary"],
              ["maxSalary", "Max salary"],
            ].map(([f, label]) => (
              <div className="field" key={f}>
                <label>{label}</label>
                <input className="input" value={editing[f]} onChange={(e) => setEditing({ ...editing, [f]: e.target.value })} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
