import { useState } from "react";
import { API_URL } from "../api/client";
import Badge from "./Badge";

// ── Shared helpers for populated reference fields ───────────────────────────

export const isRefObject = (v) =>
  v != null && typeof v === "object" && !Array.isArray(v) && "_id" in v;

// Only plain text is usable as a label — populated fields can themselves be
// objects (e.g. offerLetter.status = {employee, employer}).
const text = (x) => (typeof x === "string" || typeof x === "number" ? String(x) : null);

export const refLabel = (v) => {
  if (!isRefObject(v)) return String(v ?? "—");
  return (
    text(v.name) ||
    text(v.title) ||
    text(v.companyName) ||
    text(v.branchName) ||
    text(v.basicDetails?.name) ||
    text(v.legal_name_of_business) ||
    text(v.entity) ||
    text(v.employmentCode) ||
    text(v.branchCode) ||
    text(v.planName) ||
    text(v.documentType) ||
    text(v.code) ||
    text(v.key) ||
    text(v.GSTIN) ||
    text(v.fssai) ||
    text(v.orderId) ||
    text(v.phoneNumber) ||
    text(v.email) ||
    text(v.status) ||
    String(v._id).slice(-8)
  );
};

export const refSecondary = (v) => {
  if (!isRefObject(v)) return null;
  const label = refLabel(v);
  const candidates = [
    text(v.phoneNumber),
    text(v.basicDetails?.city) || text(v.currentCity),
    text(v.email),
    text(v.companyRole),
    text(v.branchCode),
    text(v.status),
  ].filter((x) => x && x !== label);
  return candidates[0] || null;
};

const isIsoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

const IMG_KEY = /image|photo|selfie|logo|docfront|docback|filename|fileurl|damagephoto|shareimg|icon$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg)(\?|$)/i;

const looksLikeImage = (key, v) =>
  typeof v === "string" && v.length > 3 && (IMG_EXT.test(v) || (IMG_KEY.test(key) && !v.includes(" ")));

const imgUrl = (v) => (v.startsWith("http") ? v : `${API_URL}/${v}`);

const prettyKey = (path) =>
  path
    .split(".")
    .pop()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

const BADGE_RE =
  /^(pending|approved|rejected|active|inactive|paid|unpaid|failed|expired|completed|open|accepted|cancelled|terminated|draft|sent|disputed|queued|processing|present|absent|on_leave|created|resigned|true|false|PRIMARY|SECONDARY)$/i;

function Value({ k, v }) {
  if (v == null || v === "") return <span className="dv-muted">—</span>;
  if (typeof v === "boolean") return <Badge value={v ? "true" : "false"} />;
  if (isIsoDate(v)) return <>{new Date(v).toLocaleString("en-IN")}</>;
  if (looksLikeImage(k, v))
    return (
      <img
        className="dv-img"
        src={imgUrl(v)}
        alt={k}
        onClick={() => window.open(imgUrl(v), "_blank")}
        onError={(e) => {
          e.currentTarget.outerHTML = `<span>${v}</span>`;
        }}
      />
    );
  if (typeof v === "string" && BADGE_RE.test(v)) return <Badge value={v} />;
  if (typeof v === "string" && v.startsWith("http"))
    return (
      <a href={v} target="_blank" rel="noreferrer">
        {v.length > 60 ? `${v.slice(0, 60)}…` : v}
      </a>
    );
  return <>{String(v)}</>;
}

export function RefChip({ value, fieldKey }) {
  return (
    <span className="ref-chip" title={String(value._id)}>
      <span className="ref-chip-dot" />
      {refLabel(value)}
      {refSecondary(value) && <span className="ref-chip-sub">{refSecondary(value)}</span>}
    </span>
  );
}

function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="dv-id"
      title="Copy ID"
      onClick={() => {
        navigator.clipboard?.writeText(String(id)).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? "Copied ✓" : `#${String(id)}`}
    </button>
  );
}

// ── The designed record view ─────────────────────────────────────────────────

