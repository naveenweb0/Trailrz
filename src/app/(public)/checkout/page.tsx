import { Suspense } from "react";
import Checkout from "@/views/public/Checkout";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="wrap py-12"><div className="h-96 rounded bg-linen/30 animate-pulse" /></div>}>
      <Checkout />
    </Suspense>
  );
}
