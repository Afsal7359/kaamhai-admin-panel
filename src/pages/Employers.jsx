import { useEffect, useState } from "react";
import { getEmployers } from "../api/endpoints";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import Modal from "../components/Modal";
import Pagination from "../components/Pagination";
import { useToast } from "../components/Toast";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN") : "—");

export default function Employers() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selected, setSelected] = useState(null);

  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getEmployers(params);
      setRows(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load employers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companies = (r) =>
    (Array.isArray(r.company) ? r.company : [])
      .map((c) => (typeof c === "object" ? c?.companyName : null))
      .filter(Boolean);

  const columns = [
    { key: "name", label: "Name", render: (r) => r.name || "—" },
    { key: "phoneNumber", label: "Phone" },
    { key: "currentCity", label: "City", render: (r) => r.currentCity || "—" },
    { key: "company", label: "Companies", render: (r) => companies(r).join(", ") || "—" },
    {
      key: "isVerified",
      label: "Verified",
      render: (r) => <Badge value={r.isVerified ? "verified" : "pending"} />,
    },
    { key: "walletBalance", label: "Wallet", render: (r) => r.walletBalance ?? 0 },
    { key: "jobOfferedNumber", label: "Offers sent", render: (r) => r.jobOfferedNumber ?? 0 },
    { key: "createdAt", label: "Joined", render: (r) => fmtDate(r.createdAt) },
  ];

  return (
    <div>
      <div className="filters-bar">
        <input
          className="input"
          placeholder="Search name / phone / company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn primary" onClick={() => load(1)}>
          Apply
        </button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setSelected} />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {selected && (
        <Modal title={selected.name || selected.phoneNumber} onClose={() => setSelected(null)} size="lg">
          <div className="kv-grid">
            <div className="k">Phone</div><div>{selected.phoneNumber}</div>
            <div className="k">Email</div><div>{selected.email || "—"}</div>
            <div className="k">City</div><div>{selected.currentCity || "—"}</div>
            <div className="k">Verified</div><div><Badge value={selected.isVerified ? "verified" : "pending"} /></div>
            <div className="k">Companies</div><div>{companies(selected).join(", ") || "—"}</div>
            <div className="k">Team members</div>
            <div>
              {(selected.members || []).length
                ? selected.members.map((m, i) => (
                    <div key={i}>
                      {m.name} ({m.phoneNumber}) — <Badge value={m.role} />
                    </div>
                  ))
                : "—"}
            </div>
            <div className="k">Wallet balance</div><div>{selected.walletBalance ?? 0}</div>
            <div className="k">Hiring slots</div><div>{selected.numberOfAvailableHiring ?? 0}</div>
            <div className="k">Offers sent</div><div>{selected.jobOfferedNumber ?? 0}</div>
            <div className="k">Referral code</div><div>{selected.referralCode || "—"}</div>
            <div className="k">Joined</div><div>{fmtDate(selected.createdAt)}</div>
            <div className="k">Owner ID</div><div className="mono">{selected._id}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
