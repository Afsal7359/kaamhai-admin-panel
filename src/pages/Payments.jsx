import { useState } from "react";
import { createPaymentLink, findPaymentDetails } from "../api/endpoints";
import { useToast } from "../components/Toast";

export default function Payments() {
  const toast = useToast();
  const [lookupId, setLookupId] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const [jobPostId, setJobPostId] = useState("");
  const [numberOfHiring, setNumberOfHiring] = useState(1);
  const [link, setLink] = useState(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const lookup = async () => {
    if (!lookupId.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await findPaymentDetails({ id: lookupId.trim(), jobPostId: lookupId.trim(), orderId: lookupId.trim() });
      setResult(res.data?.data ?? res.data);
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.title || "Payment not found", "error");
    } finally {
      setBusy(false);
    }
  };

  const makeLink = async () => {
    if (!jobPostId.trim()) return;
    setLinkBusy(true);
    setLink(null);
    try {
      const res = await createPaymentLink({ jobPostId: jobPostId.trim(), numberOfHiring: Number(numberOfHiring) || 1 });
      setLink(res.data?.paymentLink || null);
      toast("Payment link generated", "success");
    } catch (err) {
      toast(err.response?.data?.message || err.response?.data?.title || "Failed to create link", "error");
    } finally {
      setLinkBusy(false);
    }
  };

  return (
    <div className="chart-grid">
      <div className="panel panel-pad">
        <h3 className="panel-title">Payment lookup</h3>
        <p style={{ color: "var(--text-soft)", marginTop: 0 }}>
          Look up a payment by job post ID / order ID.
        </p>
        <div className="filters-bar">
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Job post ID or order ID…"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
          />
          <button className="btn primary" onClick={lookup} disabled={busy}>
            {busy ? "Searching…" : "Search"}
          </button>
        </div>
        {result && (
          <pre className="json-editor" style={{ minHeight: 200 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>

      <div className="panel panel-pad">
        <h3 className="panel-title">Create job-post payment link</h3>
        <p style={{ color: "var(--text-soft)", marginTop: 0 }}>
          Generates a Razorpay payment link and SMS/email notification to the employer.
        </p>
        <div className="field">
          <label>Job post ID</label>
          <input className="input" value={jobPostId} onChange={(e) => setJobPostId(e.target.value)} />
        </div>
        <div className="field">
          <label>Number of hires</label>
          <input
            className="input"
            type="number"
            min="1"
            value={numberOfHiring}
            onChange={(e) => setNumberOfHiring(e.target.value)}
          />
        </div>
        <button className="btn primary" onClick={makeLink} disabled={linkBusy}>
          {linkBusy ? "Creating…" : "Generate link"}
        </button>
        {link && (
          <p>
            Link: <a href={link} target="_blank" rel="noreferrer">{link}</a>
          </p>
        )}
      </div>
    </div>
  );
}
