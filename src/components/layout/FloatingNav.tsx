"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, ListMusic, Heart, Wand2 } from "lucide-react";
import { usePlayerStore } from "@/store/player";

type NavTarget = "/" | "/playlists" | "/liked" | "/magic-mix";

export default function FloatingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const hasPlayer = usePlayerStore((s) => s.currentTrack !== null);
  const isExpanded = usePlayerStore((s) => s.isPlayerExpanded);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/playlists");
    router.prefetch("/liked");
    router.prefetch("/magic-mix");
  }, [router]);

  const go = (e: React.PointerEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>, target: NavTarget) => {
    e.preventDefault();
    e.stopPropagation();
    // Always reset to the playlist list (clears Magic Mix ?id= deep link)
    if (target === "/playlists") {
      router.push("/playlists", { scroll: false });
      window.dispatchEvent(new Event("playlists-show-list"));
      return;
    }
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
          ? "btn-nav-active font-semibold"
          : "text-white/60 hover:text-white hover:bg-white/[0.08]"
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
        className={`theme-dark pointer-events-auto flex items-center gap-0.5 p-0.5 rounded-full border-2 ${
          isDark ? "border-white" : "border-[var(--accent)]"
        }`}
        style={{
          background: "#000000",
          backdropFilter: "blur(20px)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
        }}
        aria-label="Main navigation"
      >
        {btn("/", <Home size={14} />, "Home")}
        {btn("/magic-mix", <Wand2 size={14} />, "Magic Mix")}
        {btn("/playlists", <ListMusic size={14} />, "Playlist")}
        {btn("/liked", <Heart size={14} />, "Liked")}
      </nav>
    </div>
  );
}
