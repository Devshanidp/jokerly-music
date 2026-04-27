"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { PinnedPlaylist } from "@/types";
import Link from "next/link";
import { Pin } from "lucide-react";
import PinnedPlaylistSection from "@/components/home/PinnedPlaylistSection";

export default function HomeClient() {
  const { data: session } = useSession();
  const [pinned, setPinned] = useState<PinnedPlaylist[]>([]);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  useEffect(() => {
    fetch("/api/pinned")
      .then((r) => r.json())
      .then((data) => setPinned(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-1">Good evening, {firstName} 👋</h2>
        <p className="text-zinc-400">Welcome to Jokerly. Search for anything.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Pin size={16} className="text-red-400" /> Pinned Playlists
          </h3>
          <Link href="/pinned" className="text-xs text-zinc-400 hover:text-white transition-colors">
            View all
          </Link>
        </div>

        <PinnedPlaylistSection pinned={pinned} />
      </section>
    </div>
  );
}
