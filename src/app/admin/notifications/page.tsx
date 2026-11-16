"use client";

import React, { useState, useEffect } from "react";
import { Bell, RefreshCw, Send, CheckCircle2, XCircle, AlertCircle, Eye, X } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("All");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [statusFilter]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Notification retried successfully!");
        fetchNotifications();
      } else {
        alert(data.error || "Failed to retry notification");
      }
    } catch (err: any) {
      alert(err.message || "Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
            Dispatch & Notification Audit
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Track transactional emails (Resend) and WhatsApp Cloud API confirmation messages.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs font-semibold text-white focus:outline-none"
        >
          <option value="All">All Statuses</option>
          <option value="SENT">Sent</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Notifications Table */}
      <div className="bg-neutral-900 border border-white/10 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="text-[10px] uppercase font-bold text-white/40 bg-neutral-800/60 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">Channel / Type</th>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Booking Ref</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Attempts</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Sent Time</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">
                    Loading notifications...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-white/40">
                    No notifications recorded yet.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          n.type === "EMAIL"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {n.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-white">
                      {n.recipient}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-trailrz-red">
                      {n.booking?.bookingReference}
                    </td>

                    <td className="py-3.5 px-4 text-white">
                      {n.booking?.customerName}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-white/60">
                      {n.attempts}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          n.status === "SENT"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : n.status === "FAILED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {n.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-white/50 text-[11px] font-mono">
                      {n.sentAt ? formatDateTime(n.sentAt) : "Pending"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => setSelectedNotification(n)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white"
                          title="View Payload / Response"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {n.status === "FAILED" && (
                          <button
                            disabled={retryingId === n.id}
                            onClick={() => handleRetry(n.id)}
                            className="p-1.5 rounded-lg hover:bg-trailrz-red/20 text-trailrz-red"
                            title="Retry Dispatch"
                          >
                            <RefreshCw className={`w-4 h-4 ${retryingId === n.id ? "animate-spin" : ""}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details View Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedNotification(null)}
              className="absolute right-4 top-4 p-1 text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold text-trailrz-red">
                {selectedNotification.type} Notification Details
              </span>
              <h3 className="font-bold text-white text-base">
                Recipient: {selectedNotification.recipient}
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-white/70">Message Subject / Summary:</div>
              <p className="p-3 rounded-xl bg-neutral-800 text-white/80">
                {selectedNotification.content}
              </p>
            </div>

            {selectedNotification.lastError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200">
                <strong>Delivery Error:</strong> {selectedNotification.lastError}
              </div>
            )}

            {selectedNotification.providerResponse && (
              <div className="space-y-1 text-xs">
                <span className="text-white/50 text-[10px] uppercase font-bold">Provider Response</span>
                <pre className="p-3 rounded-xl bg-neutral-800 text-white/70 font-mono text-[10px] overflow-x-auto">
                  {selectedNotification.providerResponse}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
