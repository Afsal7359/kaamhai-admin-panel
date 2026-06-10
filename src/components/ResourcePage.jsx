import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createDocument,
  deleteDocument,
  getDocuments,
  getModelSchema,
  updateDocument,
} from "../api/endpoints";
import { resourceFor } from "../resources";
import Badge from "./Badge";
import DataTable from "./DataTable";
import DocView, { isRefObject, RefChip } from "./DocView";
import JsonEditor from "./JsonEditor";
import Modal from "./Modal";
import Pagination from "./Pagination";
import RecordForm, { buildInitial, toPayload } from "./RecordForm";
import { useToast } from "./Toast";

const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

const isIsoDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);

const labelFor = (path) => {
  const last = path.split(".").pop();
  return last
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
};

const renderValue = (v) => {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return <Badge value={v ? "true" : "false"} />;
  if (isRefObject(v)) return <RefChip value={v} />;
  if (Array.isArray(v)) {
    if (v.length && v.every(isRefObject)) {
      return (
        <span>
          {v.slice(0, 2).map((x) => (
            <RefChip key={x._id} value={x} />
          ))}
          {v.length > 2 && <span className="dv-muted"> +{v.length - 2}</span>}
        </span>
      );
    }
    return `${v.length} item${v.length === 1 ? "" : "s"}`;
  }
  if (typeof v === "object") return <span className="mono">{JSON.stringify(v).slice(0, 60)}</span>;
  if (isIsoDate(v)) return new Date(v).toLocaleString("en-IN");
  const s = String(v);
  if (/^(pending|approved|rejected|active|inactive|paid|unpaid|failed|expired|completed|open|accepted|cancelled|terminated|draft|sent|disputed|queued|processing|present|absent|on_leave|created|resigned)$/i.test(s)) {
    return <Badge value={s} />;
  }
  return s;
};

