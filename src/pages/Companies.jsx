import { useEffect, useState } from "react";
import { getCompaniesList } from "../api/endpoints";
import { fileUrl } from "../api/client";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";
import CompanyDetail from "../components/CompanyDetail";
import { useToast } from "../components/Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");
const img = (p) => fileUrl(p);

export default function Companies() {
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
      const res = await getCompaniesList({ page: p, limit: 20, ...(s ? { search: s } : {}) });
      setRows(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load companies", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    {
      key: "company",
      label: "Company",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span className="company-logo" style={{ width: 30, height: 30, fontSize: 13 }}>
            {img(r.companyLogo) ? <img src={img(r.companyLogo)} alt="" /> : (r.companyName || "C").charAt(0).toUpperCase()}
          </span>
          <span>{r.companyName || "Unnamed"}</span>
        </div>
      ),
    },
    { key: "companyRole", label: "Type", render: (r) => r.companyRole || "—" },
    { key: "b2bUsers", label: "B2B users", render: (r) => <Badge value={String(r.b2bUsers)} color="indigo" /> },
    { key: "branches", label: "Branches", render: (r) => r.branches },
    { key: "employees", label: "Employees", render: (r) => r.employees },
    { key: "docs", label: "Documents", render: (r) => r.docs },
    { key: "createdAt", label: "Created", render: (r) => fmtDate(r.createdAt) },
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
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="btn primary" onClick={() => load(1)}>Search</button>
        <span style={{ color: "var(--text-soft)", fontSize: 13 }}>{total.toLocaleString()} companies</span>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(r) => setOpen(r._id)} emptyText="No companies" />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {open && <CompanyDetail companyId={open} onClose={() => setOpen(null)} onChanged={() => load(page)} />}
    </div>
  );
}
