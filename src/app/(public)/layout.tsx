import { Suspense } from "react";
import PublicLayout from "@/components/public/PublicLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PublicLayout>{children}</PublicLayout>
    </Suspense>
  );
}
