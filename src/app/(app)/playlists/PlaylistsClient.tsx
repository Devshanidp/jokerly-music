"use client";

import { useState } from "react";
import { ListMusic, Plus, Pencil, Pin, Loader2, X, Check, Trash2, ChevronDown, Music } from "lucide-react";
import Image from "next/image";
import {
  createLocalPlaylist,
  deleteLocalPlaylist,
  togglePinnedPlaylist,
  updateLocalPlaylist,
  useLocalPlaylists,
} from "@/lib/local-playlists";

interface EditState {
  id: string;
  name: string;
  description: string;
}

export default function PlaylistsClient() {
  const playlists = useLocalPlaylists();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);

  const createPlaylist = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    createLocalPlaylist(newName.trim(), newDesc.trim());
    setNewName("");
    setNewDesc("");
    setCreating(false);
    setSaving(false);
  };

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    updateLocalPlaylist(edit.id, { name: edit.name, description: edit.description });
    setEdit(null);
    setSaving(false);
  };

  const togglePin = async (playlistId: string) => {
    setPinning(playlistId);
    togglePinnedPlaylist(playlistId);
    setPinning(null);
  };

  const removePlaylist = async (playlistId: string) => {
    const ok = window.confirm("Delete this local playlist?");
    if (!ok) return;

    setSaving(true);
    deleteLocalPlaylist(playlistId);
    setSaving(false);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <ListMusic size={28} /> Playlists
          </h2>
          <p className="text-zinc-400 mt-1">Create, edit and pin your playlists</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-black font-semibold text-sm transition-colors"
        >
          <Plus size={16} /> New Playlist
        </button>
      </div>

      {creating && (
        <div className="bg-zinc-800 rounded-2xl p-5 space-y-3 border border-zinc-700">
          <h3 className="text-white font-semibold">Create new playlist</h3>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            className="w-full bg-zinc-700 text-white placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-zinc-700 text-white placeholder-zinc-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex gap-2">
            <button
              onClick={createPlaylist}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-black font-semibold text-sm"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Create
            </button>
            <button
              onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}
              className="px-4 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {playlists.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <ListMusic size={48} className="mx-auto mb-4 opacity-30" />
          <p>No playlists yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {playlists.map((pl) => (
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
                  <div className="w-13 h-13 rounded-lg bg-zinc-700 flex items-center justify-center shrink-0 w-[52px] h-[52px]">
                    <ListMusic size={20} className="text-zinc-500" />
                  </div>
                )}

                {edit?.id === pl.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      className="flex-1 bg-zinc-700 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <input
                      value={edit.description}
                      onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                      placeholder="Description"
                      className="flex-1 bg-zinc-700 text-white placeholder-zinc-400 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-black text-sm font-medium"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                      onClick={() => setEdit(null)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate block">{pl.name}</p>
                    <p className="text-zinc-400 text-xs">
                      {pl.tracks.length} tracks · Local playlist
                    </p>
                  </div>
                )}

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

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() =>
                      setEdit({ id: pl.id, name: pl.name, description: pl.description ?? "" })
                    }
                    className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => togglePin(pl.id)}
                    disabled={pinning === pl.id}
                    className={`p-2 rounded-lg transition-colors ${
                      pl.pinned
                        ? "text-red-400 hover:text-white bg-zinc-700"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-700"
                    }`}
                    title={pl.pinned ? "Unpin" : "Pin"}
                  >
                    {pinning === pl.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Pin size={15} />
                    )}
                  </button>
                  <button
                    onClick={() => removePlaylist(pl.id)}
                    disabled={saving}
                    className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {openPlaylistId === pl.id && (
                <div className="px-3 pb-3">
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/70">
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
