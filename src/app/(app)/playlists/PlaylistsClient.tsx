"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBackHandler } from "@/hooks/useBackHandler";
import { createPortal } from "react-dom";
import { ListMusic, Plus, Pencil, Pin, Loader2, Check, Trash2, Music, Play, Trash, PlayCircle, GripVertical, ListPlus, ArrowLeft, FolderInput, UserCircle2, Mic2, Heart, Download, Users, X, LayoutGrid, List, Shuffle, Share2, Upload } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MusicPlaylist } from "@/types";
import Image from "next/image";
import { useToastStore } from "@/store/toast";
import { usePlayerStore, PlayableTrack } from "@/store/player";
import AddToPlaylistModal from "@/components/playlist/AddToPlaylistModal";
import AddFromPlaylistModal from "@/components/playlist/AddFromPlaylistModal";
import CreateMultiArtistPlaylistSheet from "@/components/playlist/CreateMultiArtistPlaylistSheet";
import EditMixArtistsSheet from "@/components/playlist/EditMixArtistsSheet";
import ArtistSheet from "@/components/music/ArtistSheet";
import { MusicArtist } from "@/types/music-catalog";
import { useLikesStore } from "@/store/likes";
import { isMixPlaylist, parseMixArtistRecords, parseMixArtists } from "@/lib/playlist-meta";
import { shuffleArray } from "@/lib/shuffle";
import PlaylistActionsMenu from "@/components/playlist/PlaylistActionsMenu";
import TrackDownloadButton from "@/components/playlist/TrackDownloadButton";
import SharePlaylistModal from "@/components/playlist/SharePlaylistModal";
import ImportSpotifyPlaylistsSheet from "@/components/playlist/ImportSpotifyPlaylistsSheet";
import ExportPlaylistSheet from "@/components/playlist/ExportPlaylistSheet";
import ExportToYouTubeMusicModal from "@/components/export/ExportToYouTubeMusicModal";
import { useOfflineStore } from "@/store/offline";

interface EditState { id: string; name: string; description: string; }
interface PinnedRow { playlist_id: string; }
type PlaylistViewMode = "grid" | "list";
const PLAYLIST_VIEW_KEY = "jokerly-playlist-view";

const playlistCardBorder = "border border-white/[0.12]";
interface PlaylistTrack { id: string; track_uri: string; track_name: string; track_image?: string | null; track_artist?: string | null; added_at: string; position: number; }
interface PinnedArtist { id: string; artist_id: string; artist_name: string; artist_image: string; }

