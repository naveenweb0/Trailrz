"use client";

import React, { useState, useEffect } from "react";
import { Search, Users, Mail, Phone, Ticket, DollarSign, Calendar, Eye, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
          Customer Database
        </h1>
        <p className="text-xs text-white/50 mt-1">
          Automatically compiled from confirmed bookings. View lifetime spend, total tickets, and booking history.
        </p>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-800 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-trailrz-red"
          />
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Bookings</th>
                <th className="py-3.5 px-4">Tickets</th>
                <th className="py-3.5 px-4">Lifetime Spend</th>
                <th className="py-3.5 px-4 text-right">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    Loading customer database...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-white/40">
                    No customers found. Customer profiles are created automatically upon booking.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {c.fullName}
                    </td>

                    <td className="py-3.5 px-4 text-white/70">
                      {c.email}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white/70">
                      {c.phone}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white">
                      {c.totalBookings} orders
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white">
                      {c.totalTicketsPurchased} passes
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-trailrz-red">
                      {formatCurrency(c.totalSpent)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="View Customer Booking History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute right-4 top-4 p-1 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold text-trailrz-red">
                Customer Profile
              </span>
              <h3 className="font-editorial text-xl font-bold text-white">
                {selectedCustomer.fullName}
              </h3>
              <p className="text-xs text-white/50">{selectedCustomer.email} • {selectedCustomer.phone}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-800 text-center">
                <span className="text-[10px] text-white/40 block">Orders</span>
                <strong className="text-sm text-white font-mono">{selectedCustomer.totalBookings}</strong>
              </div>
              <div className="p-3 rounded-xl bg-neutral-800 text-center">
                <span className="text-[10px] text-white/40 block">Passes</span>
                <strong className="text-sm text-white font-mono">{selectedCustomer.totalTicketsPurchased}</strong>
              </div>
              <div className="p-3 rounded-xl bg-neutral-800 text-center">
                <span className="text-[10px] text-white/40 block">Spend</span>
                <strong className="text-sm text-trailrz-red font-mono">{formatCurrency(selectedCustomer.totalSpent)}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/60">
                Recent Bookings
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedCustomer.bookings?.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl bg-neutral-800/80 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-white block">
                        {b.bookingReference}
                      </span>
                      <span className="text-white/60 text-[11px]">{b.event?.title}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">
                        {formatCurrency(b.totalAmount)}
                      </span>
                      <span className="block text-[9px] text-emerald-400">
                        {b.bookingStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
