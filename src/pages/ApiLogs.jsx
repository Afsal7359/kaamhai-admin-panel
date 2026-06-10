import { useEffect, useState } from "react";
import { getApiLogs } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-IN") : "—");

export default function ApiLogs() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [name, setName] = useState("");
  const [statusCode, setStatusCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (name) params.name = name;
      if (statusCode) params.statusCode = statusCode;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await getApiLogs(params);
      const d = res.data?.data || {};
      setRows(d.logs || []);
      setStats(d.statistics || null);
      setTotalPages(d.pagination?.totalPages || 1);
      setTotal(d.pagination?.totalCount || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = [
    { key: "name", label: "API" },
    { key: "route", label: "Route", render: (r) => r.route || "—" },
    { key: "method", label: "Method", render: (r) => r.method || "—" },
    { key: "statusCode", label: "Code", render: (r) => <Badge value={r.statusCode} color={String(r.statusCode).startsWith("2") ? "green" : "red"} /> },
    { key: "message", label: "Message", render: (r) => r.message || r.title || "—" },
    { key: "userId", label: "User", render: (r) => r.userId?.name || (typeof r.userId === "string" ? r.userId : "—") },
    { key: "createdAt", label: "Time", render: (r) => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      {stats && (
        <div className="stat-grid">
          <StatCard label="Total (filtered)" value={stats.total?.toLocaleString()} />
          {Object.entries(stats.statusCodeBreakdown || {})
            .slice(0, 6)
            .map(([code, count]) => (
              <StatCard key={code} label={`HTTP ${code}`} value={count.toLocaleString()} />
            ))}
        </div>
      )}

      <div className="filters-bar">
        <input
          className="input"
          placeholder="API name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <input
          className="input"
          placeholder="Status code (e.g. 500)"
          style={{ minWidth: 140 }}
          value={statusCode}
          onChange={(e) => setStatusCode(e.target.value)}
        />
        <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button className="btn primary" onClick={() => load(1)}>
          Apply
        </button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>
    </div>
  );
}
