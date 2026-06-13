import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getEventStats,
  getEventsList,
  getFunnelNames,
  getFunnel,
  getStuckPoints,
  getUserTimeline,
} from "../api/endpoints";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "funnels", label: "Funnels" },
  { key: "stuck", label: "Where users get stuck" },
  { key: "explorer", label: "Event explorer" },
  { key: "timeline", label: "User timeline" },
];

const fmtTime = (d) => (d ? new Date(d).toLocaleString("en-IN") : "");
const num = (n) => Number(n || 0).toLocaleString("en-IN");

export default function Analytics() {
  const toast = useToast();
  const [tab, setTab] = useState("overview");

  // Shared filters applied to every tab.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [role, setRole] = useState("all");
  const [platform, setPlatform] = useState("all");

  const sharedParams = () => {
    const p = {};
    if (startDate) p.startDate = startDate;
    if (endDate) p.endDate = endDate;
    if (role !== "all") p.role = role;
    if (platform !== "all") p.platform = platform;
    return p;
  };

  return (
    <div>
      <div className="filters-bar">
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All users</option>
          <option value="employee">B2C (job seekers)</option>
          <option value="employer">B2B (employers)</option>
          <option value="guest">Guest (pre-login)</option>
        </select>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          <option value="android">Android</option>
          <option value="ios">iOS</option>
        </select>
        {(startDate || endDate) && (
          <button className="btn" onClick={() => { setStartDate(""); setEndDate(""); }}>Clear dates</button>
        )}
      </div>

      <div className="tabs-bar" style={{ display: "flex", gap: 8, margin: "12px 0", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`btn ${tab === t.key ? "primary" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview params={sharedParams()} toast={toast} />}
      {tab === "funnels" && <Funnels params={sharedParams()} toast={toast} />}
      {tab === "stuck" && <Stuck params={sharedParams()} toast={toast} />}
      {tab === "explorer" && <Explorer baseParams={sharedParams()} toast={toast} />}
      {tab === "timeline" && <Timeline toast={toast} />}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function Overview({ params, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getEventStats(params)
      .then((res) => alive && setData(res.data?.data || null))
      .catch((e) => toast(e.response?.data?.message || "Failed to load stats", "error"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  if (loading) return <div className="loading">Loading engagement…</div>;
  if (!data) return <div className="empty-state">No events yet</div>;

  const t = data.totals || {};
  return (
    <>
      <div className="stat-grid">
        <StatCard label="Total events" value={num(t.events)} sub="in selected range" />
        <StatCard label="Active users" value={num(t.users)} sub="identified (logged in)" />
        <StatCard label="Sessions" value={num(t.sessions)} sub="app sessions" />
        <StatCard label="Devices" value={num(t.devices)} sub="unique installs" />
      </div>

      <div className="chart-grid">
        <div className="panel panel-pad">
          <h3 className="panel-title">Events & active devices over time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.byDay || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="events" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="devices" stroke="#039855" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="panel panel-pad">
          <h3 className="panel-title">Top events</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={(data.topEvents || []).slice(0, 12)} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="eventName" width={130} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#4f46e5" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-grid">
        <BreakdownPanel title="By user type (B2C / B2B)" rows={data.byRole} keyName="role" />
        <BreakdownPanel title="By platform" rows={data.byPlatform} keyName="platform" />
      </div>
      <div className="chart-grid">
        <BreakdownPanel title="Top cities" rows={data.byCity} keyName="city" />
        <BreakdownPanel title="By category" rows={data.byCategory} keyName="category" />
      </div>
    </>
  );
}

function BreakdownPanel({ title, rows = [], keyName }) {
  const data = (rows || []).map((r) => ({ name: r[keyName] || "unknown", count: r.count }));
  return (
    <div className="panel panel-pad">
      <h3 className="panel-title">{title}</h3>
      {data.length === 0 ? (
        <div className="empty-state">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#039855" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ── Funnels ───────────────────────────────────────────────────────────────────
function Funnels({ params, toast }) {
  const [names, setNames] = useState([]);
  const [flow, setFlow] = useState("kyc");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFunnelNames().then((res) => setNames(res.data?.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getFunnel({ ...params, flow })
      .then((res) => alive && setData(res.data?.data || null))
      .catch((e) => toast(e.response?.data?.message || "Failed to load funnel", "error"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow, JSON.stringify(params)]);

  return (
    <>
      <div className="filters-bar">
        <select className="input" value={flow} onChange={(e) => setFlow(e.target.value)}>
          {names.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="loading">Loading funnel…</div>
      ) : !data ? (
        <div className="empty-state">No funnel data</div>
      ) : (
        <>
          {data.biggestDrop && data.biggestDrop.dropFromPrev > 0 && (
            <div className="panel panel-pad" style={{ borderLeft: "4px solid #d92d20", marginBottom: 16 }}>
              <strong>Biggest drop-off:</strong> {data.biggestDrop.dropFromPrev}% of users leave between{" "}
              <code>{data.biggestDrop.from}</code> → <code>{data.biggestDrop.to}</code>. This is where users get stuck most.
            </div>
          )}
          <div className="panel panel-pad">
            <h3 className="panel-title">Funnel: {data.flow}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.steps}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                <XAxis dataKey="step" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="panel" style={{ marginTop: 16, overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Step</th><th>Users reached</th><th>% of start</th><th>Drop from previous</th></tr>
              </thead>
              <tbody>
                {data.steps.map((s) => (
                  <tr key={s.step}>
                    <td>{s.stepIndex + 1}</td>
                    <td><code>{s.step}</code></td>
                    <td>{num(s.count)}</td>
                    <td>{s.pctOfStart}%</td>
                    <td style={{ color: s.dropFromPrev > 30 ? "#d92d20" : "inherit", fontWeight: s.dropFromPrev > 30 ? 700 : 400 }}>
                      {s.dropFromPrev}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// ── Where users get stuck ─────────────────────────────────────────────────────
function Stuck({ params, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStuckPoints(params)
      .then((res) => alive && setData(res.data?.data || null))
      .catch((e) => toast(e.response?.data?.message || "Failed to load", "error"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  if (loading) return <div className="loading">Loading…</div>;
  if (!data) return <div className="empty-state">No data</div>;

  return (
    <>
      <div className="chart-grid">
        <div className="panel panel-pad">
          <h3 className="panel-title">Most-failed flow steps</h3>
          {(data.failedSteps || []).length === 0 ? <div className="empty-state">No failures recorded 🎉</div> : (
            <table className="data-table">
              <thead><tr><th>Flow</th><th>Step</th><th>Failures</th></tr></thead>
              <tbody>
                {data.failedSteps.map((s, i) => (
                  <tr key={i}><td>{s.flow}</td><td><code>{s.step}</code></td><td>{num(s.count)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="panel panel-pad">
          <h3 className="panel-title">Screens producing the most errors</h3>
          {(data.errorScreens || []).length === 0 ? <div className="empty-state">No errors 🎉</div> : (
            <table className="data-table">
              <thead><tr><th>Screen</th><th>Errors</th></tr></thead>
              <tbody>
                {data.errorScreens.map((s, i) => (
                  <tr key={i}><td>{s.screen || "(unknown)"}</td><td>{num(s.count)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, overflowX: "auto" }}>
        <h3 className="panel-title" style={{ padding: "12px 16px 0" }}>Recent errors users saw</h3>
        <table className="data-table">
          <thead>
            <tr><th>When</th><th>Screen</th><th>Status</th><th>Message</th><th>Role</th><th>Platform</th></tr>
          </thead>
          <tbody>
            {(data.recentErrors || []).map((e, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtTime(e.createdAt)}</td>
                <td>{e.screen || "—"}</td>
                <td>{e.errorCode || "—"}</td>
                <td>{e.errorMessage || "—"}</td>
                <td>{e.role || "—"}</td>
                <td>{e.device?.platform || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Event explorer ────────────────────────────────────────────────────────────
function Explorer({ baseParams, toast }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = (p = page) => {
    setLoading(true);
    const params = { ...baseParams, page: p, limit: 25 };
    if (search) params.search = search;
    if (category !== "all") params.category = category;
    getEventsList(params)
      .then((res) => {
        setRows(res.data?.data || []);
        setTotalPages(res.data?.totalPages || 1);
        setTotal(res.data?.total || 0);
      })
      .catch((e) => toast(e.response?.data?.message || "Failed to load events", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(baseParams)]);

  return (
    <>
      <div className="filters-bar">
        <input className="input" placeholder="Search event name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          <option value="screen">Screen views</option>
          <option value="button">Button taps</option>
          <option value="flow">Flow steps</option>
          <option value="verification">Verification</option>
          <option value="api_error">API errors</option>
          <option value="lifecycle">Lifecycle</option>
        </select>
        <button className="btn primary" onClick={() => { setPage(1); load(1); }}>Search</button>
        <span style={{ alignSelf: "center", color: "#667085" }}>{num(total)} events</span>
      </div>
      <div className="panel" style={{ overflowX: "auto" }}>
        {loading ? <div className="loading">Loading…</div> : (
          <table className="data-table">
            <thead>
              <tr><th>When</th><th>Event</th><th>Category</th><th>Screen</th><th>Flow / step</th><th>Role</th><th>Platform</th><th>City</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtTime(r.createdAt)}</td>
                  <td><code>{r.eventName}</code>{r.success === false && <span style={{ color: "#d92d20" }}> ✗</span>}</td>
                  <td>{r.category}</td>
                  <td>{r.screen || "—"}</td>
                  <td>{r.flow ? `${r.flow} / ${r.step || ""}` : "—"}</td>
                  <td>{r.role}</td>
                  <td>{r.device?.platform || "—"}</td>
                  <td>{r.location?.city || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8}><div className="empty-state">No events</div></td></tr>}
            </tbody>
          </table>
        )}
      </div>
      <div className="filters-bar" style={{ justifyContent: "center", marginTop: 12 }}>
        <button className="btn" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }}>Prev</button>
        <span style={{ alignSelf: "center" }}>Page {page} / {totalPages}</span>
        <button className="btn" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); load(p); }}>Next</button>
      </div>
    </>
  );
}

// ── User timeline ─────────────────────────────────────────────────────────────
function Timeline({ toast }) {
  const [field, setField] = useState("phoneNumber");
  const [value, setValue] = useState("");
  const [events, setEvents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const load = () => {
    if (!value.trim()) return;
    setLoading(true);
    setSearched(true);
    getUserTimeline({ [field]: value.trim() })
      .then((res) => {
        setEvents(res.data?.data?.events || []);
        setSessions(res.data?.data?.sessions || []);
      })
      .catch((e) => toast(e.response?.data?.message || "Failed to load timeline", "error"))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <div className="filters-bar">
        <select className="input" value={field} onChange={(e) => setField(e.target.value)}>
          <option value="phoneNumber">Phone number</option>
          <option value="userId">User ID</option>
          <option value="deviceId">Device ID</option>
        </select>
        <input className="input" placeholder={`Enter ${field}`} value={value}
          onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <button className="btn primary" onClick={load}>Load timeline</button>
      </div>

      {loading ? <div className="loading">Loading…</div> : searched && events.length === 0 ? (
        <div className="empty-state">No events for this user</div>
      ) : events.length > 0 && (
        <>
          <div className="stat-grid">
            <StatCard label="Events" value={num(events.length)} sub="most recent first" />
            <StatCard label="Sessions" value={num(sessions.length)} sub="distinct app sessions" />
          </div>
          <div className="panel" style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr><th>When</th><th>Event</th><th>Category</th><th>Screen</th><th>Flow / step</th><th>Result</th><th>Message</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e._id}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtTime(e.createdAt)}</td>
                    <td><code>{e.eventName}</code></td>
                    <td>{e.category}</td>
                    <td>{e.screen || "—"}</td>
                    <td>{e.flow ? `${e.flow} / ${e.step || ""}` : "—"}</td>
                    <td>{e.success === false ? <span style={{ color: "#d92d20" }}>failed</span> : e.success === true ? "ok" : "—"}</td>
                    <td>{e.errorMessage || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
