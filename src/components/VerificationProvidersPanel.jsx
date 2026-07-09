import { useEffect, useState } from "react";
import { getVerificationProviders, updateVerificationProviders } from "../api/endpoints";
import { useToast } from "./Toast";

// Display labels for each verification type key.
const TYPE_LABELS = {
  aadhaarOcr: "Aadhaar OCR",
  pan: "PAN Card",
  voter: "Voter ID",
  passport: "Passport",
  drivingLicense: "Driving License",
  faceMatch: "Face Match (Selfie)",
  digiLocker: "DigiLocker (Aadhaar)",
};

const PROVIDER_LABELS = { idfy: "IDfy", cashfree: "Cashfree" };

/**
 * Admin panel section: choose which third-party provider verifies each check.
 * A check available in only one provider is locked; one available in both shows
 * an IDfy | Cashfree segmented toggle.
 */
export default function VerificationProvidersPanel() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState(null);

  const load = async () => {
    try {
      const res = await getVerificationProviders();
      setRows(res.data?.data?.providers || []);
    } catch (e) {
      toast("Could not load verification providers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const choose = async (type, provider) => {
    setSavingType(type);
    // optimistic
    setRows((prev) => prev.map((r) => (r.type === type ? { ...r, active: provider } : r)));
    try {
      const res = await updateVerificationProviders({ [type]: provider });
      setRows(res.data?.data?.providers || []);
      toast(`${TYPE_LABELS[type] || type} → ${PROVIDER_LABELS[provider]}`, "success");
    } catch (e) {
      toast(e?.response?.data?.message || "Could not update provider", "error");
      load(); // revert from server
    } finally {
      setSavingType(null);
    }
  };

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div>
          <h3 style={s.title}>Verification Providers</h3>
          <p style={s.sub}>
            Choose which third-party API verifies each document. Checks available in only one
            provider are locked to it.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={s.loading}>Loading…</div>
      ) : (
        <div style={s.grid}>
          {rows.map((r) => (
            <div key={r.type} style={s.row}>
              <span style={s.label}>{TYPE_LABELS[r.type] || r.type}</span>
              <div style={s.segment}>
                {["idfy", "cashfree"].map((p) => {
                  const supported = r.available.includes(p);
                  const active = r.active === p;
                  const locked = !r.choosable; // single provider → not switchable
                  return (
                    <button
                      key={p}
                      disabled={!supported || locked || savingType === r.type}
                      onClick={() => supported && !locked && !active && choose(r.type, p)}
                      style={{
                        ...s.segBtn,
                        ...(active ? s.segActive : {}),
                        ...(!supported ? s.segUnsupported : {}),
                        cursor: !supported || locked || active ? "default" : "pointer",
                      }}
                      title={!supported ? `${PROVIDER_LABELS[p]} doesn't support this check` : ""}
                    >
                      {PROVIDER_LABELS[p]}
                    </button>
                  );
                })}
              </div>
              {!r.choosable && <span style={s.lockTag}>single provider</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  card: { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12, padding: 20, marginBottom: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 },
  sub: { fontSize: 13, color: "#6B7280", margin: "4px 0 0", maxWidth: 560, lineHeight: 1.4 },
  loading: { color: "#6B7280", fontSize: 14, padding: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid #F3F4F6", borderRadius: 10, background: "#FAFAFA" },
  label: { flex: 1, fontSize: 13, fontWeight: 700, color: "#374151" },
  segment: { display: "inline-flex", border: "1px solid #D1D5DB", borderRadius: 8, overflow: "hidden" },
  segBtn: { border: "none", background: "#fff", color: "#6B7280", fontSize: 12, fontWeight: 700, padding: "6px 12px" },
  segActive: { background: "#150B3D", color: "#fff" },
  segUnsupported: { color: "#D1D5DB", background: "#F9FAFB" },
  lockTag: { fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" },
};
