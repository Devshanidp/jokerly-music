"use client";

import { useState } from "react";
import { Pin, Loader2, ChevronDown, Music } from "lucide-react";
import Image from "next/image";
import { togglePinnedPlaylist, useLocalPlaylists } from "@/lib/local-playlists";
import DraggablePlaylist from "@/components/playlist/DraggablePlaylist";

export default function PinnedClient() {
  const pinned = useLocalPlaylists().filter((playlist) => playlist.pinned);
  const [unpinning, setUnpinning] = useState<string | null>(null);
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);

  const unpin = async (playlistId: string) => {
    setUnpinning(playlistId);
    togglePinnedPlaylist(playlistId);
    setUnpinning(null);
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <Pin size={28} className="text-red-400" /> Pinned Playlists
        </h2>
        <p className="text-zinc-400 mt-1">Your quick-access playlists</p>
      </div>

      {pinned.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Pin size={48} className="mx-auto mb-4 opacity-30" />
          <p>No pinned playlists yet.</p>
          <p className="text-sm mt-1">Pin playlists from the Playlists page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pinned.map((pl) => (
            <div
              key={pl.id}
              className="rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-colors group"
            >
              <div className="flex items-center gap-4 p-3">
                {pl.image ? (
                  <Image
                    src={pl.image}
                    alt={pl.name}
                    width={52}
                    height={52}
                    className="rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                    <Pin size={20} className="text-zinc-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{pl.name}</p>
                  <p className="text-zinc-500 text-xs">{pl.tracks.length} tracks</p>
                </div>

                <button
                  onClick={() => setOpenPlaylistId(openPlaylistId === pl.id ? null : pl.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  title="Show songs"
                >
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${openPlaylistId === pl.id ? "rotate-180" : ""}`}
                  />
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => unpin(pl.id)}
                    disabled={unpinning === pl.id}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                    title="Unpin"
                  >
                    {unpinning === pl.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Pin size={15} />
                    )}
                  </button>
                </div>
              </div>

              {openPlaylistId === pl.id && (
                <div className="px-3 pb-3">
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/70">
                    <div className="px-3 pt-3">
                      <DraggablePlaylist />
                    </div>
                    {pl.tracks.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-zinc-500">No songs added yet.</p>
                    ) : (
                      <ul className="max-h-56 overflow-y-auto divide-y divide-zinc-800">
                        {pl.tracks.map((track) => (
                          <li key={track.uri} className="px-3 py-2.5 flex items-center gap-2">
                            <Music size={13} className="text-zinc-500 shrink-0" />
                            <span className="text-sm text-zinc-200 truncate">{track.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
