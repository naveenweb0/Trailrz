import { Suspense } from "react";
import MyTickets from "@/views/public/MyTickets";

export default function MyTicketsPage() {
  return (
    <Suspense fallback={<div className="wrap py-12"><div className="h-96 rounded bg-linen/30 animate-pulse" /></div>}>
      <MyTickets />
    </Suspense>
  );
}
