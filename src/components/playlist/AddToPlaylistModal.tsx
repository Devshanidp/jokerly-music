"use client";

import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { addTrackToLocalPlaylist, createLocalPlaylist, useLocalPlaylists } from "@/lib/local-playlists";

interface PlaylistTrackPayload {
  name: string;
  uri: string;
}

interface Props {
  track: PlaylistTrackPayload;
  onClose: () => void;
}

export default function AddToPlaylistModal({ track, onClose }: Props) {
  const playlists = useLocalPlaylists();
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name) return;

    const created = createLocalPlaylist(name, newDesc.trim());
    setNewName("");
    setNewDesc("");
    await addToPlaylist(created.id);
  };

  const addToPlaylist = async (playlistId: string) => {
    setAdding(playlistId);
    addTrackToLocalPlaylist(playlistId, { uri: track.uri, name: track.name });
    setAdded((prev) => new Set(prev).add(playlistId));
    setAdding(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-zinc-800">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h3 className="text-white font-semibold">Add to playlist</h3>
            <p className="text-zinc-400 text-xs mt-0.5 truncate">{track.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          {playlists.length === 0 ? (
            <div className="space-y-3 py-3">
              <p className="text-zinc-500 text-sm text-center">No playlists found. Create one now.</p>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name"
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={createAndAdd}
                disabled={!newName.trim()}
                className="w-full px-3 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-black text-sm font-semibold transition-colors"
              >
                Create playlist and add song
              </button>
            </div>
          ) : (
            playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => addToPlaylist(pl.id)}
                disabled={!!adding || added.has(pl.id)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-left transition-colors disabled:opacity-60"
              >
                <span className="text-white text-sm truncate">{pl.name}</span>
                {added.has(pl.id) ? (
                  <Check size={16} className="text-red-400 shrink-0" />
                ) : adding === pl.id ? (
                  <Loader2 size={16} className="animate-spin text-zinc-400 shrink-0" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
