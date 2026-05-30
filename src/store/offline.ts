"use client";

import { create } from "zustand";
import {
  getOfflineTrack,
  listOfflineTrackKeys,
  offlineTrackKey,
  removeOfflineTrack,
  saveOfflineTrack,
} from "@/lib/offline-library";

export interface DownloadableTrack {
  uri: string;
  name: string;
  artist: string;
  image?: string | null;
}

interface OfflineState {
  downloadedKeys: Set<string>;
  downloadingKeys: Set<string>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  isDownloaded: (uri: string, name: string, artist: string) => boolean;
  isDownloading: (uri: string, name: string, artist: string) => boolean;
  downloadTrack: (track: DownloadableTrack) => Promise<boolean>;
  removeDownload: (uri: string, name: string, artist: string) => Promise<void>;
  downloadPlaylist: (tracks: DownloadableTrack[]) => Promise<{ ok: number; fail: number }>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  downloadedKeys: new Set(),
  downloadingKeys: new Set(),
  hydrated: false,

  hydrate: async () => {
    try {
      const keys = await listOfflineTrackKeys();
      set({ downloadedKeys: new Set(keys), hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  isDownloaded: (uri, name, artist) => get().downloadedKeys.has(offlineTrackKey(uri, name, artist)),

  isDownloading: (uri, name, artist) => get().downloadingKeys.has(offlineTrackKey(uri, name, artist)),

  downloadTrack: async (track) => {
    const key = offlineTrackKey(track.uri, track.name, track.artist);
    if (get().downloadedKeys.has(key)) return true;

    set((s) => ({
      downloadingKeys: new Set(s.downloadingKeys).add(key),
    }));

    try {
      const params = new URLSearchParams({
        track: track.name,
        artist: track.artist || "Unknown",
      });
      const metaRes = await fetch(`/api/spotify/preview?${params}`);
      const meta = (await metaRes.json()) as { previewUrl?: string | null; imageUrl?: string | null };
      if (!meta.previewUrl) return false;

      const audioRes = await fetch(meta.previewUrl);
      if (!audioRes.ok) return false;
      const blob = await audioRes.blob();

      await saveOfflineTrack(
        {
          key,
          uri: track.uri,
          name: track.name,
          artist: track.artist,
          image: track.image ?? meta.imageUrl ?? null,
          previewUrl: meta.previewUrl,
          downloadedAt: Date.now(),
        },
        blob
      );

      set((s) => {
        const downloadingKeys = new Set(s.downloadingKeys);
        downloadingKeys.delete(key);
        const downloadedKeys = new Set(s.downloadedKeys);
        downloadedKeys.add(key);
        return { downloadingKeys, downloadedKeys };
      });
      return true;
    } catch {
      set((s) => {
        const downloadingKeys = new Set(s.downloadingKeys);
        downloadingKeys.delete(key);
        return { downloadingKeys };
      });
      return false;
    }
  },

  removeDownload: async (uri, name, artist) => {
    const key = offlineTrackKey(uri, name, artist);
    await removeOfflineTrack(key);
    set((s) => {
      const downloadedKeys = new Set(s.downloadedKeys);
      downloadedKeys.delete(key);
      return { downloadedKeys };
    });
  },

  downloadPlaylist: async (tracks) => {
    let ok = 0;
    let fail = 0;
    for (const track of tracks) {
      const success = await get().downloadTrack(track);
      if (success) ok++;
      else fail++;
    }
    return { ok, fail };
  },
}));

export async function fetchOfflineBlob(uri: string, name: string, artist: string) {
  const key = offlineTrackKey(uri, name, artist);
  const row = await getOfflineTrack(key);
  return row?.blob ?? null;
}
