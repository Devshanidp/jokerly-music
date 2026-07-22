import { getApiSessionWithToken } from "@/lib/api-auth";
import { searchCatalog, getPlaylistTracks } from "@/lib/music-api";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30; // 30 seconds max duration

export async function POST(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    // Determine search type based on prompt keywords to be smarter
    const searchType = prompt.toLowerCase().includes("playlist") || prompt.toLowerCase().includes("mix") 
      ? "playlist" : "track";
      
    let resolvedTracks: any[] = [];
    let bestPlaylist: any = null;

    if (searchType === "playlist") {
      const searchResults: any = await searchCatalog(prompt, "playlist", session.accessToken, 3);
      const playlists = searchResults?.playlists?.items || [];
      bestPlaylist = playlists[0];
      
      if (bestPlaylist) {
        try {
          // We found a playlist, fetch its tracks
          const tracksRes: any = await getPlaylistTracks(bestPlaylist.id, session.accessToken, 10);
          const items = tracksRes.items || [];
          
          for (const item of items) {
            const trackItem = item.track;
            if (trackItem && trackItem.uri) {
              resolvedTracks.push({
                uri: trackItem.uri,
                name: trackItem.name,
                artist: trackItem.artists?.[0]?.name,
                image: trackItem.album?.images?.[0]?.url || trackItem.images?.[0]?.url || null,
              });
            }
          }
        } catch (e) {
          console.warn("Skipping playlist fetch due to Spotify API restrictions (403):", e);
        }
      }
    }

    // If we didn't find a playlist or chose to search tracks directly
    if (resolvedTracks.length === 0) {
      const fallbackSearch: any = await searchCatalog(prompt, "track", session.accessToken, 10);
      const fallbackTracks = fallbackSearch?.tracks?.items || fallbackSearch?.items || [];
      
      if (fallbackTracks.length === 0) {
        return NextResponse.json({ error: "Could not find any matching vibe in the catalog" }, { status: 404 });
      }
      
      resolvedTracks = fallbackTracks.map((trackItem: any) => ({
        uri: trackItem.uri,
        name: trackItem.name,
        artist: trackItem.artists?.[0]?.name,
        image: trackItem.album?.images?.[0]?.url || trackItem.images?.[0]?.url || null,
      }));
    }

    if (resolvedTracks.length === 0) {
      return NextResponse.json({ error: "Found a matching vibe but it had no playable tracks" }, { status: 404 });
    }

    // Create the playlist in Appwrite
    const supabase = await createClient();
    const playlistName = bestPlaylist && bestPlaylist.name 
      ? `✨ ${bestPlaylist.name}` 
      : `✨ ${prompt.length > 30 ? prompt.slice(0, 27) + '...' : prompt}`;
    const playlistDesc = `Magic Mix generated from your search.`;
    
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .insert({
            user_id: session.userId,
            name: playlistName,
            description: playlistDesc,
            image: resolvedTracks[0]?.image || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
      .select("id")
      .single();

    if (playlistError || !playlist) {
      throw new Error(playlistError?.message || "Failed to create playlist in database");
    }

    const tracksToInsert = resolvedTracks.map((track: any, index: number) => ({
      user_id: session.userId,
      playlist_id: playlist.id,
      track_uri: track.uri,
      track_name: track.name,
      track_artist: track.artist,
        track_image: track.image,
        position: index + 1,
        added_at: new Date().toISOString(),
      }));

    const { error: tracksError } = await supabase
      .from("playlist_tracks")
      .insert(tracksToInsert);

    if (tracksError) {
      console.error("Error adding tracks to AI playlist", tracksError);
      await supabase.from("playlists").delete().eq("id", playlist.id);
      throw new Error("Failed to add tracks to the new playlist");
    }

    return NextResponse.json({ 
      success: true, 
      playlistId: playlist.id,
      name: playlistName,
      trackCount: resolvedTracks.length 
    });

  } catch (error: any) {
    console.error("[Magic Mix API Error]", error);
    return NextResponse.json({ error: error.message || "Failed to generate Magic Mix" }, { status: 500 });
  }
}