export default function ResourcePage() {
  const { model } = useParams();
  const toast = useToast();
  const config = resourceFor(model);

  const [rows, setRows] = useState([]);
  const [schemaFields, setSchemaFields] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [viewing, setViewing] = useState(null);
  // { mode: 'create' | 'edit', doc?, values, initial?, raw, rawDraft }
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async (p = page, s = search) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 20 };
      if (s) params.search = s;
      const res = await getDocuments(model, params);
      setRows(res.data?.data || []);
      setTotalPages(res.data?.totalPages || 1);
      setTotal(res.data?.total || 0);
      setPage(p);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to load records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch("");
    setSchemaFields(null);
    load(1, "");
    getModelSchema(model)
      .then((res) => setSchemaFields(res.data?.data?.fields || []))
      .catch(() => setSchemaFields([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model]);

  const fieldPaths = useMemo(() => {
    if (config?.fields?.length) return config.fields;
    if (!rows.length) return [];
    return Object.keys(rows[0])
      .filter((k) => !["_id", "__v", "updatedAt"].includes(k))
      .slice(0, 6);
  }, [config, rows]);

  const openCreate = () => {
    const fields = schemaFields || [];
    setForm({
      mode: "create",
      values: buildInitial(fields, {}),
      raw: fields.length === 0,
      rawDraft: {},
    });
  };

  const openEdit = (doc) => {
    const fields = schemaFields || [];
    const values = buildInitial(fields, doc);
    setForm({
      mode: "edit",
      doc,
      values,
      initial: values,
      raw: fields.length === 0,
      rawDraft: null,
    });
  };

  const columns = [
    ...fieldPaths.map((p) => ({
      key: p,
      label: labelFor(p),
      render: (r) => renderValue(get(r, p)),
    })),
    {
      key: "__actions",
      label: "Actions",
      render: (r) => (
        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn sm" onClick={() => setViewing(r)}>View</button>
          <button className="btn sm" onClick={() => openEdit(r)}>Edit</button>
          <button className="btn sm ghost-danger" onClick={() => { setDeleting(r); setHardDelete(false); }}>
            Delete
          </button>
        </div>
      ),
    },
  ];

  const saveForm = async () => {
    let body;
    try {
      if (form.raw) {
        body = form.rawDraft;
        if (!body) throw new Error("Fix the JSON before saving");
      } else {
        body = toPayload(schemaFields || [], form.values, {
          mode: form.mode,
          initial: form.initial,
        });
      }
      if (form.mode === "edit" && Object.keys(body).length === 0) {
        toast("No changes to save", "info");
        return;
      }
    } catch (e) {
      toast(e.message, "error");
      return;
    }
    setBusy(true);
    try {
      if (form.mode === "create") {
        await createDocument(model, body);
        toast("Record created", "success");
      } else {
        await updateDocument(model, form.doc._id, body);
        toast("Record updated", "success");
      }
      setForm(null);
      load(form.mode === "create" ? 1 : page);
    } catch (err) {
      toast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      const res = await deleteDocument(model, deleting._id, hardDelete);
      toast(res.data?.message || "Deleted", "success");
      setDeleting(null);
      load(page);
    } catch (err) {
      toast(err.response?.data?.message || "Delete failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const title = config?.label || model;

  return (
    <div>
      <div className="filters-bar">
        <input
          className="input"
          placeholder={`Search ${title}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
        />
        <button className="btn primary" onClick={() => load(1)}>Search</button>
        <button className="btn" onClick={openCreate}>+ Add new</button>
      </div>

      <div className="panel">
        <DataTable columns={columns} rows={rows} loading={loading} onRowClick={setViewing} />
        <Pagination page={page} totalPages={totalPages} total={total} onChange={load} />
      </div>

      {viewing && (
        <Modal
          title={`${title} — details`}
          onClose={() => setViewing(null)}
          size="lg"
          footer={
            <>
              <button className="btn" onClick={() => setViewing(null)}>Close</button>
              <button
                className="btn primary"
                onClick={() => {
                  openEdit(viewing);
                  setViewing(null);
                }}
              >
                Edit
              </button>
            </>
          }
        >
          <DocView doc={viewing} />
        </Modal>
      )}

      {form && (
        <Modal
          title={form.mode === "create" ? `Add new — ${title}` : `Edit — ${title}`}
          onClose={() => setForm(null)}
          size="lg"
          footer={
            <>
              {(schemaFields || []).length > 0 && (
                <button
                  className="btn"
                  onClick={() =>
                    setForm((f) => {
                      if (f.raw) return { ...f, raw: false };
                      let draft = f.rawDraft;
                      try {
                        draft = toPayload(schemaFields || [], f.values, { mode: "create" });
                      } catch {
                        draft = {};
                      }
                      return { ...f, raw: true, rawDraft: draft };
                    })
                  }
                >
                  {form.raw ? "Form view" : "Raw JSON view"}
                </button>
              )}
              <button className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary" onClick={saveForm} disabled={busy}>
                {busy ? "Saving…" : form.mode === "create" ? "Create record" : "Save changes"}
              </button>
            </>
          }
        >
          {form.mode === "edit" && form.doc?._id && (
            <p className="form-hint" style={{ marginTop: 0 }}>
              Editing record <span className="mono">#{form.doc._id}</span> — only changed fields are saved.
            </p>
          )}
          {form.raw ? (
            <JsonEditor
              value={form.rawDraft ?? {}}
              onChange={(d) => setForm((f) => ({ ...f, rawDraft: d }))}
            />
          ) : (
            <RecordForm
              fields={schemaFields || []}
              values={form.values}
              onChange={(values) => setForm((f) => ({ ...f, values }))}
            />
          )}
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Delete this ${title} record?`}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="btn danger" onClick={confirmDelete} disabled={busy}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </>
          }
        >
          <p>
            Record <span className="mono">{deleting._id}</span> will be deleted.
          </p>
          <p style={{ color: "var(--text-soft)" }}>
            Models with an <code>isDeleted</code> flag are soft-deleted (hidden in the app, recoverable) unless you
            choose permanent deletion.
          </p>
          <label>
            <input type="checkbox" checked={hardDelete} onChange={(e) => setHardDelete(e.target.checked)} /> Delete
            permanently (cannot be undone)
          </label>
        </Modal>
      )}
    </div>
  );
}
