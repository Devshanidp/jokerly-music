"use client";

import { useEffect, useRef, useState } from "react";
import { PlayableTrack, usePlayerStore } from "@/store/player";
import { useToastStore } from "@/store/toast";
import { useBackHandler } from "@/hooks/useBackHandler";
import { ChevronDown, Music, Trash2, Play, Pause, GripVertical, Sparkles, ListPlus, Loader2, X } from "lucide-react";
import TrackDownloadButton from "@/components/playlist/TrackDownloadButton";
import SimilarMusicSection from "@/components/player/SimilarMusicSection";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props {
  onPlayIndex: (index: number) => boolean | void;
}

function defaultQueuePlaylistName() {
  const d = new Date();
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Saved queue · ${label}`;
}

function SortableTrack({
  track,
  index,
  isCurrent,
  isCurrentlyPlaying,
  onPlay,
  onRemove,
}: {
  track: { name: string; artist: string; image?: string | null; uri?: string | null };
  index: number;
  isCurrent: boolean;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${track.uri ?? track.name}-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onPlay}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl cursor-pointer transition-all border group ${
        isCurrent
          ? "bg-[var(--accent)]/10 border-[var(--accent)]/20"
          : "border-transparent hover:bg-white/[0.05] hover:border-white/[0.06]"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 p-0.5 text-white/15 hover:text-white/40 transition-colors touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>

      <span className={`text-xs w-5 text-right shrink-0 tabular-nums font-medium ${isCurrent ? "text-[var(--accent)]" : "text-white/25"}`}>
        {index + 1}
      </span>

      <div className="relative shrink-0 w-10 h-10">
        {track.image ? (
          <Image src={track.image} alt={track.name} fill unoptimized className="rounded-xl object-cover" sizes="40px" />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--card)" }}>
            <Music size={14} className="text-white/20" />
          </div>
        )}
        <div className={`absolute inset-0 rounded-xl flex items-center justify-center bg-black/50 transition-opacity ${isCurrent ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          {isCurrentlyPlaying
            ? <Pause size={12} fill="white" className="text-white" />
            : <Play size={12} fill="white" className="text-white" />
          }
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate leading-tight ${isCurrent ? "text-[var(--accent)]" : "text-white"}`}>
          {track.name}
        </p>
        <p className="text-xs text-white/40 truncate mt-0.5">{track.artist}</p>
      </div>

      <TrackDownloadButton
        track={{
          uri: track.uri ?? "",
          name: track.name,
          artist: track.artist,
          image: track.image,
        }}
        size={13}
        alwaysVisible
        className="rounded-xl"
      />

      <button
        onClick={onRemove}
        className="shrink-0 p-1.5 rounded-lg text-white/20 hover:text-[var(--accent)] hover:bg-purple-500/10 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function SaveQueueModal({
  trackCount,
  defaultName,
  onClose,
  onSaved,
}: {
  trackCount: number;
  defaultName: string;
  onClose: () => void;
  onSaved: (playlistId: string) => void;
}) {
  useBackHandler(true, onClose);
  const { toast } = useToastStore();
  const queue = usePlayerStore((s) => s.queue);
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;

    const tracks = queue
      .filter((t) => Boolean(t.uri))
      .map((t) => ({
        uri: t.uri as string,
        name: t.name,
        artist: t.artist,
        image: t.image ?? null,
      }));

    if (!tracks.length) {
      toast("No playable tracks in queue to save");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/music/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: "Saved from queue",
          tracks,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed (${res.status})`);

      const added = typeof data.addedCount === "number" ? data.addedCount : tracks.length;
      toast(`Saved ${added} tracks to “${trimmed}”`, "success");
      window.dispatchEvent(new CustomEvent("playlist-updated", { detail: { playlistId: data.id } }));
      onSaved(String(data.id));
    } catch (e) {
      toast((e as Error).message || "Could not save queue");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="theme-dark fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 p-4 space-y-4 shadow-2xl"
        style={{ background: "#111827" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-white font-semibold">Save queue as playlist</h3>
            <p className="text-xs text-white/40 mt-0.5">{trackCount} tracks</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
          }}
          placeholder="Playlist name"
          className="w-full px-3 py-2.5 rounded-xl text-sm border border-white/[0.08] bg-white/[0.03] text-white placeholder-white/25 outline-none focus:border-[var(--accent)]/50"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-white/55 hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold btn-accent text-white disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ListPlus size={14} />}
            {saving ? "Saving…" : "Save playlist"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QueueSheet({ onPlayIndex }: Props) {
  const {
    queue,
    queueIndex,
    isPlaying,
    removeFromQueue,
    reorderQueue,
    currentTrack,
    queueSheetTab: tab,
    isQueueOpen,
  } = usePlayerStore();
  const setTab = (next: "queue" | "similar") =>
    usePlayerStore.setState({ queueSheetTab: next });
  const activeRef = useRef<HTMLDivElement | null>(null);
  const [similarSeed, setSimilarSeed] = useState<PlayableTrack | null>(null);
  const [showSave, setShowSave] = useState(false);
  const prevOpenRef = useRef(false);
  const prevTabRef = useRef(tab);

  const savableCount = queue.filter((t) => Boolean(t.uri)).length;

  useEffect(() => {
    const justOpened = isQueueOpen && !prevOpenRef.current;
    const switchedToSimilar = tab === "similar" && prevTabRef.current !== "similar";

    if (isQueueOpen && (justOpened || switchedToSimilar) && tab === "similar" && currentTrack) {
      setSimilarSeed({ ...currentTrack });
    }

    prevOpenRef.current = isQueueOpen;
    prevTabRef.current = tab;
  }, [isQueueOpen, tab, currentTrack]);

  const seedTrack = similarSeed ?? currentTrack;
  const seedKey = seedTrack
    ? `${seedTrack.uri ?? ""}::${seedTrack.name}::${seedTrack.artist}`
    : "none";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = queue.map((t, i) => `${t.uri ?? t.name}-${i}`);
    const fromIndex = ids.indexOf(active.id as string);
    const toIndex = ids.indexOf(over.id as string);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderQueue(fromIndex, toIndex);
    }
  }

  return (
    <div
      className="theme-dark fixed inset-0 z-[55] flex flex-col"
      style={{ background: "#111827", backdropFilter: "blur(28px)" }}
    >
      <div className="px-5 pt-5 pb-3 shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-white font-bold text-lg">
              {tab === "queue" ? "Queue" : "Similar"}
            </h2>
            <p className="text-xs text-white/30 mt-0.5">
              {tab === "queue"
                ? `${queue.length} track${queue.length !== 1 ? "s" : ""}`
                : seedTrack
                  ? `Like ${seedTrack.name}`
                  : "Based on now playing"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {tab === "queue" && savableCount > 0 && (
              <button
                type="button"
                onClick={() => setShowSave(true)}
                title="Save queue as playlist"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              >
                <ListPlus size={13} />
                Save
              </button>
            )}
            <button
              onClick={() => usePlayerStore.setState({ isQueueOpen: false })}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="flex gap-2 p-1 rounded-xl" style={{ background: "var(--card)" }}>
          <button
            type="button"
            onClick={() => setTab("queue")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === "queue" ? "btn-nav-active text-white" : "text-white/45 hover:text-white"
            }`}
          >
            Queue
          </button>
          <button
            type="button"
            onClick={() => setTab("similar")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
              tab === "similar" ? "btn-nav-active text-white" : "text-white/45 hover:text-white"
            }`}
          >
            <Sparkles size={12} /> Similar
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <div
          className={`absolute inset-0 overflow-y-auto px-3 pb-6 space-y-0.5 ${
            tab === "queue" ? "" : "hidden"
          }`}
          aria-hidden={tab !== "queue"}
        >
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Music size={32} className="text-white/10" />
              <p className="text-sm text-white/30">Queue is empty</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={queue.map((t, i) => `${t.uri ?? t.name}-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {queue.map((track, i) => {
                  const isCurrent = i === queueIndex;
                  const isCurrentlyPlaying = isCurrent && isPlaying;

                  return (
                    <div key={`${track.uri ?? track.name}-${i}`} ref={isCurrent ? activeRef : null}>
                      <SortableTrack
                        track={track}
                        index={i}
                        isCurrent={isCurrent}
                        isCurrentlyPlaying={isCurrentlyPlaying}
                        onPlay={() => {
                          const didStart = onPlayIndex(i);
                          if (didStart !== false) {
                            window.requestAnimationFrame(() => {
                              usePlayerStore.setState({ isQueueOpen: false });
                            });
                          }
                        }}
                        onRemove={(e) => { e.stopPropagation(); removeFromQueue(i); }}
                      />
                    </div>
                  );
                })}
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div
          className={`absolute inset-0 flex flex-col px-3 pb-4 ${
            tab === "similar" ? "" : "hidden"
          }`}
          aria-hidden={tab !== "similar"}
        >
          {seedTrack ? (
            <SimilarMusicSection key={seedKey} track={seedTrack} variant="sheet" />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Sparkles size={28} className="text-white/10" />
              <p className="text-sm text-white/30">Play a song to see similar music</p>
            </div>
          )}
        </div>
      </div>

      {showSave && (
        <SaveQueueModal
          trackCount={savableCount}
          defaultName={defaultQueuePlaylistName()}
          onClose={() => setShowSave(false)}
          onSaved={() => {
            setShowSave(false);
            usePlayerStore.setState({ isQueueOpen: false });
          }}
        />
      )}
    </div>
  );
}
