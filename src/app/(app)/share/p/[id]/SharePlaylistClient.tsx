"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Music, Pin, Plus } from "lucide-react";
import { useToastStore } from "@/store/toast";

interface ShareTrack {
  uri: string;
  name: string;
  image: string | null;
  artist: string | null;
}

interface SharePayload {
  id: string;
  name: string;
  description: string;
  image: string;
  ownerId: string;
  trackCount: number;
  tracks: ShareTrack[];
}

export default function SharePlaylistClient({ playlistId }: { playlistId: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToastStore();
  const [data, setData] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/music/playlists/${playlistId}/share`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Playlist not found");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  // Owner → open in their playlists view
  useEffect(() => {
    if (!data || status !== "authenticated") return;
    const userId = session?.userId;
    if (userId && userId === data.ownerId) {
      router.replace(`/playlists?id=${encodeURIComponent(data.id)}`);
    }
  }, [data, status, session, router]);

  const saveToLibrary = async (pin: boolean) => {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/share/p/${playlistId}`)}`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/music/playlists/${playlistId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save playlist");
      toast(pin ? "Saved & pinned" : "Saved to your playlists");
      router.push(`/playlists?id=${encodeURIComponent(json.id)}`);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-white/40">
        <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
        <p className="text-sm">Opening shared mix…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto pt-10 px-4 text-center space-y-4">
        <Music size={32} className="mx-auto text-white/25" />
        <h1 className="text-xl font-bold text-white">Mix not found</h1>
        <p className="text-sm text-white/45">{error || "This share link may be invalid."}</p>
        <Link href="/playlists" className="inline-flex items-center gap-2 text-sm text-[var(--accent)]">
          <ArrowLeft size={14} /> Back to playlists
        </Link>
      </div>
    );
  }

  const cover = data.image || data.tracks[0]?.image;

  return (
    <div className="max-w-lg mx-auto w-full space-y-5 pt-2 pb-8">
      <Link href="/playlists" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:opacity-80 transition-opacity">
        <ArrowLeft size={14} /> Playlists
      </Link>

      <div className="flex items-end gap-4">
        <div className="relative w-28 h-28 rounded-2xl overflow-hidden shrink-0 shadow-xl bg-white/[0.06]">
          {cover ? (
            <Image src={cover} alt="" fill className="object-cover" sizes="112px" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={28} className="text-white/25" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 pb-1">
          <p className="text-[10px] uppercase tracking-widest text-white/35 font-semibold mb-1">Shared mix</p>
          <h1 className="text-2xl font-bold text-white leading-tight line-clamp-2">{data.name}</h1>
          <p className="text-xs text-white/40 mt-1">{data.trackCount} tracks</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveToLibrary(false)}
          className="flex-1 flex items-center justify-center gap-2 rounded-2xl btn-accent py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {status === "authenticated" ? "Save to my playlists" : "Log in to save"}
        </button>
        <button
          type="button"
          disabled={saving || status !== "authenticated"}
          onClick={() => void saveToLibrary(true)}
          title="Save and pin"
          className="px-4 rounded-2xl border border-white/[0.1] text-white/70 hover:text-[var(--accent)] hover:bg-white/[0.05] disabled:opacity-40 transition-colors"
        >
          <Pin size={16} />
        </button>
      </div>

      <ul className="rounded-2xl border border-white/[0.08] overflow-hidden divide-y divide-white/[0.06]" style={{ background: "var(--card)" }}>
        {data.tracks.slice(0, 40).map((t, i) => (
          <li key={`${t.uri}-${i}`} className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-5 text-[10px] text-white/25 text-right tabular-nums">{i + 1}</span>
            <div className="relative w-9 h-9 rounded-md overflow-hidden shrink-0 bg-white/[0.05]">
              {t.image ? (
                <Image src={t.image} alt="" fill className="object-cover" sizes="36px" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music size={12} className="text-white/20" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">{t.name}</p>
              <p className="text-[11px] text-white/40 truncate">{t.artist || "Unknown"}</p>
            </div>
          </li>
        ))}
        {data.tracks.length > 40 && (
          <li className="px-3 py-2.5 text-center text-xs text-white/35">
            +{data.tracks.length - 40} more tracks
          </li>
        )}
      </ul>
    </div>
  );
}
