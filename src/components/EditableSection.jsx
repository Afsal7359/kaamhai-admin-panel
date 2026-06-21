// Reusable "labelled section with view + inline edit" used by the rich
// employee / employer detail views. Field config drives both rendering modes.

export const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

// Arrays may hold plain strings or { name } objects (legacy vs new shape).
const arrToText = (v) =>
  Array.isArray(v)
    ? v.map((x) => (x && typeof x === "object" ? x.name ?? x.title ?? "" : x)).filter(Boolean).join(", ")
    : "";

export const displayValue = (f, doc) => {
  const v = get(doc, f.path);
  if (f.array) return arrToText(v) || "—";
  if (v == null || v === "") return "—";
  if (f.type === "date" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN");
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
};

// Build the edit-state object (dotted path -> editable string) from a doc.
export const initEdit = (sections, doc) => {
  const out = {};
  for (const s of sections) {
    for (const f of s.fields) {
      const v = get(doc, f.path);
      out[f.path] = f.array ? arrToText(v) : v == null ? "" : String(v);
    }
  }
  return out;
};

// Convert edit-state -> $set payload (dotted keys), only changed values.
export const buildPayload = (sections, edit, doc) => {
  const payload = {};
  for (const s of sections) {
    for (const f of s.fields) {
      const raw = edit[f.path];
      const orig = get(doc, f.path);
      if (f.array) {
        const arr = String(raw || "").split(",").map((x) => x.trim()).filter(Boolean);
        if (arrToText(orig) !== arr.join(", ")) payload[f.path] = arr;
      } else if (f.num) {
        const n = raw === "" ? null : Number(raw);
        if (n !== (orig ?? null)) payload[f.path] = n;
      } else {
        const val = raw === "" ? null : raw;
        if ((orig ?? null) !== (val ?? null) && !(orig == null && val == null)) payload[f.path] = val ?? "";
      }
    }
  }
  return payload;
};

export function ViewSection({ title, fields, doc, action }) {
  return (
    <div className="detail-section">
      <div className="detail-section-head">
        <span className="form-section-title" style={{ margin: 0 }}>{title}</span>
        {action}
      </div>
      <div className="info-grid">
        {fields.map((f) => (
          <div className="info-cell" key={f.path}>
            <div className="info-k">{f.label}</div>
            <div className="info-v">{displayValue(f, doc)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EditSection({ title, fields, edit, onChange }) {
  return (
    <div className="detail-section">
      <div className="form-section-title">{title}</div>
      <div className="form-grid">
        {fields.map((f) => (
          <div className={`field${f.long ? " full" : ""}`} key={f.path}>
            <label>{f.label}{f.array ? " (comma separated)" : ""}</label>
            {f.type === "select" ? (
              <select className="select" value={edit[f.path] ?? ""} onChange={(e) => onChange(f.path, e.target.value)}>
                <option value="">— select —</option>
                {f.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.long ? (
              <textarea className="textarea" rows={2} value={edit[f.path] ?? ""} onChange={(e) => onChange(f.path, e.target.value)} />
            ) : (
              <input
                className="input"
                type={f.num ? "number" : "text"}
                value={edit[f.path] ?? ""}
                onChange={(e) => onChange(f.path, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
