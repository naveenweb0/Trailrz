import { Suspense } from "react";
import { SignInPage } from "@/views/SignInPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignInPage />
    </Suspense>
  );
}
