"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, ListMusic, Heart } from "lucide-react";
import { usePlayerStore } from "@/store/player";

type NavTarget = "/" | "/playlists" | "/liked";

export default function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const hasPlayer = usePlayerStore((s) => s.currentTrack !== null);
  const isExpanded = usePlayerStore((s) => s.isPlayerExpanded);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/playlists");
    router.prefetch("/liked");
  }, [router]);

  const go = (e: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>, target: NavTarget) => {
    e.preventDefault();
    e.stopPropagation();
    if (pathname === target) return;
    router.push(target, { scroll: false });
  };

  if (isExpanded) return null;

  const btn = (target: NavTarget, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onPointerDown={(e) => go(e, target)}
      onClick={(e) => e.preventDefault()}
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
        pathname === target
          ? "btn-red text-white"
          : "text-white/50 hover:text-white hover:bg-white/[0.08]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${hasPlayer ? "bottom-[88px]" : "bottom-5"}`}>
      <div className="flex items-center gap-1 p-1 rounded-full shadow-2xl"
        style={{ background: "rgba(9,3,5,0.95)", backdropFilter: "blur(24px)", boxShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
        {btn("/", <Home size={18} />, "Home")}
        {btn("/playlists", <ListMusic size={18} />, "Playlists")}
        {btn("/liked", <Heart size={18} />, "Liked")}
      </div>
    </div>
  );
}
