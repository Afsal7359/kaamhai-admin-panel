export default function Pagination({ page, totalPages, total, onChange }) {
  const pages = Math.max(1, totalPages || 1);
  return (
    <div className="pagination">
      <span>
        {total != null ? `${total.toLocaleString()} records` : ""}
      </span>
      <div className="pages">
        <button className="btn sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ◀ Prev
        </button>
        <span>
          Page {page} / {pages}
        </span>
        <button className="btn sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next ▶
        </button>
      </div>
    </div>
  );
}
