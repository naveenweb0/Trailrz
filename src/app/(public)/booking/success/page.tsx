import { Suspense } from "react";
import BookingSuccess from "@/views/public/BookingSuccess";

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div className="wrap py-12"><div className="h-96 rounded bg-linen/30 animate-pulse" /></div>}>
      <BookingSuccess />
    </Suspense>
  );
}
