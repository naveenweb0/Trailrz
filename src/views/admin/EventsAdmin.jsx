"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useStaff } from "@/views/admin/AdminLayout";
import { useLoad, fmtDT, inr, errMsg } from "@/lib/api";
import { PageHead, DataTable, Pill, SearchBox, Select } from "@/components/admin/AdminKit";

export function EventsAdmin() {
  const { http } = useStaff();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const { data, loading, error, reload } = useLoad(async () => (await http.get(`/admin/events?${new URLSearchParams({ ...(q && { q }), ...(status && { status }) })}`)).data, [q, status, http]);
  return (
    <div data-testid="admin-events">
      <PageHead title="Events" sub="Drafts are private. Publishing requires a cover image and at least one active ticket tier.">
        <SearchBox value={q} onChange={setQ} placeholder="Search title or venue" testid="events-search" />
        <Select value={status} onChange={setStatus} testid="events-status-filter" label="Status" options={[["", "All statuses"], ["draft", "Draft"], ["published", "Published"], ["archived", "Archived"]]} />
        <Link to="/admin/events/new" data-testid="events-create-button" className="btn-ink h-10 text-sm"><Plus className="h-4 w-4" /> New event</Link>
      </PageHead>
      <DataTable loading={loading} error={error} onRetry={reload} testid="events-table" onRow={(r) => nav(`/admin/events/${r.id}`)}
        empty="No events yet. Create your first experience."
        rows={data?.items || []}
        cols={[
          { label: "Event", render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-mineral">{r.category}{r.is_original ? " · Original" : ""}</p></div> },
          { label: "Date", nowrap: true, render: (r) => fmtDT(r.start_at) },
          { label: "Venue", render: (r) => `${r.venue}, ${r.city}` },
          { label: "From", right: true, render: (r) => r.tiers.length ? inr(Math.min(...r.tiers.map((t) => t.price))) : "—" },
          { label: "Sold / Cap", right: true, render: (r) => `${r.sold} / ${r.capacity}` },
          { label: "Status", render: (r) => <Pill v={r.status} /> },
        ]} />
    </div>
  );
}

export function Inventory() {
  const { http } = useStaff();
  const { data, loading, error, reload } = useLoad(async () => (await http.get("/admin/inventory")).data, [http]);
  return (
    <div data-testid="admin-inventory">
      <PageHead title="Ticket inventory" sub="Live from the database. Holds release automatically after 10 minutes.">
        <button onClick={reload} data-testid="inventory-refresh" className="btn-line h-10 text-sm">Refresh</button>
      </PageHead>
      <DataTable loading={loading} error={error} onRetry={reload} testid="inventory-table" empty="No active events."
        rows={(data?.items || []).flatMap((e) => [{ ...e, _row: "event" }, ...e.tiers.map((t) => ({ ...t, id: t.id, _row: "tier" }))])}
        cols={[
          { label: "Event / tier", render: (r) => r._row === "event" ? <div><p className="font-medium">{r.title}</p><p className="text-xs text-mineral">{fmtDT(r.start_at)} · <Pill v={r.status} /></p></div> : <p className="pl-4 text-mineral">↳ {r.name} · {inr(r.price)}{r.active ? "" : " · inactive"}</p> },
          { label: "Capacity", right: true, render: (r) => r.capacity },
          { label: "Sold", right: true, render: (r) => r.sold },
          { label: "Held", right: true, render: (r) => r.reserved },
          { label: "Available", right: true, render: (r) => r._row === "event" ? r.capacity - r.sold - r.reserved : r.remaining },
          { label: "Holds (live / expired)", right: true, render: (r) => r._row === "event" ? `${r.active_holds} / ${r.expired_holds}` : "" },
        ]} />
    </div>
  );
}

export function EventActions({ e, onChange }) {
  const { http, me } = useStaff();
  const nav = useNavigate();
  const set = async (status) => {
    try {
      await http.post(`/admin/events/${e.id}/status`, { status });
      toast.success(`Event ${status}`);
      onChange();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  const del = async () => {
    if (!window.confirm("Delete this event permanently? This only works if it has no bookings.")) return;
    try {
      await http.delete(`/admin/events/${e.id}`);
      toast.success("Event deleted");
      nav("/admin/events");
    } catch (err) {
      toast.error(errMsg(err));
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {e.status === "published" && <a href={`/events/${e.slug}`} target="_blank" rel="noreferrer" className="btn-line h-10 text-sm" data-testid="event-view-public">View live</a>}
      {e.status !== "published" && <button type="button" data-testid="event-publish" onClick={() => set("published")} className="btn-beam h-10 text-sm">Publish</button>}
      {e.status === "published" && <button type="button" data-testid="event-unpublish" onClick={() => set("draft")} className="btn-line h-10 text-sm">Unpublish</button>}
      {e.status !== "archived" && <button type="button" data-testid="event-archive" onClick={() => set("archived")} className="btn-line h-10 text-sm">Archive</button>}
      {["superadmin", "admin"].includes(me.role) && <button type="button" data-testid="event-delete" onClick={del} className="h-10 px-3 text-sm text-invalid underline underline-offset-4">Delete</button>}
    </div>
  );
}

