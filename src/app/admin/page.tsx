"use client";

import { useStaff } from "@/views/admin/AdminLayout";
import Overview from "@/views/admin/Overview";
import { Navigate } from "@/lib/router";

export default function AdminPage() {
  const staff = useStaff() as any;
  if (staff?.me?.role === "event_manager") {
    return <Navigate to="/admin/events" replace />;
  }
  return <Overview />;
}

