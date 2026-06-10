const COLOR_MAP = {
  // green
  paid: "green", active: "green", approved: "green", accepted: "green", verified: "green",
  completed: "green", open: "green", present: "green", success: "green", true: "green",
  // orange
  pending: "orange", created: "orange", awaiting: "orange", draft: "orange",
  processing: "orange", queued: "orange", applied: "orange", on_leave: "orange",
  // red
  rejected: "red", failed: "red", expired: "red", cancelled: "red", deactivated: "red",
  terminated: "red", disputed: "red", absent: "red", inactive: "red", false: "red",
  deleted: "red", unpaid: "red",
};

export default function Badge({ value, color }) {
  const v = String(value ?? "—");
  const cls = color || COLOR_MAP[v.toLowerCase()] || "";
  return <span className={`badge ${cls}`}>{v}</span>;
}
