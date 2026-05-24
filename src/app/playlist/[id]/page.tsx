import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const SITE_URL = "https://jokerly-music.vercel.app";

type PublicPlaylistPageProps = {
  params: Promise<{ id: string }>;
};

type PlaylistRow = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
};

type PlaylistTrackRow = {
  id: string;
  track_uri: string;
  track_name: string;
  track_image: string | null;
  track_artist: string | null;
  position: number | null;
};

function spotifyTrackUrl(uri: string) {
  const prefix = "spotify:track:";
  const trackId = uri.startsWith(prefix) ? uri.slice(prefix.length) : uri;
  return /^[A-Za-z0-9]{22}$/.test(trackId) ? `https://open.spotify.com/track/${trackId}` : null;
}

function musicPlaylistJsonLd(playlist: PlaylistRow, tracks: PlaylistTrackRow[]) {
  return {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name: playlist.name,
    description: "Exported from Jokerly",
    track: tracks.map((track) => ({
      "@type": "MusicRecording",
      name: track.track_name,
      byArtist: {
        "@type": "MusicGroup",
        name: track.track_artist || "Unknown Artist",
      },
    })),
  };
}

function createPublicPlaylistClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getPublicPlaylist(id: string) {
  const supabase = createPublicPlaylistClient();

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id, name, description, image")
    .eq("id", id)
    .single<PlaylistRow>();

  if (playlistError || !playlist) return null;

  const { data: tracks, error: tracksError } = await supabase
    .from("playlist_tracks")
    .select("id, track_uri, track_name, track_image, track_artist, position")
    .eq("playlist_id", id)
    .order("position", { ascending: true })
    .order("added_at", { ascending: true })
    .returns<PlaylistTrackRow[]>();

  if (tracksError) return { playlist, tracks: [] };

  return { playlist, tracks: tracks ?? [] };
}

export async function generateMetadata({ params }: PublicPlaylistPageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getPublicPlaylist(id);

  if (!result) {
    return {
      title: "Playlist not found | Jokerly",
    };
  }

  return {
    title: result.playlist.name,
    description: "Exported from Jokerly",
    openGraph: {
      type: "music.playlist",
      title: result.playlist.name,
      description: "Check out this playlist on Jokerly",
      url: `${SITE_URL}/playlist/${id}`,
    },
  };
}

export default async function PublicPlaylistPage({ params }: PublicPlaylistPageProps) {
  const { id } = await params;
  const result = await getPublicPlaylist(id);

  if (!result) notFound();

  const { playlist, tracks } = result;
  const jsonLd = musicPlaylistJsonLd(playlist, tracks);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="min-h-screen px-4 py-8" style={{ background: "#080406", color: "white" }}>
        <article className="mx-auto max-w-2xl space-y-8" itemScope itemType="https://schema.org/MusicPlaylist">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/35">Jokerly Playlist</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight" itemProp="name">{playlist.name}</h1>
            <p className="mt-2 text-sm text-white/55" itemProp="description">Exported from Jokerly</p>
            <p className="mt-2 text-sm text-white/40">{tracks.length} tracks</p>
          </header>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            {tracks.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-white/45">No tracks in this playlist yet.</p>
            ) : (
              <ol className="divide-y divide-white/[0.06]">
                {tracks.map((track, index) => {
                  const spotifyUrl = spotifyTrackUrl(track.track_uri);

                  return (
                    <li key={track.id} className="px-4 py-3" itemProp="track" itemScope itemType="https://schema.org/MusicRecording">
                      <span className="mr-3 text-xs tabular-nums text-white/30">{index + 1}</span>
                      {spotifyUrl ? (
                        <a href={spotifyUrl} className="font-semibold text-white hover:text-[#E8282B]" itemProp="url">
                          <span itemProp="name">{track.track_name}</span>
                        </a>
                      ) : (
                        <span className="font-semibold text-white" itemProp="name">{track.track_name}</span>
                      )}
                      <span className="ml-2 text-sm text-white/45" itemProp="byArtist" itemScope itemType="https://schema.org/MusicGroup">
                        by <span itemProp="name">{track.track_artist || "Unknown Artist"}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <p className="text-center text-xs text-white/25">Shared from Jokerly</p>
        </article>
      </main>
    </>
  );
}
