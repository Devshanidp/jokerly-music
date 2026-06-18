"use client";

import { useEffect } from "react";
import { useOfflineStore } from "@/store/offline";

export default function OfflineBootstrap() {
  const hydrate = useOfflineStore((s) => s.hydrate);
  const hydrated = useOfflineStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  return null;
}
