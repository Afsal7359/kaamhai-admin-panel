import { useEffect, useState } from "react";
import { getOfferLetters } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useToast } from "../components/Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export default function OfferLetters() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

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
        <Modal title="Offer letter" onClose={() => setSelected(null)} size="lg">
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
    </div>
  );
}
