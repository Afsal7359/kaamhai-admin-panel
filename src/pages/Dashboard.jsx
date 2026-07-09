import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardSummary } from "../api/endpoints";
import { useToast } from "../components/Toast";

// YYYY-MM-DD for an offset from today (0 = today).
const dayStr = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const PRESETS = [
  { key: "today", label: "Today", range: () => [dayStr(0), dayStr(0)] },
  { key: "7d", label: "Last 7 days", range: () => [dayStr(-6), dayStr(0)] },
  { key: "30d", label: "Last 30 days", range: () => [dayStr(-29), dayStr(0)] },
  { key: "month", label: "This month", range: () => [dayStr(0).slice(0, 8) + "01", dayStr(0)] },
];

export default function Dashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const [start, setStart] = useState(dayStr(0));
  const [end, setEnd] = useState(dayStr(0));
  const [activePreset, setActivePreset] = useState("today");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (s = start, e = end) => {
    setLoading(true);
    try {
      const res = await getDashboardSummary({ startDate: s, endDate: e });
      setData(res.data || null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (p) => {
    const [s, e] = p.range();
    setStart(s);
    setEnd(e);
    setActivePreset(p.key);
    load(s, e);
  };

  const onManual = () => {
    setActivePreset("");
    load();
  };

  // Navigate to a card's destination, carrying the active date range so the
  // target list can scope to the same window.
  const go = (link) => {
    if (!link) return;
    const [path, qs] = link.split("?");
    const params = new URLSearchParams(qs || "");
    params.set("startDate", start);
    params.set("endDate", end);
    navigate(`${path}?${params.toString()}`);
  };

  const rangeLabel = useMemo(() => {
    if (start === end) return start === dayStr(0) ? "today" : start;
    return `${start} → ${end}`;
  }, [start, end]);

  return (
    <div>
      <div className="dash-controls">
        <div className="preset-row">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={`pill${activePreset === p.key ? " active" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="range-row">
          <label>From</label>
          <input type="date" className="input" value={start} max={end} onChange={(e) => setStart(e.target.value)} />
          <label>To</label>
          <input type="date" className="input" value={end} min={start} max={dayStr(0)} onChange={(e) => setEnd(e.target.value)} />
          <button className="btn primary" onClick={onManual}>Apply</button>
        </div>
      </div>

      {/* Standing totals */}
      {data?.totals && (
        <div className="totals-row">
          <span>Platform totals:</span>
          <strong>{data.totals.employees.toLocaleString()}</strong> employees
          <span className="dot">·</span>
          <strong>{data.totals.employers.toLocaleString()}</strong> employers
          <span className="dot">·</span>
          <strong>{data.totals.companies.toLocaleString()}</strong> companies
        </div>
      )}

      {loading ? (
        <div className="loading">Loading dashboard…</div>
      ) : !data ? (
        <div className="empty-state">No data</div>
      ) : (
        <>
          <p className="dash-sub">
            Showing data for <strong>{rangeLabel}</strong>. Click any card to open the full list.
          </p>
          {data.groups.map((g) => (
            <div className="dash-group" key={g.group}>
              <div className="dash-group-title">{g.group}</div>
              <div className="stat-grid">
                {g.cards.map((c) => (
                  <button
                    key={c.key}
                    className={`stat-card clickable accent-${c.accent || "default"}`}
                    onClick={() => go(c.link)}
                  >
                    <div className="stat-label">{c.label}</div>
                    <div className="stat-value">{(c.value ?? 0).toLocaleString()}</div>
                    <div className="stat-go">View list →</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
