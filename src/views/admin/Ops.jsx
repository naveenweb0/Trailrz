"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useStaff } from "@/views/admin/AdminLayout";
import { useLoad, fmtDT, fmtDate, rupees as inr, errMsg } from "@/lib/api";
import { PageHead, DataTable, Pill, Select, Pager } from "@/components/admin/AdminKit";
import { Loading, ErrorState } from "@/components/common/States";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const Integrations = ({ i }) => (
  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4" data-testid="integration-status">
    {[["razorpay", "Razorpay payments"], ["razorpay_webhook", "Razorpay webhook"], ["resend", "Email (Resend)"], ["resend_webhook", "Email delivery webhook"], ["cloudinary", "Image uploads"], ["whatsapp", "WhatsApp"]].map(([k, l]) => (
      <div key={k} className="bg-surface border hairline p-3 text-xs"><p className="eyebrow">{l}</p><p className={`mt-1 font-semibold ${i[k] ? "text-granted" : "text-mineral"}`}>{i[k] ? "Configured" : "Not configured"}</p></div>
    ))}
  </div>
);

function Broadcast({ onDone }) {
  const { http } = useStaff();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ event_id: "", kind: "event_update", subject: "", message: "" });
  const { data } = useLoad(async () => (await http.get("/admin/events?status=published")).data, [http]);
  const send = async (e) => {
    e.preventDefault();
    try { const { data: r } = await http.post(`/admin/events/${f.event_id}/broadcast`, f); toast.success(`${r.queued} email(s) queued`); setOpen(false); onDone(); } catch (er) { toast.error(errMsg(er)); }
  };
  return (
    <>
      <button onClick={() => setOpen(true)} data-testid="broadcast-open" className="btn-ink h-10 text-sm">Message attendees</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-parchment max-w-lg">
          <DialogTitle className="font-display text-3xl font-normal">Message attendees</DialogTitle>
          <form onSubmit={send} className="space-y-3">
            <select required data-testid="broadcast-event" className="field" value={f.event_id} onChange={(e) => setF({ ...f, event_id: e.target.value })}>
              <option value="">Choose an event…</option>{(data?.items || []).map((e) => <option key={e.id} value={e.id}>{e.title} — {fmtDate(e.start_at)}</option>)}
            </select>
            <select data-testid="broadcast-kind" className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
              <option value="event_update">Important update</option><option value="event_reminder">Reminder</option><option value="cancellation">Cancellation notice</option>
            </select>
            <input required minLength={3} data-testid="broadcast-subject" placeholder="Subject" className="field" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
            <textarea required minLength={5} rows={5} data-testid="broadcast-message" placeholder="Message" className="field h-auto py-2" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
            <p className="text-xs text-mineral">Sent by email to every confirmed booking for the event. Delivery is tracked per recipient.</p>
            <button data-testid="broadcast-send" className="btn-ink">Queue emails</button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Notifications() {
  const { http } = useStaff();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useLoad(async () => (await http.get(`/admin/notifications?page=${page}${status ? `&status=${status}` : ""}`)).data, [status, page, http]);
  const retry = async (n) => {
    try { const { data: r } = await http.post(`/admin/notifications/${n.id}/retry`); toast.message(`Status: ${r.status.replace("_", " ")}`); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="admin-notifications">
      <PageHead title="Notifications" sub="'Sent' means the provider accepted it; 'delivered' appears only after the provider's signed delivery webhook confirms it.">
        <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} testid="notifications-status-filter" label="Status" options={[["", "All"], ["queued", "Queued"], ["sent", "Sent"], ["delivered", "Delivered"], ["failed", "Failed"], ["not_configured", "Not configured"]]} />
        <Broadcast onDone={reload} />
      </PageHead>
      {data && <Integrations i={data.integrations} />}
      <DataTable loading={loading} error={error} onRetry={reload} testid="notifications-table" rows={data?.items || []} empty="No notifications yet."
        cols={[
          { label: "Type", render: (r) => r.kind.replace(/_/g, " ") },
          { label: "Channel", render: (r) => r.channel },
          { label: "To", render: (r) => r.to },
          { label: "Booking", render: (r) => <span className="font-serial text-xs">{r.booking_reference}</span> },
          { label: "Status", render: (r) => <Pill v={r.status} /> },
          { label: "Attempts", right: true, render: (r) => r.attempts },
          { label: "Last update", nowrap: true, render: (r) => fmtDT(r.updated_at) },
          { label: "Error", render: (r) => <span className="text-xs text-mineral">{r.last_error || ""}</span> },
          { label: "", render: (r) => ["failed", "not_configured"].includes(r.status) ? <button onClick={() => retry(r)} data-testid={`notification-retry-${r.id}`} className="text-xs underline">Retry</button> : null },
        ]} />
      <Pager page={page} total={data?.total || 0} limit={30} onPage={setPage} />
    </div>
  );
}

export function Reports() {
  const { http } = useStaff();
  const { data, loading, error, reload } = useLoad(async () => (await http.get("/admin/reports/events")).data, [http]);
  const exportCsv = () => {
    const rows = [["event", "city", "category", "date", "status", "capacity", "sold", "redeemed", "bookings", "revenue_inr"], ...(data?.items || []).map((e) => [e.title, e.city, e.category, e.start_at, e.status, e.capacity, e.sold, e.redeemed, e.bookings, e.revenue / 100])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = "trailrz-event-report.csv";
    a.click();
  };
  return (
    <div data-testid="admin-reports">
      <PageHead title="Reports" sub="Event performance from confirmed bookings and gate admissions."><button onClick={exportCsv} data-testid="reports-export" className="btn-line h-10 text-sm">Export CSV</button></PageHead>
      <DataTable loading={loading} error={error} onRetry={reload} testid="reports-table" rows={data?.items || []} empty="No events yet."
        cols={[
          { label: "Event", render: (r) => <div><p className="font-medium">{r.title}</p><p className="text-xs text-mineral">{r.category} · {r.city}</p></div> },
          { label: "Date", nowrap: true, render: (r) => fmtDate(r.start_at) },
          { label: "Status", render: (r) => <Pill v={r.status} /> },
          { label: "Sold / Cap", right: true, render: (r) => `${r.sold} / ${r.capacity}` },
          { label: "Occupancy", right: true, render: (r) => (r.capacity ? `${Math.round((r.sold / r.capacity) * 100)}%` : "—") },
          { label: "Admitted", right: true, render: (r) => `${r.redeemed}${r.sold ? ` (${Math.round((r.redeemed / r.sold) * 100)}%)` : ""}` },
          { label: "Bookings", right: true, render: (r) => r.bookings },
          { label: "Revenue", right: true, render: (r) => inr(r.revenue) },
        ]} />
    </div>
  );
}

function Users() {
  const { http, me } = useStaff();
  const { data, loading, error, reload } = useLoad(async () => (await http.get("/users")).data, [http]);
  const ev = useLoad(async () => (await http.get("/admin/events")).data, [http]);
  const [assign, setAssign] = useState(null);
  const setRole = async (u, role) => {
    try { await http.patch(`/users/${u.user_id}/role`, { role }); toast.success("Role updated"); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  const saveAssign = async () => {
    try { await http.patch(`/users/${assign.user_id}/assignments`, { event_ids: assign.assigned_event_ids }); toast.success("Assignments saved"); setAssign(null); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <section className="mt-8">
      <h2 className="font-display text-3xl mb-2">Authorized users</h2>
      <p className="text-sm text-mineral mb-4">Staff sign up at /sign-up, then appear here as "pending" with no access until you assign a role. Gate operators only see the events assigned to them.</p>
      <DataTable loading={loading} error={error} onRetry={reload} testid="users-table" rowKey="user_id" rows={data?.users || []}
        cols={[
          { label: "User", render: (u) => <div><p className="font-medium">{u.name}</p><p className="text-xs text-mineral">{u.email}</p></div> },
          { label: "Role", render: (u) => u.user_id === me.user_id ? <Pill v={u.role} /> : (
            <select aria-label="Role" data-testid={`user-role-${u.user_id}`} value={u.role} onChange={(e) => setRole(u, e.target.value)} className="field h-9 text-sm w-auto">
              {(data.roles.includes(u.role) ? data.roles : [u.role, ...data.roles]).map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>) },
          { label: "Assigned events", render: (u) => u.role === "gate_operator" ? <button data-testid={`user-assign-${u.user_id}`} onClick={() => setAssign({ ...u, assigned_event_ids: u.assigned_event_ids || [] })} className="text-sm underline">{(u.assigned_event_ids || []).length} event(s) — edit</button> : <span className="text-mineral text-xs">{u.role === "pending" ? "No access" : "All"}</span> },
          { label: "Joined", nowrap: true, render: (u) => fmtDT(u.created_at) },
        ]} />
      <Dialog open={!!assign} onOpenChange={(o) => !o && setAssign(null)}>
        <DialogContent className="bg-parchment max-w-lg">
          <DialogTitle className="font-display text-3xl font-normal">Assign events</DialogTitle>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {(ev.data?.items || []).filter((e) => e.status === "published").map((e) => (
              <label key={e.id} className="flex items-center gap-3 text-sm"><input type="checkbox" data-testid={`assign-event-${e.id}`} checked={assign?.assigned_event_ids.includes(e.id) || false}
                onChange={(x) => setAssign({ ...assign, assigned_event_ids: x.target.checked ? [...assign.assigned_event_ids, e.id] : assign.assigned_event_ids.filter((i) => i !== e.id) })} />{e.title} — {fmtDate(e.start_at)}</label>
            ))}
          </div>
          <button onClick={saveAssign} data-testid="assign-save" className="btn-ink">Save assignments</button>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DangerZone({ onCleared }) {
  const { http, me } = useStaff();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  if (me?.role !== "superadmin") return null;

  const handleClear = async (e) => {
    e.preventDefault();
    if (confirmText.trim() !== "CLEAR DATABASE") return;
    setBusy(true);
    try {
      const { data } = await http.post("/admin/database/clear", { confirm: confirmText.trim() });
      const total = Object.values(data?.deleted || {}).reduce((acc, n) => acc + Number(n || 0), 0);
      toast.success(`Database cleared (${total} records deleted). Staff users preserved.`);
      setConfirmText("");
      setOpen(false);
      onCleared?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10 border border-[#d99b92] bg-[#fdf5f3] p-5" data-testid="admin-danger-zone">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-[#9e3324]">Danger zone</p>
          <h2 className="font-display text-3xl mt-1">Clear database</h2>
          <p className="text-sm text-mineral mt-1 max-w-2xl">
            Permanently delete all events, ticket types, bookings, tickets, payments, customers, notifications, gate scans, subscribers, contact messages, webhook events, and audit logs. Staff accounts in Users and the protected demo event (unpublished to Draft) are preserved.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setConfirmText(""); setOpen(true); }}
          data-testid="clear-database-open"
          className="h-10 px-5 text-sm font-medium bg-[#9e3324] text-white hover:bg-[#7d271b] transition-colors"
        >
          Clear database
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-parchment max-w-md">
          <DialogTitle className="font-display text-3xl font-normal">Clear database?</DialogTitle>
          <form onSubmit={handleClear} className="space-y-4">
            <p className="text-sm text-mineral leading-relaxed">
              This will permanently erase all bookings, tickets, payments, events, customers, notifications, and logs. Staff accounts (<strong className="text-ink">Users</strong>), platform settings, and the protected <strong className="text-ink">Demo Event</strong> (set to Draft / unpublished) will remain.
            </p>
            <label className="block">
              <span className="text-xs font-medium">Type <code className="font-serial">CLEAR DATABASE</code> to confirm</span>
              <input
                required
                data-testid="clear-database-confirm-input"
                className="field mt-1 bg-surface font-serial"
                placeholder="CLEAR DATABASE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
            </label>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-line h-10 text-sm">Cancel</button>
              <button
                type="submit"
                disabled={busy || confirmText.trim() !== "CLEAR DATABASE"}
                data-testid="clear-database-submit"
                className="h-10 px-5 text-sm font-medium bg-[#9e3324] text-white disabled:opacity-40"
              >
                {busy ? "Clearing…" : "Permanently clear"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export function SettingsPage() {
  const { http } = useStaff();
  const [s, setS] = useState(null);
  const [extra, setExtra] = useState(null);
  const [err, setErr] = useState(null);
  const audit = useLoad(async () => (await http.get("/admin/audit")).data, [http]);
  useEffect(() => {
    http.get("/admin/settings").then((r) => { setS(r.data.settings); setExtra(r.data); }).catch((e) => setErr(errMsg(e)));
  }, [http]);
  if (err) return <ErrorState message={err} />;
  if (!s) return <Loading />;
  const save = async (e) => {
    e.preventDefault();
    try { await http.put("/admin/settings", s); toast.success("Settings saved"); } catch (er) { toast.error(errMsg(er)); }
  };
  const inp = (k, label, props = {}) => <label className="block"><span className="text-xs font-medium">{label}</span><input data-testid={`settings-${k}`} className="field mt-1 bg-surface" value={s[k] ?? ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} {...props} /></label>;
  return (
    <div data-testid="admin-settings">
      <PageHead title="Settings" sub={`Checkout holds last ${extra.hold_minutes} minutes. Secrets are managed in the hosting secrets panel and are never shown here.`} />
      <Integrations i={extra.integrations} />
      <form onSubmit={save} className="bg-surface border hairline p-5 grid sm:grid-cols-2 gap-4">
        {inp("platform_name", "Platform name")}
        {inp("support_email", "Support email", { type: "email" })}
        {inp("support_phone", "Support phone")}
        <label className="block"><span className="text-xs font-medium">Supported cities (comma separated)</span>
          <input data-testid="settings-cities" className="field mt-1 bg-surface" value={s.supported_cities.join(", ")} onChange={(e) => setS({ ...s, supported_cities: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) })} /></label>
        {["instagram", "facebook", "x", "youtube"].map((k) => (
          <label key={k} className="block"><span className="text-xs font-medium capitalize">{k} URL</span>
            <input data-testid={`settings-social-${k}`} className="field mt-1 bg-surface" value={s.socials?.[k] || ""} onChange={(e) => setS({ ...s, socials: { ...s.socials, [k]: e.target.value } })} /></label>
        ))}
        <div className="sm:col-span-2"><button data-testid="settings-save" className="btn-ink h-10 text-sm">Save settings</button></div>
      </form>
      <Users />
      <section className="mt-8">
        <h2 className="font-display text-3xl mb-4">Audit log</h2>
        <DataTable loading={audit.loading} error={audit.error} testid="audit-table" rows={(audit.data?.items || []).map((a, i) => ({ ...a, id: a.id || i }))} empty="No activity yet."
          cols={[{ label: "When", nowrap: true, render: (a) => fmtDT(a.at) }, { label: "Who", render: (a) => a.actor_email || a.actor_id }, { label: "Action", render: (a) => a.action }, { label: "Target", render: (a) => <span className="font-serial text-xs">{a.target}</span> }]} />
      </section>
      <DangerZone onCleared={audit.reload} />
    </div>
  );
}

export { inr };

