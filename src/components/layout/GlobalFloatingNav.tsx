"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import FloatingNav from "@/components/layout/FloatingNav";

const HIDDEN_PATHS = new Set(["/login", "/onboarding"]);

/** Bottom nav on every authenticated screen (hidden on login/onboarding and for guests). */
export default function GlobalFloatingNav() {
  const pathname = usePathname();
  const { status } = useSession();
  if (HIDDEN_PATHS.has(pathname)) return null;
  if (status === "unauthenticated") return null;
  return <FloatingNav />;
}
