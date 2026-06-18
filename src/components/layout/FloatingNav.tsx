"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListMusic, Heart, Download } from "lucide-react";
import { usePlayerStore } from "@/store/player";

type NavTarget = "/" | "/playlists" | "/liked" | "/downloaded";

export default function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hasPlayer = usePlayerStore((s) => s.currentTrack !== null);
  const isExpanded = usePlayerStore((s) => s.isPlayerExpanded);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/playlists");
    router.prefetch("/liked");
    router.prefetch("/downloaded");
  }, [router]);

  const go = (e: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>, target: NavTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (pathname === target) return;
    router.push(target, { scroll: false });
  };

  const bottomClass = hasPlayer ? "bottom-[104px]" : "bottom-[5.5rem]";

  if (isExpanded) return null;

  const btn = (target: NavTarget, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onPointerDown={(e) => go(e, target)}
      onClick={(e) => e.preventDefault()}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-full font-medium text-[10px] sm:text-xs transition-all duration-200 ${
        pathname === target
          ? "btn-nav-active text-white/95"
          : "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[55] transition-all duration-300 pointer-events-none ${bottomClass}`}
    >
      <nav
        className="pointer-events-auto flex items-center gap-0.5 p-0.5 rounded-full border border-purple-500/15"
        style={{
          background: "linear-gradient(180deg, rgba(14, 8, 22, 0.94) 0%, rgba(8, 5, 12, 0.96) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(120, 60, 180, 0.08)",
        }}
        aria-label="Main navigation"
      >
        {btn("/", <Home size={14} />, "Home")}
        {btn("/playlists", <ListMusic size={14} />, "Playlist")}
        {btn("/downloaded", <Download size={14} />, "Downloads")}
        {btn("/liked", <Heart size={14} />, "Liked")}
      </nav>
    </div>
  );
}
