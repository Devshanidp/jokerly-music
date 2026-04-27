"use client";

import { SpotifyArtist, artistImage } from "@/types/spotify";
import { Mic2, ExternalLink } from "lucide-react";
import Image from "next/image";

interface Props {
  artist: SpotifyArtist;
  onSelect?: (artist: SpotifyArtist) => void;
}

export default function SpotifyArtistCard({ artist, onSelect }: Props) {
  const image = artistImage(artist);

  return (
    <div
      onClick={() => onSelect?.(artist)}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors group ${
        onSelect ? "cursor-pointer hover:bg-zinc-800/60" : "hover:bg-zinc-800/60"
      }`}
    >
      <div className="relative w-20 h-20 shrink-0">
        {image ? (
          <Image src={image} alt={artist.name} fill unoptimized className="rounded-full object-cover" sizes="80px" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
            <Mic2 size={28} className="text-zinc-600" />
          </div>
        )}
      </div>

      <div className="text-center w-full">
        <p className="text-white text-sm font-medium truncate group-hover:text-red-400 transition-colors">
          {artist.name}
        </p>
        {artist.followers?.total != null && (
          <p className="text-zinc-500 text-xs">
            {artist.followers.total.toLocaleString()} followers
          </p>
        )}
      </div>

      <a
        href={artist.external_urls.spotify}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-zinc-600 hover:text-zinc-400 transition-colors"
        title="Open on Spotify"
      >
        <ExternalLink size={12} />
      </a>
    </div>
  );
}
