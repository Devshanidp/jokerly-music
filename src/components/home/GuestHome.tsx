"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, LogIn, Music, Search, X } from "lucide-react";
import { APP_LOGO, APP_NAME } from "@/lib/branding";
import {
  MusicArtist,
  MusicTrack,
  artistImage,
  artistNames,
  trackImage,
} from "@/types/music-catalog";

interface GuestSection {
  langId: string;
  label: string;
  emoji: string;
  tracks: MusicTrack[];
  artists: MusicArtist[];
}

interface GuestSearchResults {
  tracks: MusicTrack[];
  artists: MusicArtist[];
}

const SIGN_IN_NOTICE = "Sign in with your Spotify Premium account to play full songs.";

function TrackRow({ track, onTap }: { track: MusicTrack; onTap: () => void }) {
  const image = trackImage(track);
  return (
    <button
      type="button"
      onClick={onTap}
      className="w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
    >
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl" style={{ background: "var(--card)" }}>
        {image ? (
          <Image src={image} alt={track.name} fill unoptimized className="object-cover" sizes="44px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music size={14} className="text-white/25" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{track.name}</p>
        <p className="truncate text-xs text-white/45">{artistNames(track)}</p>
      </div>
    </button>
  );
}

function ArtistChip({ artist, onTap }: { artist: MusicArtist; onTap: () => void }) {
  const image = artistImage(artist);
  return (
    <button type="button" onClick={onTap} className="flex w-20 shrink-0 flex-col items-center gap-1.5 text-center">
      <div className="relative h-16 w-16 overflow-hidden rounded-full" style={{ background: "var(--card)" }}>
        {image ? (
          <Image src={image} alt={artist.name} fill unoptimized className="object-cover" sizes="64px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music size={14} className="text-white/25" />
          </div>
        )}
      </div>
      <span className="w-full truncate text-[11px] font-medium text-white/70">{artist.name}</span>
    </button>
  );
}

export default function GuestHome() {
  const [sections, setSections] = useState<GuestSection[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GuestSearchResults | null>(null);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showNotice = () => {
    setNotice(SIGN_IN_NOTICE);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/music/guest-feed")
      .then((r) => r.json())
      .then((data: { sections?: GuestSection[] }) => {
        if (cancelled) return;
        const next = data.sections ?? [];
        setSections(next);
        setFeedError(next.length === 0);
      })
      .catch(() => {
        if (!cancelled) setFeedError(true);
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      fetch(`/api/music/guest-search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: { tracks?: MusicTrack[]; artists?: MusicArtist[] }) => {
          if (cancelled) return;
          setResults({ tracks: data.tracks ?? [], artists: data.artists ?? [] });
        })
        .catch(() => {
          if (!cancelled) setResults({ tracks: [], artists: [] });
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Image src={APP_LOGO} alt={APP_NAME} width={40} height={40} unoptimized className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-white">{APP_NAME}</h1>
          <p className="text-xs text-white/45">Browsing as a guest</p>
        </div>
        <Link
          href="/login"
          className="btn-accent flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white"
        >
          <LogIn size={13} />
          Sign in
        </Link>
      </div>

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks & artists"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-10 pr-10 text-sm text-white placeholder-white/35 outline-none focus:border-white/25"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {notice && (
        <div className="rounded-2xl border border-purple-500/30 px-4 py-3 text-xs text-white/85" style={{ background: "rgba(140, 80, 200,0.14)" }}>
          {notice}{" "}
          <Link href="/login" className="font-bold underline">
            Sign in
          </Link>
        </div>
      )}

      {query.trim() ? (
        <div className="space-y-4">
          {searching && !results ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/45">
              <Loader2 size={16} className="animate-spin" /> Searching…
            </div>
          ) : results && results.tracks.length === 0 && results.artists.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/45">No results for “{query.trim()}”.</p>
          ) : results ? (
            <>
              {results.artists.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {results.artists.map((artist) => (
                    <ArtistChip key={artist.id} artist={artist} onTap={showNotice} />
                  ))}
                </div>
              )}
              <div className="space-y-0.5">
                {results.tracks.map((track) => (
                  <TrackRow key={track.id} track={track} onTap={showNotice} />
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : feedLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/45">
          <Loader2 size={16} className="animate-spin" /> Loading music…
        </div>
      ) : feedError ? (
        <p className="py-16 text-center text-sm text-white/45">
          Couldn’t load music right now. Check your connection and reopen the app, or{" "}
          <Link href="/login" className="font-bold text-white underline">
            sign in
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.langId} className="space-y-3">
              <h2 className="text-sm font-bold text-white">
                <span className="mr-1.5">{section.emoji}</span>
                {section.label}
              </h2>
              {section.artists.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                  {section.artists.map((artist) => (
                    <ArtistChip key={artist.id} artist={artist} onTap={showNotice} />
                  ))}
                </div>
              )}
              <div className="space-y-0.5">
                {section.tracks.slice(0, 6).map((track) => (
                  <TrackRow key={track.id} track={track} onTap={showNotice} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="pt-2 text-center text-[11px] text-white/30">
        Guest mode is browse-only. Sign in to play music, like songs and build playlists.{" "}
        <Link href="/privacy" className="underline">
          Privacy
        </Link>
      </p>
    </div>
  );
}
