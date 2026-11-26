import { Suspense } from "react";
import Discover from "@/views/public/Discover";

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="wrap py-12"><div className="h-96 rounded bg-linen/30 animate-pulse" /></div>}>
      <Discover />
    </Suspense>
  );
}
