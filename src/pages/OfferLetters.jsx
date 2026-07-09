import { useEffect, useState } from "react";
import { acceptOfferLetter, getOfferLetters, rejectOfferLetter } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const isAcceptable = (o) => (o?.status?.employee || "Active") === "Active";

export default function OfferLetters() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can("offer-letters", "edit");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null); // { action: 'accept'|'reject', offer }
  const [busy, setBusy] = useState(false);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (search) params.search = search;
      const res = await getOfferLetters(params);
      const body = res.data || {};
      setRows(body.data || body.offerLetters || []);
      setTotalPages(body.totalPages || 1);
      setTotal(body.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load offer letters", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAction = async () => {
    const { action, offer } = confirm;
    setBusy(true);
    try {
      const res = action === "accept" ? await acceptOfferLetter(offer._id) : await rejectOfferLetter(offer._id);
      if (res.data?.success) {
        toast(
          action === "accept"
            ? "Offer accepted — employee added as current employee ✓"
            : "Offer rejected",
          "success",
        );
        setConfirm(null);
        setSelected(null);
        load(page);
      } else {
        toast(res.data?.message || "Action failed", "error");
      }
    } catch (err) {
      toast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "title", label: "Job Title", render: (r) => r.jobTitle?.title || r.jobTitle?.name || "—" },
    {
      key: "employee",
      label: "Employee",
      render: (r) => r.employeeId?.basicDetails?.name || r.employeeId?.phoneNumber || "—",
    },
    { key: "employer", label: "Employer", render: (r) => r.userId?.name || r.userId?.phoneNumber || "—" },
    { key: "company", label: "Company", render: (r) => r.companyId?.companyName || "—" },
    { key: "salary", label: "Salary", render: (r) => `${r.salary || "—"} (${r.salaryType || "—"})` },
    { key: "empStatus", label: "Employee side", render: (r) => <Badge value={r.status?.employee} /> },
    { key: "emplrStatus", label: "Employer side", render: (r) => <Badge value={r.status?.employer} /> },
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
    {
      key: "__actions",
      label: "Actions",
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn sm" onClick={() => setSelected(r)}>View</button>
          {canEdit && isAcceptable(r) && (
            <>
              <button className="btn sm primary" onClick={() => setConfirm({ action: "accept", offer: r })}>Accept</button>
              <button className="btn sm ghost-danger" onClick={() => setConfirm({ action: "reject", offer: r })}>Reject</button>
            </>
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
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="btn primary" onClick={() => load(1)}>
          Apply
        </button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {selected && (
        <Modal
          title="Offer letter"
          onClose={() => setSelected(null)}
          size="lg"
          footer={
            <>
              <button className="btn" onClick={() => setSelected(null)}>Close</button>
              {canEdit && isAcceptable(selected) && (
                <>
                  <button className="btn ghost-danger" onClick={() => setConfirm({ action: "reject", offer: selected })}>
                    Reject
                  </button>
                  <button className="btn primary" onClick={() => setConfirm({ action: "accept", offer: selected })}>
                    Accept offer
                  </button>
                </>
              )}
            </>
          }
        >
          <div className="kv-grid">
            <div className="k">Job title</div><div>{selected.jobTitle?.title || "—"}</div>
            <div className="k">Description</div><div style={{ whiteSpace: "normal" }}>{selected.jobDescription || "—"}</div>
            <div className="k">Employee</div>
            <div>{selected.employeeId?.basicDetails?.name || "—"} ({selected.employeeId?.phoneNumber || "—"})</div>
            <div className="k">Employer</div><div>{selected.userId?.name || "—"} ({selected.userId?.phoneNumber || "—"})</div>
            <div className="k">Company</div><div>{selected.companyId?.companyName || "—"}</div>
            <div className="k">Salary</div><div>{selected.salary || "—"} ({selected.salaryType || "—"}, {selected.paymentMethod || "—"})</div>
            <div className="k">Allowances</div><div>{(selected.allowances || []).join(", ") || "—"}</div>
            <div className="k">Start date</div><div>{selected.startDate || "—"}</div>
            <div className="k">Employee status</div><div><Badge value={selected.status?.employee} /></div>
            <div className="k">Employer status</div><div><Badge value={selected.status?.employer} /></div>
            <div className="k">Offer ID</div><div className="mono">{selected._id}</div>
          </div>
        </Modal>
      )}

      {confirm && (
        <Modal
          title={confirm.action === "accept" ? "Accept this offer?" : "Reject this offer?"}
          onClose={() => !busy && setConfirm(null)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirm(null)} disabled={busy}>Cancel</button>
              <button
                className={`btn ${confirm.action === "accept" ? "primary" : "danger"}`}
                onClick={runAction}
                disabled={busy}
              >
                {busy ? "Working…" : confirm.action === "accept" ? "Accept offer" : "Reject offer"}
              </button>
            </>
          }
        >
          {confirm.action === "accept" ? (
            <div>
              <p>
                Accept the offer for{" "}
                <strong>{confirm.offer.employeeId?.basicDetails?.name || confirm.offer.employeeId?.phoneNumber || "this employee"}</strong>{" "}
                at <strong>{confirm.offer.companyId?.companyName || "the company"}</strong>?
              </p>
              <p style={{ color: "var(--text-soft)", fontSize: 13 }}>
                This runs the full hire workflow — the same as when the employee accepts in the app:
              </p>
              <ul style={{ color: "var(--text-soft)", fontSize: 13, marginTop: 4, paddingLeft: 18 }}>
                <li>Adds them as a <strong>current employee</strong> + creates an employment record (attendance/payroll)</li>
                <li>Marks the offer Accepted and rejects their other pending offers</li>
                <li>Locks their job search and records the job in their experience</li>
                <li>Updates the job post's hired count and notifies the employer</li>
              </ul>
            </div>
          ) : (
            <p>
              Reject the offer for{" "}
              <strong>{confirm.offer.employeeId?.basicDetails?.name || confirm.offer.employeeId?.phoneNumber || "this employee"}</strong>?
              The employer will be notified.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
