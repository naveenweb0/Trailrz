"use client";

import { useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { useStaff } from "@/views/admin/AdminLayout";
import { useLoad, rupees as inr, fmtDate } from "@/lib/api";
import { PageHead, Stat } from "@/components/admin/AdminKit";
import { Loading, ErrorState } from "@/components/common/States";

const PRESETS = [["today", "Today", 0], ["7", "7 days", 7], ["30", "30 days", 30], ["90", "90 days", 90]];
const IST = (d) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);

function range(preset, custom) {
  if (preset === "custom") return custom.from ? { from: `${custom.from}T00:00:00+05:30`, to: custom.to ? `${custom.to}T23:59:59+05:30` : undefined } : {};
  const days = PRESETS.find((p) => p[0] === preset)[2];
  const start = IST(new Date(Date.now() - days * 86400000));
  return { from: `${start}T00:00:00+05:30` };
}

const Bars = ({ title, data }) => (
  <div className="bg-surface border hairline p-4">
    <p className="eyebrow mb-4">{title}</p>
    {data.length === 0 ? <p className="text-sm text-mineral py-6">No confirmed revenue in this period.</p> : data.sort((a, b) => b.revenue - a.revenue).map((d) => {
      const max = Math.max(...data.map((x) => x.revenue)) || 1;
      return (
        <div key={d.name} className="mb-3">
          <div className="flex justify-between text-sm"><span>{d.name}</span><span className="tabular">{inr(d.revenue)}</span></div>
          <div className="h-1.5 bg-tint mt-1"><div className="h-full bg-ink" style={{ width: `${(d.revenue / max) * 100}%` }} /></div>
        </div>
      );
    })}
  </div>
);

export default function Overview() {
  const { http } = useStaff();
  const [preset, setPreset] = useState("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const r = range(preset, custom);
  const qs = new URLSearchParams(Object.entries({ date_from: r.from, date_to: r.to }).filter(([, v]) => v)).toString();
  const { data, loading, error, reload } = useLoad(async () => (await http.get(`/admin/overview?${qs}`)).data, [qs, http]);
  return (
    <div data-testid="admin-overview">
      <PageHead title="Overview" sub="All figures are calculated from confirmed bookings in the database.">
        <div className="flex border hairline bg-surface" role="group" aria-label="Date range">
          {[...PRESETS, ["custom", "Custom"]].map(([k, l]) => (
            <button key={k} data-testid={`overview-range-${k}`} aria-pressed={preset === k} onClick={() => setPreset(k)} className={`px-3 h-10 text-sm ${preset === k ? "bg-ink text-parchment" : ""}`}>{l}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex gap-2">
            <input type="date" aria-label="From" data-testid="overview-custom-from" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="field h-10 bg-surface text-sm" />
            <input type="date" aria-label="To" data-testid="overview-custom-to" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="field h-10 bg-surface text-sm" />
          </div>
        )}
      </PageHead>
      {loading ? <Loading /> : error ? <ErrorState message={error} onRetry={reload} /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <Stat testid="kpi-revenue" label="Revenue" value={inr(data.revenue)} />
            <Stat testid="kpi-bookings" label="Confirmed bookings" value={data.bookings} />
            <Stat testid="kpi-tickets" label="Tickets issued" value={data.tickets_issued} />
            <Stat testid="kpi-redeemed" label="Redeemed" value={data.tickets_redeemed} />
            <Stat testid="kpi-upcoming" label="Upcoming events" value={data.upcoming_events} sub="published" />
            <Stat testid="kpi-holds" label="Active holds" value={data.active_holds} sub="live now" />
            <Stat testid="kpi-pending" label="Pending payments" value={data.pending_payments} sub="orders created" />
            <Stat testid="kpi-refunds" label="Refunds due" value={data.refunds_due} />
          </div>
          <div className="grid xl:grid-cols-3 gap-3 mt-3">
            <div className="xl:col-span-2 bg-surface border hairline p-4" data-testid="chart-revenue">
              <p className="eyebrow mb-4">Revenue by day</p>
              {data.series.length === 0 ? <p className="text-sm text-mineral py-16 text-center">No confirmed bookings in this period.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data.series.map((s) => ({ ...s, rupees: s.revenue / 100 }))}>
                    <CartesianGrid stroke="#E6DED0" vertical={false} /><XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#686053" /><YAxis stroke="#686053" width={60} />
                    <Tooltip formatter={(v) => `₹${v.toLocaleString("en-IN")}`} /><Area type="monotone" dataKey="rupees" name="Revenue" stroke="#181614" fill="#FFD20A" fillOpacity={0.35} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-surface border hairline p-4" data-testid="chart-bookings">
              <p className="eyebrow mb-4">Bookings & tickets</p>
              {data.series.length === 0 ? <p className="text-sm text-mineral py-16 text-center">Nothing yet.</p> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.series}><CartesianGrid stroke="#E6DED0" vertical={false} /><XAxis dataKey="date" tickFormatter={(d) => d.slice(8)} stroke="#686053" /><YAxis allowDecimals={false} stroke="#686053" width={30} />
                    <Tooltip /><Bar dataKey="bookings" fill="#181614" name="Bookings" /><Bar dataKey="tickets" fill="#5E6B43" name="Tickets" /></BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="grid lg:grid-cols-3 gap-3 mt-3">
            <Bars title="Revenue by category" data={data.by_category} />
            <Bars title="Revenue by city" data={data.by_city} />
            <div className="bg-surface border hairline p-4" data-testid="event-occupancy">
              <p className="eyebrow mb-4">Upcoming occupancy</p>
              {data.event_performance.length === 0 ? <p className="text-sm text-mineral py-6">No upcoming published events.</p> : data.event_performance.map((e) => (
                <div key={e.id} className="mb-3">
                  <div className="flex justify-between text-sm gap-3"><span className="truncate">{e.title}</span><span className="tabular whitespace-nowrap">{e.sold}/{e.capacity}</span></div>
                  <div className="h-1.5 bg-tint mt-1"><div className="h-full bg-beam" style={{ width: `${e.occupancy}%` }} /></div>
                  <p className="text-[11px] text-mineral mt-0.5">{fmtDate(e.start_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

