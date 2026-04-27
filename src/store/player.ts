import { create } from "zustand";

export interface PlayableTrack {
  name: string;
  artist: string;
  image?: string;
  lfmUrl?: string;
  previewUrl?: string | null; // undefined = not yet fetched, null = no preview available
}

interface PlayerState {
  currentTrack: PlayableTrack | null;
  queue: PlayableTrack[];
  queueIndex: number;
  isPlaying: boolean;
  audio: HTMLAudioElement | null;

  setQueueAndPlay: (tracks: PlayableTrack[], index: number) => void;
  updateTrackPreview: (index: number, previewUrl: string | null, imageUrl?: string | null) => void;
  playIndex: (index: number) => void;
  togglePlay: () => void;
  seek: (ratio: number) => void;
  stop: () => void;
}

function startAudio(previewUrl: string, onEnded: () => void): HTMLAudioElement {
  const audio = new Audio(previewUrl);
  audio.play().catch(() => {});
  audio.onended = onEnded;
  return audio;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  audio: null,

  setQueueAndPlay: (tracks, index) => {
    const { audio } = get();
    if (audio) { audio.pause(); audio.src = ""; }

    const track = tracks[index];
    if (!track.previewUrl) {
      set({ queue: tracks, queueIndex: index, currentTrack: track, isPlaying: false, audio: null });
      return;
    }
    const newAudio = startAudio(track.previewUrl, () => set({ isPlaying: false }));
    set({ queue: tracks, queueIndex: index, currentTrack: track, isPlaying: true, audio: newAudio });
  },

  updateTrackPreview: (index, previewUrl, imageUrl) => {
    const { queue } = get();
    const updated = [...queue];
    updated[index] = {
      ...updated[index],
      previewUrl,
      ...(imageUrl ? { image: imageUrl } : {}),
    };
    set({ queue: updated });
  },

  playIndex: (index) => {
    const { queue, audio } = get();
    if (index < 0 || index >= queue.length) return;
    if (audio) { audio.pause(); audio.src = ""; }

    const track = queue[index];
    if (!track.previewUrl) {
      set({ queueIndex: index, currentTrack: track, isPlaying: false, audio: null });
      return;
    }
    const newAudio = startAudio(track.previewUrl, () => set({ isPlaying: false }));
    set({ queueIndex: index, currentTrack: track, isPlaying: true, audio: newAudio });
  },

  togglePlay: () => {
    const { audio, isPlaying } = get();
    if (!audio) return;
    if (isPlaying) { audio.pause(); set({ isPlaying: false }); }
    else { audio.play().catch(() => {}); set({ isPlaying: true }); }
  },

  seek: (ratio) => {
    const { audio } = get();
    if (!audio || !isFinite(audio.duration)) return;
    audio.currentTime = audio.duration * ratio;
  },

  stop: () => {
    const { audio } = get();
    if (audio) { audio.pause(); audio.src = ""; }
    set({ currentTrack: null, isPlaying: false, audio: null, queue: [], queueIndex: -1 });
  },
}));
