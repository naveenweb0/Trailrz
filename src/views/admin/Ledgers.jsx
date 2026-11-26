"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useStaff } from "@/views/admin/AdminLayout";
import { useLoad, fmtDT, rupees as inr, errMsg } from "@/lib/api";
import { PageHead, DataTable, Pill, SearchBox, Select, Pager } from "@/components/admin/AdminKit";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Loading } from "@/components/common/States";

function useList(path, extra = {}) {
  const { http } = useStaff();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page, limit: 25, ...(q && { q }), ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v)) }).toString();
  const res = useLoad(async () => (await http.get(`${path}?${params}`)).data, [params, http]);
  return { ...res, q, setQ: (v) => { setQ(v); setPage(1); }, page, setPage };
}

const Drawer = ({ open, onClose, title, children }) => (
  <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
    <SheetContent side="right" className="bg-parchment w-full sm:max-w-xl overflow-y-auto"><SheetTitle className="font-display text-3xl font-normal">{title}</SheetTitle>{children}</SheetContent>
  </Sheet>
);

const KV = ({ rows }) => <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm mt-4">{rows.map(([k, v]) => [<dt key={k} className="text-mineral">{k}</dt>, <dd key={k + "v"} className="break-all">{v}</dd>])}</dl>;

function BookingDrawer({ id, onClose }) {
  const { http } = useStaff();
  const { data, loading, reload } = useLoad(async () => (id ? (await http.get(`/admin/bookings/${id}`)).data : null), [id, http]);
  const resend = async () => {
    try { const { data: n } = await http.post(`/admin/bookings/${id}/resend`); toast.success(`Email ${n.status.replace("_", " ")}`); reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Drawer open={!!id} onClose={onClose} title={data ? data.reference : "Booking"}>
      {loading || !data ? <Loading /> : (
        <div data-testid="booking-drawer">
          <KV rows={[["Event", data.event.title], ["Date", fmtDT(data.event.start_at)], ["Customer", data.customer.name], ["Email", data.customer.email], ["Mobile", data.customer.phone],
            ["Amount", inr(data.amount)], ["Status", <Pill key="status" v={data.status} />], ["Payment", <Pill key="payment" v={data.payment_status} />], ["Created", fmtDT(data.created_at)], ["Confirmed", fmtDT(data.confirmed_at)]]} />
          <p className="eyebrow mt-8 mb-2">Items</p>
          {data.items.map((i) => <p key={i.ticket_type_id} className="text-sm">{i.quantity} × {i.name} — {inr(i.subtotal)}</p>)}
          <p className="eyebrow mt-8 mb-2">Tickets</p>
          {data.tickets.length ? data.tickets.map((t) => <p key={t.id} className="text-sm flex gap-3"><span className="font-serial">{t.serial}</span><span>{t.tier_name}</span><Pill v={t.status} /></p>) : <p className="text-sm text-mineral">None issued.</p>}
          <p className="eyebrow mt-8 mb-2">Payments</p>
          {data.payments.length ? data.payments.map((p) => <KV key={p.id} rows={[["Order", p.order_id], ["Payment", p.payment_id || "—"], ["Status", <Pill key="pstatus" v={p.status} />]]} />) : <p className="text-sm text-mineral">No gateway payment (free booking or not started).</p>}
          <p className="eyebrow mt-8 mb-2">Notifications</p>
          {data.notifications.map((n) => <p key={n.id} className="text-sm flex gap-3"><span>{n.kind.replace(/_/g, " ")}</span><Pill v={n.status} /><span className="text-mineral">{fmtDT(n.updated_at)}</span></p>)}
          {data.status === "confirmed" && <button onClick={resend} data-testid="booking-resend-email" className="btn-line h-10 text-sm mt-4">Resend confirmation email</button>}
        </div>
      )}
    </Drawer>
  );
}

export function Bookings() {
  const { http } = useStaff();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(null);
  const l = useList("/admin/bookings", { status });
  const exportCsv = async () => {
    try {
      const r = await http.get(`/admin/bookings/export.csv?${new URLSearchParams({ ...(l.q && { q: l.q }), ...(status && { status }) })}`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = "trailrz-bookings.csv";
      a.click();
    } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="admin-bookings">
      <PageHead title="Bookings">
        <SearchBox value={l.q} onChange={l.setQ} placeholder="Reference, customer, event" testid="bookings-search" />
        <Select value={status} onChange={setStatus} testid="bookings-status-filter" label="Status" options={[["", "All statuses"], ["confirmed", "Confirmed"], ["held", "Held"], ["expired", "Expired"], ["cancelled", "Cancelled"], ["refund_due", "Refund due"]]} />
        <button onClick={exportCsv} data-testid="bookings-export" className="btn-line h-10 text-sm"><Download className="h-4 w-4" /> Export CSV</button>
      </PageHead>
      <DataTable {...l} onRetry={l.reload} testid="bookings-table" rows={l.data?.items || []} onRow={(r) => setOpen(r.id)} empty="No bookings yet."
        cols={[
          { label: "Reference", render: (r) => <span className="font-serial text-xs">{r.reference}</span> },
          { label: "Customer", render: (r) => r.customer.name },
          { label: "Event", render: (r) => r.event.title },
          { label: "Booked", nowrap: true, render: (r) => fmtDT(r.created_at) },
          { label: "Qty", right: true, render: (r) => r.items.reduce((s, i) => s + i.quantity, 0) },
          { label: "Total", right: true, render: (r) => inr(r.amount) },
          { label: "Payment", render: (r) => <Pill v={r.payment_status} /> },
          { label: "Booking", render: (r) => <Pill v={r.status} /> },
        ]} />
      <Pager page={l.page} total={l.data?.total || 0} limit={25} onPage={l.setPage} />
      <BookingDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

export function Tickets() {
  const { http, me } = useStaff();
  const [status, setStatus] = useState("");
  const l = useList("/admin/tickets", { status });
  const voidT = async (t) => {
    const reason = window.prompt(`Void ${t.serial}? It will be refused at the gate. Reason:`);
    if (!reason) return;
    try { await http.post(`/admin/tickets/${t.id}/void`, { reason }); toast.success("Ticket voided"); l.reload(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div data-testid="admin-tickets">
      <PageHead title="Ticket registry" sub="Lifecycle: VALID → REDEEMED at the gate, or VALID → VOID by an administrator.">
        <SearchBox value={l.q} onChange={l.setQ} placeholder="Serial, reference, guest, event" testid="tickets-search" />
        <Select value={status} onChange={setStatus} testid="tickets-status-filter" label="Status" options={[["", "All"], ["VALID", "Valid"], ["REDEEMED", "Redeemed"], ["VOID", "Void"]]} />
      </PageHead>
      <DataTable {...l} onRetry={l.reload} testid="tickets-table" rows={l.data?.items || []} empty="No tickets issued yet."
        cols={[
          { label: "Serial", render: (r) => <span className="font-serial text-xs">{r.serial}</span> },
          { label: "Booking", render: (r) => <span className="font-serial text-xs">{r.booking_reference}</span> },
          { label: "Event", render: (r) => r.event_title },
          { label: "Guest", render: (r) => r.holder_name },
          { label: "Tier", render: (r) => r.tier_name },
          { label: "Issued", nowrap: true, render: (r) => fmtDT(r.issued_at) },
          { label: "Status", render: (r) => <Pill v={r.status} /> },
          { label: "Admission", nowrap: true, render: (r) => (r.redeemed_at ? `${fmtDT(r.redeemed_at)} · ${r.redeemed_gate || ""}` : "—") },
          { label: "", render: (r) => r.status === "VALID" && ["superadmin", "admin"].includes(me.role) ? <button onClick={() => voidT(r)} data-testid={`ticket-void-${r.id}`} className="text-xs text-invalid underline">Void</button> : null },
        ]} />
      <Pager page={l.page} total={l.data?.total || 0} limit={25} onPage={l.setPage} />
    </div>
  );
}

function CustomerDrawer({ id, onClose }) {
  const { http } = useStaff();
  const { data, loading } = useLoad(async () => (id ? (await http.get(`/admin/customers/${id}`)).data : null), [id, http]);
  return (
    <Drawer open={!!id} onClose={onClose} title={data?.name || "Customer"}>
      {loading || !data ? <Loading /> : (
        <div data-testid="customer-drawer">
          <KV rows={[["Email", data.email], ["Mobile", data.phone], ["First seen", fmtDT(data.created_at)], ["Last activity", fmtDT(data.last_seen_at)]]} />
          <p className="eyebrow mt-8 mb-2">Booking history</p>
          {data.history.map((b) => <div key={b.id} className="py-2 border-b hairline text-sm flex justify-between gap-3"><span><span className="font-serial text-xs">{b.reference}</span> · {b.event.title}</span><span className="flex gap-2">{inr(b.amount)} <Pill v={b.status} /></span></div>)}
        </div>
      )}
    </Drawer>
  );
}

export function Customers() {
  const [open, setOpen] = useState(null);
  const l = useList("/admin/customers");
  return (
    <div data-testid="admin-customers">
      <PageHead title="Customers" sub="Created from real checkouts. Contact details are visible to administrators only.">
        <SearchBox value={l.q} onChange={l.setQ} placeholder="Name, email, phone" testid="customers-search" />
      </PageHead>
      <DataTable {...l} onRetry={l.reload} testid="customers-table" rows={l.data?.items || []} onRow={(r) => setOpen(r.id)} empty="No customers yet."
        cols={[
          { label: "Customer", render: (r) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-mineral">{r.email}</p></div> },
          { label: "Mobile", render: (r) => r.phone },
          { label: "Bookings", right: true, render: (r) => r.bookings },
          { label: "Tickets", right: true, render: (r) => r.tickets },
          { label: "Lifetime spend", right: true, render: (r) => inr(r.spent) },
          { label: "Last booking", nowrap: true, render: (r) => fmtDT(r.last_booking_at) },
        ]} />
      <Pager page={l.page} total={l.data?.total || 0} limit={25} onPage={l.setPage} />
      <CustomerDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}

export function Payments() {
  const [status, setStatus] = useState("");
  const l = useList("/admin/payments", { status });
  return (
    <div data-testid="admin-payments">
      <PageHead title="Payment ledger" sub="Statuses come only from verified Razorpay signatures or signed webhooks — they cannot be set by hand.">
        <SearchBox value={l.q} onChange={l.setQ} placeholder="Order, payment, reference" testid="payments-search" />
        <Select value={status} onChange={setStatus} testid="payments-status-filter" label="Status" options={[["", "All"], ["created", "Created"], ["paid", "Paid"], ["failed", "Failed"], ["signature_failed", "Signature failed"]]} />
      </PageHead>
      {l.data?.refunds_due?.length > 0 && (
        <div className="border-l-2 border-invalid bg-surface p-4 mb-4 text-sm" data-testid="refunds-due">
          <p className="font-medium">{l.data.refunds_due.length} paid booking(s) need a refund</p>
          <p className="text-mineral">Payment landed after the hold expired and inventory had sold out. Refund these from the Razorpay dashboard: {l.data.refunds_due.map((b) => b.reference).join(", ")}</p>
        </div>
      )}
      <DataTable {...l} onRetry={l.reload} testid="payments-table" rows={l.data?.items || []} empty="No payments yet."
        cols={[
          { label: "Order", render: (r) => <span className="font-serial text-xs">{r.order_id}</span> },
          { label: "Payment ref", render: (r) => <span className="font-serial text-xs">{r.payment_id || "—"}</span> },
          { label: "Booking", render: (r) => <span className="font-serial text-xs">{r.booking_reference}</span> },
          { label: "Customer", render: (r) => r.customer_name },
          { label: "Gross", right: true, render: (r) => inr(r.amount) },
          { label: "Gateway", render: (r) => r.gateway },
          { label: "Status", render: (r) => <Pill v={r.status} /> },
          { label: "Verified by", render: (r) => r.verified_by || "—" },
          { label: "Date", nowrap: true, render: (r) => fmtDT(r.created_at) },
          { label: "Refund", render: (r) => r.refund_status || "—" },
        ]} />
      <Pager page={l.page} total={l.data?.total || 0} limit={25} onPage={l.setPage} />
    </div>
  );
}
