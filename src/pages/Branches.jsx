import { useEffect, useState } from "react";
import { getBranchesList } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";
import BranchDetail from "../components/BranchDetail";
import { useToast } from "../components/Toast";

export default function Branches() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);

  const load = async (p = page, s = search) => {
    setLoading(true);
    try {
      const res = await getBranchesList({ page: p, limit: 20, ...(s ? { search: s } : {}) });
      setRows(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load branches", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { key: "branchName", label: "Branch", render: (r) => <span>{r.branchName} <span className="mono" style={{ fontSize: 11, color: "var(--text-soft)" }}>{r.branchCode}</span></span> },
    { key: "branchType", label: "Type", render: (r) => r.branchType || "—" },
    { key: "company", label: "Company", render: (r) => r.companyId?.companyName || "—" },
    { key: "owner", label: "Owner", render: (r) => r.ownerId?.name || r.ownerId?.phoneNumber || "—" },
    { key: "city", label: "City", render: (r) => r.location?.city || "—" },
    { key: "employees", label: "Employees", render: (r) => <Badge value={String(r.employees)} color="indigo" /> },
    { key: "isActive", label: "Status", render: (r) => <Badge value={r.isActive ? "active" : "inactive"} /> },
    {
      key: "__actions",
      label: "Actions",
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn sm" onClick={() => setOpen(r._id)}>View</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="filters-bar">
        <input
          className="input"
          placeholder="Search branches / code / city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="btn primary" onClick={() => load(1)}>Search</button>
        <span style={{ color: "var(--text-soft)", fontSize: 13 }}>{total.toLocaleString()} branches</span>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => setOpen(r._id)} emptyText="No branches" />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {open && <BranchDetail branchId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
