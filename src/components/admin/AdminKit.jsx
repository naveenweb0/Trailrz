"use client";

import { Search } from "lucide-react";
import { Loading, ErrorState } from "@/components/common/States";

export const PageHead = ({ title, children, sub }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div><h1 className="font-display text-4xl leading-none" data-testid="admin-page-title">{title}</h1>{sub && <p className="text-sm text-mineral mt-2">{sub}</p>}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);

export const Pill = ({ v }) => {
  const c = {
    confirmed: "bg-[#e3efe2] text-[#1d5a32]", paid: "bg-[#e3efe2] text-[#1d5a32]", VALID: "bg-[#e3efe2] text-[#1d5a32]", published: "bg-[#e3efe2] text-[#1d5a32]",
    sent: "bg-[#e6eef7] text-[#24507d]", delivered: "bg-[#e3efe2] text-[#1d5a32]", not_required: "bg-tint text-mineral",
    held: "bg-[#fbf0d2] text-[#6b4d05]", created: "bg-[#fbf0d2] text-[#6b4d05]", queued: "bg-[#fbf0d2] text-[#6b4d05]", draft: "bg-[#fbf0d2] text-[#6b4d05]", sending: "bg-[#fbf0d2] text-[#6b4d05]",
    REDEEMED: "bg-tint text-ink", archived: "bg-tint text-mineral", expired: "bg-tint text-mineral", cancelled: "bg-tint text-mineral", none: "bg-tint text-mineral", not_configured: "bg-tint text-mineral",
    failed: "bg-[#f6e0dc] text-[#8a2a1d]", VOID: "bg-[#f6e0dc] text-[#8a2a1d]", refund_due: "bg-[#f6e0dc] text-[#8a2a1d]", signature_failed: "bg-[#f6e0dc] text-[#8a2a1d]",
  }[v] || "bg-tint text-mineral";
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap ${c}`}>{String(v || "—").replace(/_/g, " ")}</span>;
};

export const SearchBox = ({ value, onChange, placeholder = "Search", testid = "admin-search" }) => (
  <label className="relative block">
    <span className="sr-only">{placeholder}</span>
    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-mineral" aria-hidden />
    <input data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field h-10 pl-9 bg-surface w-full sm:w-72 text-sm" />
  </label>
);

export const Select = ({ value, onChange, options, testid, label }) => (
  <select aria-label={label} data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)} className="field h-10 bg-surface text-sm w-auto">
    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
  </select>
);

export function DataTable({ cols, rows, loading, error, onRetry, onRow, empty = "No records yet.", testid = "admin-table", rowKey = "id" }) {
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return (
    <div className="bg-surface border hairline overflow-x-auto" data-testid={testid}>
      <table className="w-full text-sm">
        <thead><tr className="border-b hairline text-left">{cols.map((c) => <th key={c.label} scope="col" className={`eyebrow px-4 py-3 whitespace-nowrap font-semibold ${c.right ? "text-right" : ""}`}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={cols.length} className="px-4 py-12 text-center text-mineral" data-testid={`${testid}-empty`}>{empty}</td></tr> : rows.map((r) => (
            <tr key={r[rowKey]} onClick={onRow ? () => onRow(r) : undefined} data-testid={`${testid}-row-${r[rowKey]}`}
              className={`border-b hairline last:border-0 ${onRow ? "cursor-pointer hover:bg-tint" : ""}`}>
              {cols.map((c) => <td key={c.label} className={`px-4 py-3 align-top ${c.right ? "text-right tabular" : ""} ${c.nowrap ? "whitespace-nowrap" : ""}`}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, total, limit, onPage }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm" data-testid="admin-pager">
      <span className="text-mineral tabular">{total} records · page {page} of {pages}</span>
      <div className="flex gap-2">
        <button data-testid="pager-prev" disabled={page <= 1} onClick={() => onPage(page - 1)} className="btn-line h-9 px-3 disabled:opacity-30">Previous</button>
        <button data-testid="pager-next" disabled={page >= pages} onClick={() => onPage(page + 1)} className="btn-line h-9 px-3 disabled:opacity-30">Next</button>
      </div>
    </div>
  );
}

export const Stat = ({ label, value, sub, testid }) => (
  <div className="bg-surface border hairline p-4" data-testid={testid}>
    <p className="eyebrow">{label}</p>
    <p className="font-display text-4xl mt-2 tabular leading-none">{value}</p>
    {sub && <p className="text-xs text-mineral mt-2">{sub}</p>}
  </div>
);
