import { Suspense } from "react";
import AdminLayout from "@/views/admin/AdminLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayout>{children}</AdminLayout>
    </Suspense>
  );
}
