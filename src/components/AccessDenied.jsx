export default function AccessDenied() {
  return (
    <div className="panel panel-pad" style={{ maxWidth: 520, margin: "60px auto", textAlign: "center" }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <h3 style={{ margin: "10px 0 6px" }}>No access to this page</h3>
      <p style={{ color: "var(--text-soft)", marginTop: 0 }}>
        Your admin account doesn't have permission to view this section. Ask a super admin to grant
        access from the Access Manager.
      </p>
    </div>
  );
}
