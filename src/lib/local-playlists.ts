"use client";

import { useSyncExternalStore } from "react";

export interface LocalPlaylistTrack {
  uri: string;
  name: string;
  addedAt: string;
}

export interface LocalPlaylist {
  id: string;
  name: string;
  description: string;
  image: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  tracks: LocalPlaylistTrack[];
}

const STORAGE_KEY = "jokerly:local-playlists";
const CHANGE_EVENT = "jokerly:local-playlists-change";
const EMPTY_PLAYLISTS: LocalPlaylist[] = [];

let cachedRaw = "[]";
let cachedPlaylists: LocalPlaylist[] = EMPTY_PLAYLISTS;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isLocalPlaylistArray(value: unknown): value is LocalPlaylist[] {
  return Array.isArray(value);
}

function parsePlaylists(raw: string | null): LocalPlaylist[] {
  if (!raw) return EMPTY_PLAYLISTS;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isLocalPlaylistArray(parsed) ? parsed : EMPTY_PLAYLISTS;
  } catch {
    return EMPTY_PLAYLISTS;
  }
}

function readPlaylists(): LocalPlaylist[] {
  if (!canUseStorage()) return EMPTY_PLAYLISTS;

  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  if (raw === cachedRaw) return cachedPlaylists;

  const parsed = parsePlaylists(raw);
  cachedRaw = raw;
  cachedPlaylists = parsed;
  return cachedPlaylists;
}

function writePlaylists(playlists: LocalPlaylist[]) {
  if (!canUseStorage()) return;
  const raw = JSON.stringify(playlists);
  cachedRaw = raw;
  cachedPlaylists = playlists;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updatePlaylists(updater: (playlists: LocalPlaylist[]) => LocalPlaylist[]) {
  const next = updater(readPlaylists());
  writePlaylists(next);
  return next;
}

function subscribe(onStoreChange: () => void) {
  if (!canUseStorage()) return () => {};

  const handleStorage = (event: Event) => {
    if (event instanceof StorageEvent && event.key && event.key !== STORAGE_KEY) return;
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleStorage);
  };
}

export function useLocalPlaylists() {
  return useSyncExternalStore(subscribe, readPlaylists, () => EMPTY_PLAYLISTS);
}

export function createLocalPlaylist(name: string, description: string) {
  const now = new Date().toISOString();
  const playlist: LocalPlaylist = {
    id: crypto.randomUUID(),
    name,
    description,
    image: "",
    pinned: false,
    createdAt: now,
    updatedAt: now,
    tracks: [],
  };

  updatePlaylists((playlists) => [playlist, ...playlists]);
  return playlist;
}

export function updateLocalPlaylist(id: string, patch: Pick<LocalPlaylist, "name" | "description">) {
  updatePlaylists((playlists) =>
    playlists.map((playlist) =>
      playlist.id === id
        ? {
            ...playlist,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : playlist
    )
  );
}

export function deleteLocalPlaylist(id: string) {
  updatePlaylists((playlists) => playlists.filter((playlist) => playlist.id !== id));
}

export function togglePinnedPlaylist(id: string) {
  updatePlaylists((playlists) =>
    playlists.map((playlist) =>
      playlist.id === id
        ? {
            ...playlist,
            pinned: !playlist.pinned,
            updatedAt: new Date().toISOString(),
          }
        : playlist
    )
  );
}

export function addTrackToLocalPlaylist(playlistId: string, track: { uri: string; name: string }) {
  updatePlaylists((playlists) =>
    playlists.map((playlist) => {
      if (playlist.id !== playlistId) return playlist;
      if (playlist.tracks.some((item) => item.uri === track.uri)) return playlist;

      return {
        ...playlist,
        updatedAt: new Date().toISOString(),
        tracks: [
          {
            uri: track.uri,
            name: track.name,
            addedAt: new Date().toISOString(),
          },
          ...playlist.tracks,
        ],
      };
    })
  );
}
