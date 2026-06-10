export default function StatCard({ label, value, sub }) {
  // Never render raw objects — React throws on object children.
  const safe =
    value == null
      ? "—"
      : typeof value === "object"
        ? (value.total?.now ?? value.now ?? "—")
        : value;
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{safe}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}
