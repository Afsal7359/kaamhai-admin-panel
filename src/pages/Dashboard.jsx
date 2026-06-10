import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAnalytics } from "../api/endpoints";
import StatCard from "../components/StatCard";
import { useToast } from "../components/Toast";

// Analytics endpoint returns rich objects per metric:
// { daily:{now,past,growth}, weekly:{...}, monthly:{...}, quarterly:{...},
//   yearly:{...}, total:{now}, dateWiseCount }
const totalOf = (m) => (m && typeof m === "object" ? m.total?.now ?? 0 : m ?? 0);
const periodNow = (m, p) => (m && typeof m === "object" ? m[p]?.now ?? 0 : 0);
const growthOf = (m, p) => (m && typeof m === "object" ? Number(m[p]?.growth ?? 0) : 0);

const growthSub = (m, rangeActive) => {
  if (!m || typeof m !== "object") return null;
  if (rangeActive) return `${m.dateWiseCount ?? 0} in selected range`;
  const g = growthOf(m, "daily");
  const arrow = g > 0 ? "▲" : g < 0 ? "▼" : "—";
  return `+${periodNow(m, "daily")} today · ${arrow} ${Math.abs(g)}% vs yesterday`;
};

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const rangeActive = Boolean(startDate || endDate);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getAnalytics(params);
      setData(res.data?.data || null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const growthChart = data
    ? ["daily", "weekly", "monthly", "quarterly", "yearly"].map((p) => ({
        name: p === "daily" ? "Today" : p[0].toUpperCase() + p.slice(1).replace("ly", ""),
        "Job seekers": periodNow(data.usersAnalystics, p),
        Employers: periodNow(data.businessOwnerAnalystics, p),
      }))
    : [];

  const funnelChart = data
    ? [
        { name: "Photo verified", count: totalOf(data.photoVerified) },
        { name: "Aadhaar (photo)", count: totalOf(data.aadharVerified?.AadharphotoVerifiedCount) },
        { name: "Aadhaar (OTP)", count: totalOf(data.aadharVerified?.AadharOtpVerifiedCount) },
        { name: "Companies", count: totalOf(data.companyVerfiedCount) },
        { name: "GST", count: totalOf(data.gstVerifiedCount) },
        { name: "FSSAI", count: totalOf(data.fssaiVerifiedCount) },
      ]
    : [];

  return (
    <div>
      <div className="filters-bar">
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn primary" onClick={load}>
          Apply
        </button>
        {rangeActive && (
          <button
            className="btn"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading">Loading analytics…</div>
      ) : !data ? (
        <div className="empty-state">No analytics available</div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Job seekers"
              value={totalOf(data.usersAnalystics).toLocaleString()}
              sub={growthSub(data.usersAnalystics, rangeActive)}
            />
            <StatCard
              label="Employers"
              value={totalOf(data.businessOwnerAnalystics).toLocaleString()}
              sub={growthSub(data.businessOwnerAnalystics, rangeActive)}
            />
            <StatCard
              label="Job posts"
              value={(data.jobPost?.jobPostCount ?? 0).toLocaleString()}
              sub={`${(data.jobPost?.jobApplicantCount ?? 0).toLocaleString()} total applications`}
            />
            <StatCard
              label="Unique applicants"
              value={(data.jobAppliedB2CCount ?? 0).toLocaleString()}
              sub={`${(data.jobpostedB2BCount ?? 0).toLocaleString()} employers have posted jobs`}
            />
            <StatCard
              label="Aadhaar verified"
              value={(
                totalOf(data.aadharVerified?.AadharphotoVerifiedCount) +
                totalOf(data.aadharVerified?.AadharOtpVerifiedCount)
              ).toLocaleString()}
              sub="photo + OTP"
            />
            <StatCard
              label="Profile photos verified"
              value={totalOf(data.photoVerified).toLocaleString()}
              sub={growthSub(data.photoVerified, rangeActive)}
            />
            <StatCard
              label="Companies registered"
              value={totalOf(data.companyVerfiedCount).toLocaleString()}
              sub={growthSub(data.companyVerfiedCount, rangeActive)}
            />
            <StatCard
              label="GST linked"
              value={totalOf(data.gstVerifiedCount).toLocaleString()}
              sub={`${totalOf(data.fssaiVerifiedCount).toLocaleString()} FSSAI linked`}
            />
          </div>

          <div className="chart-grid">
            <div className="panel panel-pad">
              <h3 className="panel-title">New signups by period</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={growthChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Job seekers" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Employers" fill="#039855" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="panel panel-pad">
              <h3 className="panel-title">Verification funnel (totals)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
