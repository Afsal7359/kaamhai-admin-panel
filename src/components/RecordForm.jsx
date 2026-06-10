import { isRefObject } from "./DocView";

// Schema-driven form used by every Add / Edit modal in the panel.
// Field definitions come from GET /admin/db-schema/:model.

const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const LONG_TEXT = /description|notes|message|reason|address|body|subject|caption|remarks|template/i;

export const prettyLabel = (path) =>
  path
    .split(".")
    .pop()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());

// How a field is edited in the form.
const isObjectIdType = (t) => /^objectid$/i.test(t || "");

export const kindOf = (f) => {
  if (f.enum) return "enum";
  if (f.type === "Boolean") return "boolean";
  if (f.type === "Number") return "number";
  if (f.type === "Date") return "date";
  if (isObjectIdType(f.type)) return "objectid";
  if (f.type === "Array" && (["String", "Number"].includes(f.arrayOf) || isObjectIdType(f.arrayOf)))
    return "csv";
  if (f.type === "Array" || f.type === "Mixed" || f.type === "Embedded") return "json";
  if (f.type === "String" && LONG_TEXT.test(f.path)) return "textarea";
  return "text";
};

const toLocalInput = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

// Document (or empty object) → editable form values keyed by field path.
export const buildInitial = (fields, doc = {}) => {
  const values = {};
  for (const f of fields) {
    const kind = kindOf(f);
    const v = get(doc, f.path);
    if (kind === "boolean") values[f.path] = Boolean(v ?? f.default ?? false);
    else if (kind === "date") values[f.path] = v ? toLocalInput(v) : "";
    else if (kind === "objectid") values[f.path] = isRefObject(v) ? String(v._id) : (v ?? "");
    else if (kind === "csv")
      values[f.path] = Array.isArray(v)
        ? v.map((x) => (isRefObject(x) ? String(x._id) : String(x))).join(", ")
        : "";
    else if (kind === "json") values[f.path] = v != null ? JSON.stringify(v, null, 2) : "";
    else values[f.path] = v ?? f.default ?? "";
  }
  return values;
};

// Form values → API payload.
//  mode "edit":   dotted keys ($set-safe — never replaces whole sub-objects),
//                 only fields changed vs `initial`.
//  mode "create": nested object for the mongoose constructor; empty fields omitted.
export const toPayload = (fields, values, { mode, initial } = {}) => {
  const out = {};
  const setNested = (path, val) => {
    if (mode === "edit") {
      out[path] = val;
      return;
    }
    const keys = path.split(".");
    let o = out;
    keys.slice(0, -1).forEach((k) => {
      o[k] = o[k] || {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = val;
  };

  for (const f of fields) {
    const kind = kindOf(f);
    const raw = values[f.path];
    if (mode === "edit" && initial && raw === initial[f.path]) continue;

    if (kind === "boolean") {
      setNested(f.path, Boolean(raw));
      continue;
    }
    const empty = raw === "" || raw == null;
    if (empty) {
      if (mode === "edit") setNested(f.path, kind === "text" || kind === "textarea" || kind === "enum" ? "" : null);
      continue; // create: omit empty fields, let schema defaults apply
    }
    if (kind === "number") setNested(f.path, Number(raw));
    else if (kind === "date") setNested(f.path, new Date(raw).toISOString());
    else if (kind === "objectid") setNested(f.path, String(raw).trim());
    else if (kind === "csv") {
      const items = String(raw)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      setNested(f.path, f.arrayOf === "Number" ? items.map(Number) : items);
    } else if (kind === "json") {
      try {
        setNested(f.path, JSON.parse(raw));
      } catch {
        throw new Error(`"${prettyLabel(f.path)}" contains invalid JSON`);
      }
    } else setNested(f.path, raw);
  }
  return out;
};

function Field({ f, value, onChange }) {
  const kind = kindOf(f);
  const label = (
    <label>
      {prettyLabel(f.path)}
      {f.required && <span className="req-star">*</span>}
    </label>
  );

  const full = kind === "json" || kind === "textarea";

  return (
    <div className={`field${full ? " full" : ""}`}>
      {label}
      {kind === "enum" && (
        <select className="select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">— select —</option>
          {f.enum.map((opt) => (
            <option key={String(opt)} value={opt}>
              {String(opt)}
            </option>
          ))}
        </select>
      )}
      {kind === "boolean" && (
        <button
          type="button"
          className={`switch${value ? " on" : ""}`}
          onClick={() => onChange(!value)}
          aria-pressed={value}
        >
          <span className="knob" />
          <span className="switch-label">{value ? "Yes" : "No"}</span>
        </button>
      )}
      {kind === "number" && (
        <input className="input" type="number" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {kind === "date" && (
        <input className="input" type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {kind === "objectid" && (
        <>
          <input
            className="input mono"
            value={value}
            placeholder="ObjectId…"
            onChange={(e) => onChange(e.target.value)}
          />
          {f.ref && <span className="form-hint">Linked record ID from “{f.ref}”</span>}
        </>
      )}
      {kind === "csv" && (
        <>
          <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
          <span className="form-hint">
            Comma-separated {f.arrayOf === "ObjectID" ? `IDs from “${f.ref || "linked records"}”` : "values"}
          </span>
        </>
      )}
      {kind === "json" && (
        <textarea
          className="textarea mono"
          rows={4}
          value={value}
          placeholder={f.type === "Array" ? "[ … ]" : "{ … }"}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {kind === "textarea" && (
        <textarea className="textarea" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {(kind === "text") && (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export default function RecordForm({ fields, values, onChange }) {
  // Group nested paths ("basicDetails.name") into titled sections.
  const groups = [];
  const byPrefix = new Map();
  for (const f of fields) {
    const prefix = f.path.includes(".") ? f.path.split(".")[0] : "";
    if (!byPrefix.has(prefix)) {
      byPrefix.set(prefix, []);
      groups.push(prefix);
    }
    byPrefix.get(prefix).push(f);
  }
  groups.sort((a, b) => (a === "" ? -1 : b === "" ? 1 : 0));

  return (
    <div>
      {groups.map((prefix) => (
        <div key={prefix || "__main"}>
          {prefix && <div className="form-section-title">{prettyLabel(prefix)}</div>}
          <div className="form-grid">
            {byPrefix.get(prefix).map((f) => (
              <Field
                key={f.path}
                f={f}
                value={values[f.path]}
                onChange={(v) => onChange({ ...values, [f.path]: v })}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
