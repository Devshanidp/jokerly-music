"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Search, ListMusic, Sparkles, Pin, Heart, Download, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_LOGO, APP_NAME } from "@/lib/branding";

const nav = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/recommendations", icon: Sparkles, label: "For You" },
  { href: "/magic-mix", icon: Wand2, label: "Magic Mix" },
  { href: "/playlists", icon: ListMusic, label: "Playlists" },
  { href: "/liked", icon: Heart, label: "Liked" },
  { href: "/downloaded", icon: Download, label: "Downloaded" },
  { href: "/pinned", icon: Pin, label: "Pinned" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-black border-r border-zinc-900 flex flex-col h-full shrink-0">
      <div className="p-6 border-b border-zinc-900">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src={APP_LOGO}
            alt={APP_NAME}
            width={36}
            height={36}
            className="rounded-xl"
            unoptimized
          />
          <span className="text-white text-xl font-bold tracking-tight">{APP_NAME}</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3 pt-3">
        {nav.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-colors",
              pathname === href
                ? "btn-nav-active text-white/95 border border-purple-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900"
            )}
          >
            <Icon size={14} className={pathname === href ? "text-[var(--accent)]" : ""} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
