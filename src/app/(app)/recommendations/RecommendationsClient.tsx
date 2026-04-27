"use client";

import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Music } from "lucide-react";
import SpotifyTrackCard from "@/components/music/SpotifyTrackCard";
import AddToPlaylistModal from "@/components/playlist/AddToPlaylistModal";
import { SpotifyTrack, trackImage, artistNames } from "@/types/spotify";
import { usePlayerStore, PlayableTrack } from "@/store/player";

const GENRE_TAGS = ["pop", "rock", "hip-hop", "electronic", "jazz", "classical", "indie", "r&b"];

function toPlayable(t: SpotifyTrack): PlayableTrack {
  return {
    name: t.name,
    artist: artistNames(t),
    image: trackImage(t),
    uri: t.uri,
    durationMs: t.duration_ms,
  };
}

export default function RecommendationsClient() {
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [similarSeed, setSimilarSeed] = useState<{ name: string; artist: string } | null>(null);
  const [modalTrack, setModalTrack] = useState<{ name: string; uri: string } | null>(null);

  const { setQueueAndPlay, currentTrack, isPlaying } = usePlayerStore();

  const fetchDefault = async () => {
    setLoading(true);
    setSimilarSeed(null);
    setSelectedGenre(null);
    try {
      const res = await fetch("/api/spotify/recommendations");
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchByGenre = async (genre: string) => {
    setLoading(true);
    setSelectedGenre(genre);
    setSimilarSeed(null);
    try {
      const res = await fetch(`/api/spotify/recommendations?genre=${encodeURIComponent(genre)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilar = async (track: SpotifyTrack) => {
    const artist = artistNames(track);
    setLoading(true);
    setSimilarSeed({ name: track.name, artist });
    setSelectedGenre(null);
    try {
      const res = await fetch(`/api/spotify/recommendations?trackId=${encodeURIComponent(track.id)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (track: SpotifyTrack) => {
    const index = tracks.findIndex((t) => t.id === track.id);
    if (index === -1) return;
    setQueueAndPlay(tracks.map(toPlayable), index);
  };

  const isTrackPlaying = (track: SpotifyTrack) =>
    currentTrack?.name === track.name &&
    currentTrack?.artist === artistNames(track) &&
    isPlaying;

  const handleAddToPlaylist = (track: SpotifyTrack) => {
    setModalTrack({ uri: track.uri, name: track.name });
  };

  useEffect(() => { fetchDefault(); }, []);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-purple-400" size={28} /> For You
          </h2>
          <p className="text-zinc-400 mt-1">
            {similarSeed
              ? `Tracks similar to "${similarSeed.name}" by ${similarSeed.artist}`
              : selectedGenre
              ? `Recommended "${selectedGenre}" tracks`
              : "Recommended based on your listening"}
          </p>
        </div>
        <button
          onClick={fetchDefault}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {GENRE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => fetchByGenre(tag)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
              selectedGenre === tag ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-14 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <Music size={48} className="mx-auto mb-4 opacity-30" />
          <p>No tracks found.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((track, i) => (
            <SpotifyTrackCard
              key={track.id}
              track={track}
              rank={i + 1}
              onGetSimilar={fetchSimilar}
              onPlay={handlePlay}
              onAddToPlaylist={handleAddToPlaylist}
              isCurrentlyPlaying={isTrackPlaying(track)}
            />
          ))}
        </div>
      )}

      {modalTrack && (
        <AddToPlaylistModal track={modalTrack} onClose={() => setModalTrack(null)} />
      )}
    </div>
  );
}
