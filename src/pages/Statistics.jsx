import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getStatsOverview } from "../api/endpoints";
import { useToast } from "../components/Toast";

// Validated categorical palette (dataviz validator: all checks pass, CVD 31.3).
const CAT = ["#4f46e5", "#0d9488", "#d97706", "#e11d48", "#7c3aed", "#0891b2"];
// Reserved status tones — shipped with labels, never reused as "series N".
const TONE = { ok: "#039855", warn: "#d97706", bad: "#d92d20", muted: "#98a2b3" };
// Status colours for lifecycle donuts (each slice is directly labelled by the legend).
const OFFER_COLORS = { Active: "#4f46e5", Accepted: "#039855", Rejected: "#d92d20", Expired: "#98a2b3" };

const AXIS = { fontSize: 12, fill: "#667085" };
const GRID = "#eef0f4";
const nf = (n) => (n ?? 0).toLocaleString();

function ChartCard({ title, sub, children, height = 260 }) {
  return (
    <div className="panel panel-pad">
      <h3 className="panel-title" style={{ marginBottom: sub ? 2 : 14 }}>{title}</h3>
      {sub && <div className="stat-sub" style={{ marginBottom: 12 }}>{sub}</div>}
      <ResponsiveContainer width="100%" height={height}>{children}</ResponsiveContainer>
    </div>
  );
}

// Horizontal single-series magnitude bar (labels fit on the left).
// `...rest` forwards the width/height ResponsiveContainer injects into its child.
function MagnitudeBar({ data, color = CAT[0], ...rest }) {
  return (
    <BarChart {...rest} data={data} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
      <CartesianGrid horizontal={false} stroke={GRID} />
      <XAxis type="number" tick={AXIS} allowDecimals={false} />
      <YAxis type="category" dataKey="name" tick={AXIS} width={116} />
      <Tooltip formatter={(v) => nf(v)} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
      <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false}>
        <LabelList dataKey="value" position="right" formatter={nf} style={{ fill: "#344054", fontSize: 12, fontWeight: 600 }} />
      </Bar>
    </BarChart>
  );
}

// Donut with legend — identity/status split.
function Donut({ data, colorFor, ...rest }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  return (
    <PieChart {...rest}>
      <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
        {data.map((d, i) => (
          <Cell key={d.name} fill={colorFor ? colorFor(d, i) : CAT[i % CAT.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(v, n) => [`${nf(v)} (${total ? Math.round((v / total) * 100) : 0}%)`, n]} />
      <Legend verticalAlign="bottom" height={30} iconType="circle" wrapperStyle={{ fontSize: 12.5 }} />
    </PieChart>
  );
}

export default function Statistics() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getStatsOverview();
      setData(res.data || null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load statistics", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="loading">Loading statistics…</div>;
  if (!data) return <div className="empty-state">No data</div>;

  const t = data.totals || {};
  const kpis = [
    { label: "Employees", value: t.employees },
    { label: "Employers", value: t.employers },
    { label: "Companies", value: t.companies },
    { label: "Branches", value: t.branches },
    { label: "Current employees", value: t.currentEmployees },
    { label: "Ex employees", value: t.exEmployees },
    { label: "Job posts", value: t.jobPosts },
    { label: "Offer letters", value: t.offers },
  ];

  return (
    <div>
      <p className="dash-sub" style={{ marginTop: 0 }}>
        Full platform counts across every collection. Totals are all-time.
      </p>

      {/* Grand totals */}
      <div className="stat-grid">
        {kpis.map((k) => (
          <div className="stat-card" key={k.label}>
            <div className="stat-label">{k.label}</div>
            <div className="stat-value">{nf(k.value)}</div>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <ChartCard title="Employee verification" sub="How many employees cleared each verification signal">
          <MagnitudeBar data={data.employeeVerification} color={CAT[0]} />
        </ChartCard>

        <ChartCard title="Employees — verified vs unverified" sub={`of ${nf(t.employees)} total`}>
          <Donut data={data.employeeVerifiedSplit} colorFor={(d) => TONE[d.tone] || CAT[0]} />
        </ChartCard>

        <ChartCard title="Employers — verification" sub={`of ${nf(t.employers)} employers`}>
          <Donut data={data.employerVerifiedSplit} colorFor={(d) => TONE[d.tone] || CAT[0]} />
        </ChartCard>

        <ChartCard title="Business documents — linked vs unlinked" sub="GST & FSSAI records">
          <BarChart data={data.documentsByType} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="type" tick={AXIS} />
            <YAxis tick={AXIS} allowDecimals={false} />
            <Tooltip formatter={(v) => nf(v)} cursor={{ fill: "rgba(79,70,229,0.06)" }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12.5 }} />
            <Bar dataKey="linked" name="Linked" fill={CAT[0]} radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={false}>
              <LabelList dataKey="linked" position="top" formatter={nf} style={{ fill: "#344054", fontSize: 11 }} />
            </Bar>
            <Bar dataKey="unlinked" name="Unlinked" fill={CAT[1]} radius={[4, 4, 0, 0]} barSize={40} isAnimationActive={false}>
              <LabelList dataKey="unlinked" position="top" formatter={nf} style={{ fill: "#344054", fontSize: 11 }} />
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="Other documents — review status">
          <Donut data={data.otherDocStatus} colorFor={(d) => TONE[d.tone] || CAT[0]} />
        </ChartCard>

        <ChartCard title="Offer letters — by status">
          <Donut data={data.offers} colorFor={(d) => OFFER_COLORS[d.name] || CAT[0]} />
        </ChartCard>

        <ChartCard title="Job posts — by status">
          <MagnitudeBar data={data.jobPosts} color={CAT[2]} />
        </ChartCard>

        <ChartCard title="Employment records — by status">
          <MagnitudeBar data={data.employmentRecords} color={CAT[1]} />
        </ChartCard>

        <ChartCard title="Workforce">
          <MagnitudeBar data={data.workforce} color={CAT[4]} />
        </ChartCard>

        <ChartCard title="Companies & branches">
          <MagnitudeBar data={data.companiesBranches} color={CAT[5]} />
        </ChartCard>
      </div>
    </div>
  );
}
