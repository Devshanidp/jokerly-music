import { SpotifyAlbum, albumImage } from "@/types/spotify";
import { Disc3 } from "lucide-react";
import Image from "next/image";

interface Props {
  album: SpotifyAlbum;
}

export default function SpotifyAlbumCard({ album }: Props) {
  const image = albumImage(album);
  const artists = album.artists.map((a) => a.name).join(", ");

  return (
    <a
      href={album.external_urls.spotify}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 p-3 rounded-xl hover:bg-zinc-800/60 transition-colors group"
    >
      <div className="relative w-full aspect-square">
        {image ? (
          <Image src={image} alt={album.name} fill unoptimized className="rounded-lg object-cover" sizes="160px" />
        ) : (
          <div className="w-full h-full rounded-lg bg-zinc-800 flex items-center justify-center">
            <Disc3 size={32} className="text-zinc-600" />
          </div>
        )}
      </div>
      <div>
        <p className="text-white text-sm font-medium truncate group-hover:text-red-400 transition-colors">
          {album.name}
        </p>
        <p className="text-zinc-400 text-xs truncate">{artists}</p>
        <p className="text-zinc-600 text-xs capitalize">
          {album.album_type} · {album.release_date?.slice(0, 4)}
        </p>
      </div>
    </a>
  );
}
