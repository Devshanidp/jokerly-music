import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await auth();
  if (session?.userId?.trim() && session.accessToken?.trim()) {
    redirect("/");
  }

  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
