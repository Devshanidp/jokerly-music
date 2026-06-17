"use client";

import { useEffect, useState } from "react";
import { Pin, Loader2, Music } from "lucide-react";
import { PinnedAlbum, PinnedPlaylist } from "@/types";
import Image from "next/image";
import AlbumSheet from "@/components/music/AlbumSheet";

export default function PinnedClient() {
  const [pinned, setPinned] = useState<PinnedPlaylist[]>([]);
  const [pinnedAlbums, setPinnedAlbums] = useState<PinnedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [unpinning, setUnpinning] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<{ id: string; name: string; images: { url: string }[]; release_date: string; artists: { id: string; name: string; external_urls: { web: string } }[]; external_urls: { web: string }; total_tracks: number; album_type: string; uri: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [playlistRes, albumRes] = await Promise.all([
      fetch("/api/pinned"),
      fetch("/api/pinned-albums").catch(() => null),
    ]);
    const playlistData = playlistRes.ok ? await playlistRes.json() : [];
    const albumData = albumRes && albumRes.ok ? await albumRes.json() : [];
    setPinned(Array.isArray(playlistData) ? playlistData : []);
    setPinnedAlbums(Array.isArray(albumData) ? albumData : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unpin = async (playlistId: string) => {
    setUnpinning(playlistId);
    await fetch("/api/pinned", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlist_id: playlistId }),
    });
    setPinned((prev) => prev.filter((p) => p.playlist_id !== playlistId));
    setUnpinning(null);
  };

  const unpinAlbum = async (albumId: string) => {
    setUnpinning(albumId);
    await fetch("/api/pinned-albums", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album_id: albumId }),
    });
    setPinnedAlbums((prev) => prev.filter((album) => album.album_id !== albumId));
    setUnpinning(null);
  };

  return (
    <>
    <div className="w-full space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <Pin size={28} className="text-red-400" /> Pinned
        </h2>
        <p className="text-zinc-400 mt-1">Your quick-access music shortcuts</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pinned.length === 0 && pinnedAlbums.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Pin size={48} className="mx-auto mb-4 opacity-30" />
          <p>No pinned items yet.</p>
          <p className="text-sm mt-1">Pin playlists or albums to reach them faster.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pinnedAlbums.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <Music size={18} className="text-red-400" /> Pinned Albums
              </h3>
              <div className="space-y-2">
                {pinnedAlbums.map((album) => (
                  <div
                    key={album.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-colors group cursor-pointer"
                    onClick={() => setSelectedAlbum({
                      id: album.album_id,
                      name: album.album_name,
                      images: album.album_image ? [{ url: album.album_image }] : [],
                      release_date: "",
                      artists: [{ id: album.album_id, name: album.artist_name, external_urls: { web: "" } }],
                      external_urls: { web: "" },
                      total_tracks: 0,
                      album_type: "album",
                      uri: "",
                    })}
                  >
                    {album.album_image ? (
                      <Image
                        src={album.album_image}
                        alt={album.album_name}
                        width={52}
                        height={52}
                        className="rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-[52px] h-[52px] rounded-lg bg-zinc-700 flex items-center justify-center shrink-0">
                        <Music size={20} className="text-zinc-500" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{album.album_name}</p>
                      <p className="text-zinc-500 text-xs truncate">{album.artist_name || "Album"}</p>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); unpinAlbum(album.album_id); }}
                        disabled={unpinning === album.album_id}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                        title="Unpin"
                      >
                        {unpinning === album.album_id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Pin size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pinned.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                <Pin size={18} className="text-red-400" /> Pinned Playlists
              </h3>
              <div className="space-y-2">
          {pinned.map((pl) => (
            <div
              key={pl.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 transition-colors group"
            >
              {pl.playlist_image ? (
                <Image
                  src={pl.playlist_image}
                  alt={pl.playlist_name}
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
                <p className="text-white text-sm font-medium truncate">{pl.playlist_name}</p>
                <p className="text-zinc-500 text-xs">
                  Pinned {new Date(pl.pinned_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => unpin(pl.playlist_id)}
                  disabled={unpinning === pl.playlist_id}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                  title="Unpin"
                >
                  {unpinning === pl.playlist_id ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Pin size={15} />
                  )}
                </button>
              </div>
            </div>
          ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
    {selectedAlbum && <AlbumSheet album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />}
    </>
  );
}