export default function DocView({ doc }) {
  const entries = Object.entries(doc).filter(([k]) => !["_id", "__v"].includes(k));

  const refs = [];
  const refLists = [];
  const primitives = [];
  const images = [];
  const complex = [];

  for (const [k, v] of entries) {
    if (k === "createdAt" || k === "updatedAt") continue;
    if (isRefObject(v)) refs.push([k, v]);
    else if (Array.isArray(v) && v.length && v.every(isRefObject)) refLists.push([k, v]);
    else if (looksLikeImage(k, v)) images.push([k, v]);
    else if (v === null || typeof v !== "object") primitives.push([k, v]);
    else complex.push([k, v]);
  }

  return (
    <div className="dv">
      <div className="dv-meta">
        <CopyId id={doc._id} />
        {doc.createdAt && <span>Created {new Date(doc.createdAt).toLocaleString("en-IN")}</span>}
        {doc.updatedAt && <span>Updated {new Date(doc.updatedAt).toLocaleString("en-IN")}</span>}
      </div>

      {(refs.length > 0 || refLists.length > 0) && (
        <div className="dv-section">
          <div className="dv-section-title">Linked records</div>
          <div className="dv-ref-grid">
            {refs.map(([k, v]) => (
              <div className="dv-ref-card" key={k}>
                <div className="dv-ref-field">{prettyKey(k)}</div>
                <div className="dv-ref-name">{refLabel(v)}</div>
                {refSecondary(v) && <div className="dv-ref-sub">{refSecondary(v)}</div>}
                <div className="dv-ref-id">#{String(v._id)}</div>
              </div>
            ))}
            {refLists.map(([k, list]) => (
              <div className="dv-ref-card" key={k}>
                <div className="dv-ref-field">
                  {prettyKey(k)} ({list.length})
                </div>
                {list.slice(0, 4).map((v) => (
                  <div className="dv-ref-name" key={v._id} style={{ fontSize: 13 }}>
                    {refLabel(v)}
                    {refSecondary(v) && <span className="dv-ref-sub"> · {refSecondary(v)}</span>}
                  </div>
                ))}
                {list.length > 4 && <div className="dv-ref-sub">+{list.length - 4} more</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {primitives.length > 0 && (
        <div className="dv-section">
          <div className="dv-section-title">Details</div>
          <div className="dv-grid">
            {primitives.map(([k, v]) => (
              <div className="dv-cell" key={k}>
                <div className="dv-k">{prettyKey(k)}</div>
                <div className="dv-v">
                  <Value k={k} v={v} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="dv-section">
          <div className="dv-section-title">Photos & files</div>
          <div className="doc-row">
            {images.map(([k, v]) => (
              <div className="doc-card" key={k}>
                <img src={imgUrl(v)} alt={k} onClick={() => window.open(imgUrl(v), "_blank")} />
                <div className="cap">{prettyKey(k)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {complex.length > 0 && (
        <div className="dv-section">
          <div className="dv-section-title">More data</div>
          {complex.map(([k, v]) => (
            <NestedBlock key={k} k={k} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function NestedBlock({ k, v }) {
  // Flat sub-objects (like period:{year,month} or salaryRange) render as a grid;
  // anything deeper falls back to a collapsible pretty block.
  const isFlat =
    !Array.isArray(v) &&
    Object.values(v).every((x) => x === null || typeof x !== "object" || isIsoDate(x));

  if (isFlat) {
    return (
      <div className="dv-nested">
        <div className="dv-nested-title">{prettyKey(k)}</div>
        <div className="dv-grid">
          {Object.entries(v).map(([nk, nv]) => (
            <div className="dv-cell" key={nk}>
              <div className="dv-k">{prettyKey(nk)}</div>
              <div className="dv-v">
                <Value k={nk} v={nv} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <details className="dv-details">
      <summary>
        {prettyKey(k)} {Array.isArray(v) ? `· ${v.length} item${v.length === 1 ? "" : "s"}` : ""}
      </summary>
      <pre className="dv-json">{JSON.stringify(v, null, 2)}</pre>
    </details>
  );
}
