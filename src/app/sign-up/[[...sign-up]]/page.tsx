import { Suspense } from "react";
import { SignUpPage } from "@/views/SignInPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SignUpPage />
    </Suspense>
  );
}
