import { Suspense } from "react";
import Gate from "@/views/gate/Gate";

export const dynamic = "force-dynamic";

export default function GatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#121110] text-[#f7f4ed] flex items-center justify-center p-6 font-mono text-sm">
          Loading Gate Terminal…
        </div>
      }
    >
      <Gate />
    </Suspense>
  );
}