// ── Sortable track row ──────────────────────────────────────────────────────
function SortableTrackRow({
  track, index, playlistId, onPlay, onRemove, onAddToPlaylist, removingKey,
}: {
  track: PlaylistTrack; index: number; playlistId: string;
  onPlay: () => void; onRemove: () => void; onAddToPlaylist: () => void; removingKey: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id });
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isCurrentlyPlaying = isPlaying && !!currentTrack?.uri && currentTrack.uri === track.track_uri;
  const { load: loadLikes, songUris, toggleSong } = useLikesStore();
  const isLiked = songUris.has(track.track_uri);
  useEffect(() => { loadLikes(); }, [loadLikes]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  const rmKey = `${playlistId}::${track.id}`;

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-2 px-3 py-2.5 group transition-colors cursor-pointer hover:bg-white/[0.03]"
      onClick={onPlay}
    >
      <button {...attributes} {...listeners} onClick={(e) => e.stopPropagation()}
        className="shrink-0 p-1 rounded cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors touch-none">
        <GripVertical size={14} />
      </button>
      <div className="w-5 shrink-0 flex items-center justify-center">
        {isCurrentlyPlaying ? (
          <div className="flex items-end gap-px h-4">
            <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
          </div>
        ) : (
          <>
            <span className="text-xs tabular-nums group-hover:hidden" style={{ color: "var(--text-muted)" }}>{index + 1}</span>
            <Play size={12} fill="currentColor" className="hidden group-hover:block text-[var(--accent)]" />
          </>
        )}
      </div>
      <div className="relative w-9 h-9 rounded-lg shrink-0 overflow-hidden" style={{ background: "var(--card)" }}>
        {track.track_image ? (
          <Image src={track.track_image} alt={track.track_name} fill unoptimized sizes="36px" className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={12} style={{ color: "var(--text-muted)" }} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate leading-tight ${isCurrentlyPlaying ? "text-[var(--accent)]" : "text-white"}`}>{track.track_name}</p>
        {track.track_artist && (
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{track.track_artist}</p>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onAddToPlaylist(); }}
        className="shrink-0 p-1.5 rounded-lg transition-all text-[var(--accent)]/50 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 sm:opacity-0 sm:group-hover:opacity-100">
        <ListPlus size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); toggleSong({ uri: track.track_uri, name: track.track_name, image: track.track_image ?? null, artist: track.track_artist ?? null }); }}
        title={isLiked ? "Unlike" : "Like"}
        className={`shrink-0 p-1.5 rounded-lg transition-all ${isLiked ? "text-[var(--accent)]" : "text-white/25 hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 sm:opacity-0 sm:group-hover:opacity-100"}`}
      >
        <Heart size={12} fill={isLiked ? "currentColor" : "none"} />
      </button>
      <TrackDownloadButton
        track={{
          uri: track.track_uri,
          name: track.track_name,
          artist: track.track_artist ?? "",
          image: track.track_image,
        }}
      />
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
        disabled={removingKey === rmKey}
        className="shrink-0 p-1.5 rounded-lg transition-all hover:bg-purple-500/10 hover:text-[var(--accent)] disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
        style={{ color: "rgba(255,255,255,0.25)" }}>
        {removingKey === rmKey ? <Loader2 size={12} className="animate-spin" /> : <Trash size={12} />}
      </button>
    </div>
  );
}

// ── Cover art: 2x2 grid or single image ─────────────────────────────────────
function CoverArt({ tracks, imageUrl, name, size = 160 }: { tracks?: PlaylistTrack[]; imageUrl?: string | null; name: string; size?: number }) {
  const imgs = [...new Set(
    (tracks ?? []).map((t) => t.track_image).filter(Boolean) as string[]
  )].slice(0, 4);

  if (imgs.length >= 2) {
    const cells = [...imgs, ...Array(4).fill(null)].slice(0, 4);
    return (
      <div className="w-full h-full overflow-hidden grid grid-cols-2">
        {cells.map((img, i) => (
          <div key={i} className="relative" style={{ background: "var(--surface)" }}>
            {img && <Image src={img} alt="" fill unoptimized sizes={`${size / 2}px`} className="object-cover" />}
          </div>
        ))}
      </div>
    );
  }
  if (imageUrl) {
    return <Image src={imageUrl} alt={name} fill unoptimized className="object-cover" sizes={`${size}px`} />;
  }
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--surface)" }}>
      <ListMusic size={size / 4} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PlaylistsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openPlaylistId = searchParams.get("id");
  const deepLinkHandled = useRef<string | null>(null);
  const [playlists, setPlaylists] = useState<MusicPlaylist[]>([]);
  const [viewMode, setViewMode] = useState<PlaylistViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showArtistMixSheet, setShowArtistMixSheet] = useState(false);
  const [showImportSpotify, setShowImportSpotify] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null);
  const [exportTarget, setExportTarget] = useState<{
    id: string;
    name: string;
    tracks: PlaylistTrack[];
  } | null>(null);
  const [youtubeExport, setYoutubeExport] = useState<{
    name: string;
    tracks: { name: string; artist: string }[];
  } | null>(null);
  const [exportLoadingId, setExportLoadingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [pinning, setPinning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracksMap, setTracksMap] = useState<Record<string, PlaylistTrack[]>>({});
  const [loadingTracks, setLoadingTracks] = useState<string | null>(null);
  const [removingTrack, setRemovingTrack] = useState<string | null>(null);
  const [addModal, setAddModal] = useState<{ name: string; uri: string; image?: string | null; artist?: string | null } | null>(null);
  const [addFromPlaylist, setAddFromPlaylist] = useState(false);
  const [editArtistsOpen, setEditArtistsOpen] = useState(false);
  const [pinnedArtists, setPinnedArtists] = useState<PinnedArtist[]>([]);
  const [removingPinnedArtist, setRemovingPinnedArtist] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<MusicArtist | null>(null);
  const [mounted, setMounted] = useState(false);
  const { toast } = useToastStore();
  const { setQueueAndPlay, currentTrack, isPlayerExpanded, deviceId } = usePlayerStore();
  const downloadPlaylistOffline = useOfflineStore((s) => s.downloadPlaylist);
  const [downloadingPlaylistId, setDownloadingPlaylistId] = useState<string | null>(null);
  const hasPlayer = currentTrack !== null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLAYLIST_VIEW_KEY);
      if (saved === "grid" || saved === "list") setViewMode(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setPlaylistViewMode = (mode: PlaylistViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(PLAYLIST_VIEW_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const selectedPlaylist = playlists.find((p) => p.id === selectedId) ?? null;

  const closePlaylistDetail = useCallback(() => {
    setSelectedId(null);
    setEdit(null);
    setAddFromPlaylist(false);
    // Drop ?id= so Back / Playlist nav shows the list, not the Magic Mix again
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("id")) {
      router.replace("/playlists", { scroll: false });
    }
  }, [router]);

  useBackHandler(!!selectedId, closePlaylistDetail);
  useBackHandler(showArtistMixSheet, () => setShowArtistMixSheet(false));
  useBackHandler(editArtistsOpen, () => setEditArtistsOpen(false));
  useBackHandler(!!addModal, () => setAddModal(null));
  useBackHandler(addFromPlaylist, () => setAddFromPlaylist(false));
  useBackHandler(!!edit, () => setEdit(null));

  const handleDragEnd = (event: DragEndEvent, playlistId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const tracks = tracksMap[playlistId] ?? [];
    const oldIdx = tracks.findIndex((t) => t.id === active.id);
    const newIdx = tracks.findIndex((t) => t.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(tracks, oldIdx, newIdx);
    setTracksMap((prev) => ({ ...prev, [playlistId]: reordered }));
    fetch(`/api/music/playlists/${playlistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((t) => t.id) }),
    }).catch(() => toast("Could not save order"));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [plRes, pinRes] = await Promise.all([
        fetch("/api/music/playlists", { cache: "no-store" }),
        fetch("/api/pinned", { cache: "no-store" }),
      ]);
      if (!plRes.ok) throw new Error("Failed to load playlists");
      const plData = await plRes.json();
      const pinData = (await pinRes.json()) as PinnedRow[];
      setPlaylists(plData.items ?? []);
      setPinned(new Set(pinData.map((p) => p.playlist_id)));
    } catch (e) {
      toast((e as Error).message ?? "Could not load playlists");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchTracks = useCallback(async (id: string) => {
    setLoadingTracks(id);
    try {
      const res = await fetch(`/api/music/playlists/${id}?_t=${Date.now()}`);
      const data = await res.json();
      const items = (data.items ?? []) as PlaylistTrack[];
      setTracksMap((prev) => ({ ...prev, [id]: items }));
      return items;
    } catch {
      setTracksMap((prev) => ({ ...prev, [id]: [] }));
      return [] as PlaylistTrack[];
    } finally {
      setLoadingTracks(null);
    }
  }, []);

  const openExportForPlaylist = useCallback(
    async (pl: MusicPlaylist) => {
      setExportLoadingId(pl.id);
      try {
        let list = tracksMap[pl.id];
        if (!list) {
          list = await fetchTracks(pl.id);
        }
        if (!list.length) {
          toast("No tracks to export — open the playlist and add songs first");
          return;
        }
        setExportTarget({ id: pl.id, name: pl.name, tracks: list });
      } finally {
        setExportLoadingId(null);
      }
    },
    [fetchTracks, tracksMap, toast]
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(id);
  }, [load]);

  // Open playlist from ?id=... once (e.g. after Magic Mix), then leave the list free
  useEffect(() => {
    if (!openPlaylistId || loading || playlists.length === 0) return;
    if (deepLinkHandled.current === openPlaylistId) return;
    if (!playlists.some((p) => p.id === openPlaylistId)) return;
    deepLinkHandled.current = openPlaylistId;
    setSelectedId(openPlaylistId);
  }, [openPlaylistId, loading, playlists]);

  // When ?id= is cleared (Back or Playlist nav), return to the list
  useEffect(() => {
    if (openPlaylistId) return;
    if (deepLinkHandled.current) {
      deepLinkHandled.current = null;
      setSelectedId(null);
      setEdit(null);
      setAddFromPlaylist(false);
    }
  }, [openPlaylistId]);

  useEffect(() => {
    const showList = () => closePlaylistDetail();
    window.addEventListener("playlists-show-list", showList);
    return () => window.removeEventListener("playlists-show-list", showList);
  }, [closePlaylistDetail]);

  useEffect(() => {
    const fetchPinnedArtists = () =>
      fetch("/api/pinned-artists").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setPinnedArtists(d); }).catch(() => {});
    fetchPinnedArtists();
    window.addEventListener("pinned-artists-updated", fetchPinnedArtists);
    return () => window.removeEventListener("pinned-artists-updated", fetchPinnedArtists);
  }, []);

  useEffect(() => {
    if (playlists.length === 0) return;
    playlists.forEach((pl) => {
      if (tracksMap[pl.id]) return;
      fetch(`/api/music/playlists/${pl.id}`)
        .then((r) => r.json())
        .then((data) => setTracksMap((prev) => ({ ...prev, [pl.id]: data.items ?? [] })))
        .catch(() => {});
    });
  }, [playlists, tracksMap]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { playlistId } = (e as CustomEvent<{ playlistId: string }>).detail;
      setPlaylists((prev) => prev.map((p) =>
        p.id === playlistId ? { ...p, tracks: { total: (p.tracks?.total ?? 0) + 1 } } : p
      ));
      if (selectedId === playlistId) fetchTracks(playlistId);
      else setTracksMap((prev) => { const n = { ...prev }; delete n[playlistId]; return n; });
    };
    window.addEventListener("playlist-updated", handler);
    return () => window.removeEventListener("playlist-updated", handler);
  }, [fetchTracks, selectedId]);

  const openPlaylist = (pl: MusicPlaylist) => {
    setSelectedId(pl.id);
    fetchTracks(pl.id);
  };

  const toPlayableQueue = (tracks: PlaylistTrack[]): PlayableTrack[] =>
    tracks.map((t) => ({
      name: t.track_name,
      artist: t.track_artist ?? "",
      image: t.track_image ?? undefined,
      uri: t.track_uri,
    }));

  const playTrack = (tracks: PlaylistTrack[], index: number) => {
    setQueueAndPlay(toPlayableQueue(tracks), index);
  };

  const shufflePlayPlaylist = async (tracks: PlaylistTrack[]) => {
    if (!tracks.length) return;
    const shuffled = shuffleArray(toPlayableQueue(tracks));
    usePlayerStore.setState({ shuffleEnabled: true });
    if (deviceId) {
      await fetch("/api/music/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "shuffle", deviceId, state: true }),
      }).catch(() => {});
    }
    setQueueAndPlay(shuffled, 0);
    toast("Shuffle play");
  };

  const downloadPlaylistOfflineTracks = async (playlistId: string, tracks: PlaylistTrack[]) => {
    if (!tracks.length) return;
    setDownloadingPlaylistId(playlistId);
    try {
      const { ok, fail } = await downloadPlaylistOffline(
        tracks.map((t) => ({
          uri: t.track_uri,
          name: t.track_name,
          artist: t.track_artist ?? "",
          image: t.track_image,
        }))
      );
      toast(
        fail > 0
          ? `Offline: ${ok} saved, ${fail} unavailable`
          : `Downloaded ${ok} tracks for offline`,
        ok > 0 ? "success" : "error"
      );
    } finally {
      setDownloadingPlaylistId(null);
    }
  };

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/music/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      });
      const created = (await res.json().catch(() => ({}))) as MusicPlaylist & { error?: string };
      if (!res.ok) throw new Error(created.error ?? "Failed to create playlist");

      setPlaylists((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      setTracksMap((prev) => ({ ...prev, [created.id]: prev[created.id] ?? [] }));
      toast("Playlist created");
      setNewName(""); setNewDesc(""); setCreating(false);
    } catch (e) {
      toast((e as Error).message ?? "Could not create playlist");
    } finally {
      setSaving(false);
    }
  };

  const handleArtistMixCreated = async (playlist: MusicPlaylist, addedCount: number) => {
    setPlaylists((prev) => [playlist, ...prev.filter((p) => p.id !== playlist.id)]);
    setSelectedId(playlist.id);
    await fetchTracks(playlist.id);
    if (addedCount === 0) {
      setTracksMap((prev) => ({ ...prev, [playlist.id]: [] }));
    }
  };

  const removePinnedArtist = async (artistId: string) => {
    setRemovingPinnedArtist(artistId);
    try {
      const res = await fetch("/api/pinned-artists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist_id: artistId }),
      });
      if (!res.ok) throw new Error("Failed to remove artist");
      setPinnedArtists((prev) => prev.filter((pa) => pa.artist_id !== artistId));
      window.dispatchEvent(new CustomEvent("pinned-artists-updated"));
      toast("Artist removed");
    } catch (e) {
      toast((e as Error).message ?? "Could not remove artist");
    } finally {
      setRemovingPinnedArtist(null);
    }
  };

  const handleArtistsSaved = async (
    playlistId: string,
    artists: { id: string; name: string }[],
    description: string,
    addedCount: number,
    removedCount: number
  ) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId
          ? {
              ...p,
              description,
              tracks: {
                total: Math.max(0, (p.tracks?.total ?? 0) + addedCount - removedCount),
              },
            }
          : p
      )
    );
    await fetchTracks(playlistId);
  };

  const fabBottomClass = isPlayerExpanded
    ? "bottom-6"
    : hasPlayer
      ? "bottom-[152px]"
      : "bottom-[72px]";

  const artistMixFab =
    mounted &&
    createPortal(
      <>
        <button
          type="button"
          onClick={() => setShowArtistMixSheet(true)}
          title="Mix artists into a playlist"
          aria-label="Mix artists into a playlist"
          className={`fixed right-4 z-[70] w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-[0_4px_20px_rgba(255,255,255,0.18),0_4px_14px_rgba(0,0,0,0.45)] hover:bg-white/95 transition-all active:scale-95 pointer-events-auto ${fabBottomClass}`}
        >
          <Plus size={24} strokeWidth={2.5} className="text-[var(--vinyl-black)]" />
        </button>
        <CreateMultiArtistPlaylistSheet
          open={showArtistMixSheet}
          onClose={() => setShowArtistMixSheet(false)}
          onCreated={handleArtistMixCreated}
        />
      </>,
      document.body
    );
  const removeTrack = async (playlistId: string, trackId: string) => {
    const key = `${playlistId}::${trackId}`;
    setRemovingTrack(key);
    try {
      const res = await fetch(`/api/music/playlists/${playlistId}/tracks`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });
      if (!res.ok) throw new Error("Failed to remove track");
      setTracksMap((prev) => ({ ...prev, [playlistId]: (prev[playlistId] ?? []).filter((t) => t.id !== trackId) }));
      setPlaylists((prev) => prev.map((p) =>
        p.id === playlistId ? { ...p, tracks: { total: Math.max(0, (p.tracks?.total ?? 1) - 1) } } : p
      ));
    } catch (e) {
      toast((e as Error).message ?? "Could not remove track");
    } finally {
      setRemovingTrack(null);
    }
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/music/playlists/${edit.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: edit.name, description: edit.description }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      // Update in place — no full reload needed, no skeleton flash.
      setPlaylists((prev) => prev.map((p) =>
        p.id === edit.id ? { ...p, name: edit.name, description: edit.description } : p
      ));
      setEdit(null);
    } catch (e) {
      toast((e as Error).message ?? "Could not save playlist");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (pl: MusicPlaylist) => {
    setPinning(pl.id);
    try {
      if (pinned.has(pl.id)) {
        await fetch("/api/pinned", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playlist_id: pl.id }) });
        setPinned((prev) => { const s = new Set(prev); s.delete(pl.id); return s; });
        window.dispatchEvent(new CustomEvent("pinned-playlists-updated"));
      } else {
        await fetch("/api/pinned", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ playlist_id: pl.id, playlist_name: pl.name, playlist_image: pl.images?.[0]?.url ?? "" }) });
        setPinned((prev) => new Set(prev).add(pl.id));
        window.dispatchEvent(new CustomEvent("pinned-playlists-updated"));
      }
    } catch (e) {
      toast((e as Error).message ?? "Could not update pin");
    } finally {
      setPinning(null);
    }
  };

  const removePlaylist = async (playlistId: string) => {
    if (!window.confirm("Delete this playlist?")) return;
    setDeleting((prev) => new Set(prev).add(playlistId));
    try {
      const res = await fetch(`/api/music/playlists/${playlistId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete playlist");
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
      setPinned((prev) => { const s = new Set(prev); s.delete(playlistId); return s; });
      if (selectedId === playlistId) setSelectedId(null);
    } catch (e) {
      toast((e as Error).message ?? "Could not delete playlist");
    } finally {
      setDeleting((prev) => { const s = new Set(prev); s.delete(playlistId); return s; });
    }
  };

  const handleDownloadM3U = (playlist: MusicPlaylist, playlistTracks: PlaylistTrack[]) => {
    const m3uContent = [
      "#EXTM3U",
      ...playlistTracks.map((track) => `#EXTINF:-1,${track.track_artist ?? "Unknown Artist"} - ${track.track_name}`),
    ].join("\n");

    const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${playlist.name.replace(/\s+/g, "_")}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("M3U file downloaded! You can now upload this to TuneMyMusic.");
  };

  // ── Detail view ─────────────────────────────────────────────────────────
  if (selectedId && selectedPlaylist) {
    const pl = selectedPlaylist;
    const mixArtists = parseMixArtists(pl.description);
    const mixArtistRecords = parseMixArtistRecords(pl.description);
    const isMix = isMixPlaylist(pl.description);
    const isPinned = pinned.has(pl.id);
    const tracks = tracksMap[pl.id] ?? [];
    const isLoadingTracks = loadingTracks === pl.id;

    return (
      <div className="w-full space-y-4">
        {/* Back + actions header */}
        <div className="flex items-center gap-3">
          <button
            onClick={closePlaylistDetail}
            className="flex items-center gap-1 text-[10px] sm:text-xs font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex-1" />
          <PlaylistActionsMenu
            isPinned={isPinned}
            pinning={pinning === pl.id}
            trackCount={tracks.length}
            downloadingPlaylist={downloadingPlaylistId === pl.id}
            onShufflePlay={() => shufflePlayPlaylist(tracks)}
            onTogglePin={() => togglePin(pl)}
            onDownloadOffline={() => downloadPlaylistOfflineTracks(pl.id, tracks)}
            onShare={() => setShareTarget({ id: pl.id, name: pl.name })}
            onExport={() => void openExportForPlaylist(pl)}
          />
          <button
            onClick={() => setShareTarget({ id: pl.id, name: pl.name })}
            title="Share link / QR"
            className="p-2 rounded-xl hover:bg-white/[0.07] transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <Share2 size={14} />
          </button>
          <button
            onClick={() => void openExportForPlaylist(pl)}
            disabled={tracks.length === 0 || exportLoadingId === pl.id}
            title="Export to YouTube Music & other apps"
            className="p-2 rounded-xl hover:bg-white/[0.07] transition-colors disabled:opacity-40 disabled:pointer-events-none"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            {exportLoadingId === pl.id ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          </button>
          <button onClick={() => setAddFromPlaylist(true)}
            title="Add tracks from another playlist"
            className="p-2 rounded-xl hover:bg-white/[0.07] transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            <FolderInput size={14} />
          </button>
          <button
            onClick={() => setEditArtistsOpen(true)}
            title={isMix ? "Edit mix artists" : "Add artists to mix"}
            className="p-2 rounded-xl hover:bg-white/[0.07] transition-colors"
            style={{ color: isMix ? "var(--accent)" : "rgba(255,255,255,0.4)", background: isMix ? "rgba(140, 80, 200,0.10)" : "transparent" }}
          >
            <Users size={14} />
          </button>
          <button onClick={() => setEdit({ id: pl.id, name: pl.name, description: pl.description ?? "" })}
            className="p-2 rounded-xl hover:bg-white/[0.07] transition-colors" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Pencil size={14} />
          </button>
          <button onClick={() => togglePin(pl)} disabled={pinning === pl.id}
            className="p-2 rounded-xl transition-colors"
            style={{ color: isPinned ? "var(--accent)" : "rgba(255,255,255,0.4)", background: isPinned ? "rgba(140, 80, 200,0.10)" : "transparent" }}>
            {pinning === pl.id ? <Loader2 size={14} className="animate-spin" /> : <Pin size={14} />}
          </button>
          <button onClick={() => removePlaylist(pl.id)} disabled={deleting.has(pl.id)}
            className="p-2 rounded-xl hover:bg-purple-500/10 hover:text-[var(--accent)] transition-colors disabled:opacity-40"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            {deleting.has(pl.id) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>

        {/* Cover + meta */}
        <div className="flex items-end gap-4">
          <div className="relative w-28 h-28 rounded-2xl overflow-hidden shrink-0 shadow-xl">
            <CoverArt tracks={tracks} imageUrl={pl.images?.[0]?.url} name={pl.name} size={112} />
          </div>
          <div className="flex-1 min-w-0 pb-1">
            {edit?.id === pl.id ? (
              <div className="space-y-2">
                <input autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  className="w-full border text-white rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]/60"
                  style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.08)" }} />
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving}
                    className="px-3 py-1.5 rounded-xl btn-accent text-white text-sm font-medium">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                  </button>
                  <button onClick={() => setEdit(null)}
                    className="px-3 py-1.5 rounded-xl text-sm border"
                    style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-white text-xl font-bold truncate">{pl.name}</p>
                {mixArtists.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setEditArtistsOpen(true)}
                    className="text-sm mt-0.5 truncate text-left w-full hover:text-white transition-colors"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {mixArtists.join(" · ")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditArtistsOpen(true)}
                    className="text-sm mt-0.5 text-left hover:text-white/70 transition-colors"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                  >
                    Add artists
                  </button>
                )}
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {tracks.length} tracks{isPinned ? " · Pinned" : ""}
                </p>
              </>
            )}
          </div>
        </div>

        {tracks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => playTrack(tracks, 0)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-white font-bold text-[10px] sm:text-xs transition-all active:scale-95 shadow-lg btn-accent"
            >
              <PlayCircle size={14} /> Play all
            </button>
            <button
              onClick={() => shufflePlayPlaylist(tracks)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/80 font-semibold text-[10px] sm:text-xs border border-white/10 hover:bg-white/[0.06] transition-all active:scale-95 btn-accent"
            >
              <Shuffle size={14} className="text-[var(--accent)]" /> Shuffle
            </button>
            <button
              onClick={() => downloadPlaylistOfflineTracks(pl.id, tracks)}
              disabled={downloadingPlaylistId === pl.id}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/80 font-semibold text-[10px] sm:text-xs border border-white/10 hover:bg-white/[0.06] transition-all active:scale-95 disabled:opacity-40 btn-accent"
            >
              {downloadingPlaylistId === pl.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Download offline
            </button>
          </div>
        )}

        {/* Track list */}
        <div className="rounded-2xl overflow-hidden border" style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.06)" }}>
          {isLoadingTracks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={14} className="animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
          ) : tracks.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>No tracks yet. Add songs from Search.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, pl.id)}>
              <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div>
                  {tracks.map((t, i) => (
                    <SortableTrackRow key={t.id} track={t} index={i} playlistId={pl.id}
                      onPlay={() => playTrack(tracks, i)}
                      onRemove={() => removeTrack(pl.id, t.id)}
                      onAddToPlaylist={() => setAddModal({ name: t.track_name, uri: t.track_uri, image: t.track_image, artist: t.track_artist })}
                      removingKey={removingTrack} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {addModal && <AddToPlaylistModal track={addModal} onClose={() => setAddModal(null)} />}
        {addFromPlaylist && selectedPlaylist && (
          <AddFromPlaylistModal
            targetPlaylistId={selectedPlaylist.id}
            targetPlaylistName={selectedPlaylist.name}
            onClose={() => setAddFromPlaylist(false)}
            onTracksAdded={() => fetchTracks(selectedPlaylist.id)}
          />
        )}
        <EditMixArtistsSheet
          key={pl.id}
          open={editArtistsOpen}
          playlistId={pl.id}
          playlistName={pl.name}
          initialArtists={mixArtistRecords}
          onClose={() => setEditArtistsOpen(false)}
          onSaved={(artists, description, addedCount, removedCount) => {
            void handleArtistsSaved(pl.id, artists, description, addedCount, removedCount);
          }}
        />
        {shareTarget && (
          <SharePlaylistModal
            open
            playlistId={shareTarget.id}
            playlistName={shareTarget.name}
            onClose={() => setShareTarget(null)}
          />
        )}
        {exportTarget && (
          <ExportPlaylistSheet
            open
            playlistName={exportTarget.name}
            trackCount={exportTarget.tracks.length}
            onClose={() => setExportTarget(null)}
            onExportYouTube={() => {
              const target = exportTarget;
              setExportTarget(null);
              setYoutubeExport({
                name: target.name,
                tracks: target.tracks.map((t) => ({
                  name: t.track_name,
                  artist: t.track_artist ?? "",
                })),
              });
            }}
            onDownloadM3U={() => {
              handleDownloadM3U(pl, exportTarget.tracks);
              setExportTarget(null);
            }}
          />
        )}
        {youtubeExport && (
          <ExportToYouTubeMusicModal
            title={youtubeExport.name}
            tracks={youtubeExport.tracks}
            onClose={() => setYoutubeExport(null)}
          />
        )}
        {artistMixFab}
      </div>
    );
  }

  // ── Grid view ────────────────────────────────────────────────────────────
  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white tracking-tight">Your Playlists</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {playlists.length > 0 ? `${playlists.length} playlist${playlists.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div
            className="flex items-center rounded-xl border border-white/[0.12] p-0.5"
            style={{ background: "var(--surface)" }}
            role="group"
            aria-label="Playlist layout"
          >
            <button
              type="button"
              onClick={() => setPlaylistViewMode("grid")}
              title="Grid view"
              aria-pressed={viewMode === "grid"}
              className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/70"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPlaylistViewMode("list")}
              title="List view"
              aria-pressed={viewMode === "list"}
              className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-white/[0.12] text-white" : "text-white/40 hover:text-white/70"}`}
            >
              <List size={14} />
            </button>
          </div>
          <button
            onClick={() => setShowImportSpotify(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/80 font-semibold text-sm transition-all active:scale-95 border border-white/[0.1] hover:bg-white/[0.06]"
          >
            <FolderInput size={14} /> Import
          </button>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all active:scale-95 shadow-lg btn-accent"
          >
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      {/* Create form */}
      {creating && (
        <div className="rounded-2xl p-5 space-y-3 border" style={{ background: "var(--surface)", borderColor: "rgba(240,165,0,0.20)" }}>
          <h3 className="text-white font-semibold text-sm">New playlist</h3>
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            className="w-full border text-white placeholder-white/25 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]/60 transition-all btn-accent"
            style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.08)" }} />
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full border text-white placeholder-white/25 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]/60 transition-all btn-accent"
            style={{ background: "var(--card)", borderColor: "rgba(255,255,255,0.08)" }} />
          <div className="flex gap-2">
            <button type="button" onClick={createPlaylist} disabled={saving || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl btn-accent hover:opacity-90 disabled:opacity-40 text-white font-semibold text-sm transition-colors btn-accent">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Create
            </button>
            <button onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}
              className="px-4 py-2 rounded-xl text-sm transition-colors btn-accent"
              style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Skeleton */}
      {loading ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={`rounded-lg overflow-hidden animate-pulse ${playlistCardBorder}`} style={{ background: "var(--card)" }}>
                <div className="aspect-square" style={{ background: "var(--surface)" }} />
                <div className="p-1.5 space-y-1 border-t border-white/[0.08]">
                  <div className="h-2 rounded-full w-3/4" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <div className="h-1.5 rounded-full w-1/2" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`rounded-xl overflow-hidden divide-y divide-white/[0.08] ${playlistCardBorder}`} style={{ background: "var(--card)" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 animate-pulse">
                <div className="w-10 h-10 rounded-md shrink-0" style={{ background: "var(--surface)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded-full w-2/3" style={{ background: "rgba(255,255,255,0.07)" }} />
                  <div className="h-2.5 rounded-full w-1/3" style={{ background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : playlists.length === 0 ? (
        <div className="text-center py-24" style={{ color: "var(--text-muted)" }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--card)" }}>
            <ListMusic size={28} className="opacity-30" />
          </div>
          <p className="text-sm font-medium">No playlists yet</p>
          <p className="text-xs mt-1 opacity-60">Import from Spotify, tap + to mix artists, or New for an empty playlist</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {playlists.map((pl) => {
            const mixArtists = parseMixArtists(pl.description);
            const isPinned = pinned.has(pl.id);
            const isDeleting = deleting.has(pl.id);
            const tracks = tracksMap[pl.id];

            return (
              <div
                key={pl.id}
                onClick={() => !isDeleting && openPlaylist(pl)}
                className={`rounded-lg overflow-visible ${playlistCardBorder} cursor-pointer transition-all duration-200 active:scale-[0.98] ${isDeleting ? "opacity-40 pointer-events-none" : "hover:border-white/25 hover:bg-white/[0.02]"}`}
                style={{ background: "var(--card)" }}
              >
                <div className="relative aspect-square w-full overflow-hidden border-b border-white/[0.08] rounded-t-lg" style={{ background: "var(--surface)" }}>
                  <CoverArt tracks={tracks} imageUrl={pl.images?.[0]?.url} name={pl.name} size={56} />
                  {isPinned && (
                    <span className="absolute top-1 left-1 z-10 w-2 h-2 rounded-full bg-[var(--accent)] border border-black/30 shadow" />
                  )}
                  <div
                    className="absolute inset-0 z-[1] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: "rgba(0,0,0,0.35)" }}
                  >
                    <div className="w-6 h-6 rounded-full btn-accent border border-purple-500/20 flex items-center justify-center shadow-lg pointer-events-none">
                      <Play size={10} fill="white" className="text-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-1.5 flex items-start gap-1 relative z-20">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[10px] font-semibold truncate leading-tight">{pl.name}</p>
                    {mixArtists.length > 0 && (
                      <p className="text-[9px] mt-0.5 truncate leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {mixArtists.join(" · ")}
                      </p>
                    )}
                    <p className="text-[9px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {pl.tracks?.total ?? 0} tracks
                    </p>
                  </div>
                  <PlaylistActionsMenu
                    variant="card"
                    isPinned={isPinned}
                    pinning={pinning === pl.id}
                    trackCount={tracks?.length ?? pl.tracks?.total ?? 0}
                    downloadingPlaylist={downloadingPlaylistId === pl.id}
                    onShufflePlay={() => {
                      const list = tracksMap[pl.id] ?? [];
                      if (list.length) shufflePlayPlaylist(list);
                      else toast("Open playlist to load tracks first");
                    }}
                    onTogglePin={() => togglePin(pl)}
                    onDownloadOffline={() => {
                      const list = tracksMap[pl.id] ?? [];
                      if (list.length) downloadPlaylistOfflineTracks(pl.id, list);
                      else toast("Open playlist to load tracks first");
                    }}
                    onShare={() => setShareTarget({ id: pl.id, name: pl.name })}
                    onExport={() => void openExportForPlaylist(pl)}
                    onOpen={() => openPlaylist(pl)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className={`rounded-xl overflow-hidden divide-y divide-white/[0.10] ${playlistCardBorder}`}
          style={{ background: "var(--card)" }}
        >
          {playlists.map((pl) => {
            const mixArtists = parseMixArtists(pl.description);
            const isPinned = pinned.has(pl.id);
            const isDeleting = deleting.has(pl.id);
            const tracks = tracksMap[pl.id];

            return (
              <div
                key={pl.id}
                onClick={() => !isDeleting && openPlaylist(pl)}
                className={`flex items-center gap-2.5 p-2.5 cursor-pointer transition-colors ${isDeleting ? "opacity-40 pointer-events-none" : "hover:bg-white/[0.04]"}`}
              >
                <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 border border-white/[0.10]" style={{ background: "var(--surface)" }}>
                  <CoverArt tracks={tracks} imageUrl={pl.images?.[0]?.url} name={pl.name} size={40} />
                  {isPinned && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] border border-black/20 shadow" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{pl.name}</p>
                  {mixArtists.length > 0 && (
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {mixArtists.join(" · ")}
                    </p>
                  )}
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {pl.tracks?.total ?? 0} tracks
                  </p>
                </div>
                <PlaylistActionsMenu
                  isPinned={isPinned}
                  pinning={pinning === pl.id}
                  trackCount={tracks?.length ?? pl.tracks?.total ?? 0}
                  downloadingPlaylist={downloadingPlaylistId === pl.id}
                  onShufflePlay={() => {
                    const list = tracksMap[pl.id] ?? [];
                    if (list.length) shufflePlayPlaylist(list);
                    else toast("Open playlist to load tracks first");
                  }}
                  onTogglePin={() => togglePin(pl)}
                  onDownloadOffline={() => {
                    const list = tracksMap[pl.id] ?? [];
                    if (list.length) downloadPlaylistOfflineTracks(pl.id, list);
                    else toast("Open playlist to load tracks first");
                  }}
                  onShare={() => setShareTarget({ id: pl.id, name: pl.name })}
                  onExport={() => void openExportForPlaylist(pl)}
                  onOpen={() => openPlaylist(pl)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Pinned Artists */}
      {pinnedArtists.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-white font-bold text-base flex items-center gap-2">
            <UserCircle2 size={14} className="text-[var(--accent)]" /> Pinned Artists
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {pinnedArtists.map((pa) => (
              <div key={pa.id} className="relative shrink-0 group" style={{ width: 72 }}>
                <button
                  type="button"
                  onClick={() => setSelectedArtist({ id: pa.artist_id, name: pa.artist_name, images: pa.artist_image ? [{ url: pa.artist_image }] : [], followers: { total: 0 }, genres: [], external_urls: { web: "" }, popularity: 0, type: "artist", uri: "" } as MusicArtist)}
                  className="flex flex-col items-center gap-1.5 w-full"
                >
                  <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white/[0.06] ring-2 ring-white/[0.05] group-hover:ring-[var(--accent)]//40 transition-all">
                    {pa.artist_image ? (
                      <Image src={pa.artist_image} alt={pa.artist_name} fill unoptimized sizes="64px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Mic2 size={14} className="text-white/20" />
                      </div>
                    )}
                    <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border border-black/20 shadow" />
                  </div>
                  <p className="text-[10px] text-white/45 group-hover:text-white transition-colors text-center truncate w-full leading-tight">{pa.artist_name}</p>
                </button>
                <button
                  type="button"
                  title="Remove artist"
                  disabled={removingPinnedArtist === pa.artist_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    void removePinnedArtist(pa.artist_id);
                  }}
                  className="absolute top-0 right-0 z-10 w-5 h-5 rounded-full bg-black/70 border border-white/10 text-white/70 hover:text-white hover:bg-purple-600/80 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  {removingPinnedArtist === pa.artist_id ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <X size={10} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {addModal && <AddToPlaylistModal track={addModal} onClose={() => setAddModal(null)} />}
      {selectedArtist && <ArtistSheet artist={selectedArtist} onClose={() => setSelectedArtist(null)} />}
      {shareTarget && (
        <SharePlaylistModal
          open
          playlistId={shareTarget.id}
          playlistName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
      {exportTarget && (
        <ExportPlaylistSheet
          open
          playlistName={exportTarget.name}
          trackCount={exportTarget.tracks.length}
          onClose={() => setExportTarget(null)}
          onExportYouTube={() => {
            const pl = exportTarget;
            setExportTarget(null);
            setYoutubeExport({
              name: pl.name,
              tracks: pl.tracks.map((t) => ({
                name: t.track_name,
                artist: t.track_artist ?? "",
              })),
            });
          }}
          onDownloadM3U={() => {
            const plMeta = playlists.find((p) => p.id === exportTarget.id);
            if (plMeta) handleDownloadM3U(plMeta, exportTarget.tracks);
            setExportTarget(null);
          }}
        />
      )}
      {youtubeExport && (
        <ExportToYouTubeMusicModal
          title={youtubeExport.name}
          tracks={youtubeExport.tracks}
          onClose={() => setYoutubeExport(null)}
        />
      )}
      <ImportSpotifyPlaylistsSheet
        open={showImportSpotify}
        onClose={() => setShowImportSpotify(false)}
        onImported={(pl, pinnedNow) => {
          setPlaylists((prev) => [pl, ...prev.filter((p) => p.id !== pl.id)]);
          if (pinnedNow) {
            setPinned((prev) => new Set(prev).add(pl.id));
            window.dispatchEvent(new Event("pinned-playlists-updated"));
          }
          setSelectedId(pl.id);
        }}
      />
      {artistMixFab}
    </div>
  );
}
