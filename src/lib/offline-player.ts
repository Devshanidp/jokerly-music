let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;

function ensureAudio() {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
  }
  return audio;
}

export function stopOfflinePlayback() {
  const el = ensureAudio();
  if (!el) return;
  el.pause();
  el.currentTime = 0;
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

export async function playOfflineBlob(
  blob: Blob,
  onTimeUpdate?: (ms: number) => void,
  onEnded?: () => void
): Promise<void> {
  const el = ensureAudio();
  if (!el) return;

  stopOfflinePlayback();
  objectUrl = URL.createObjectURL(blob);
  el.src = objectUrl;

  el.ontimeupdate = () => onTimeUpdate?.(Math.floor(el.currentTime * 1000));
  el.onended = () => onEnded?.();

  await el.play();
}

export function pauseOfflinePlayback() {
  ensureAudio()?.pause();
}

export function resumeOfflinePlayback() {
  void ensureAudio()?.play();
}

export function seekOfflinePlayback(ratio: number) {
  const el = ensureAudio();
  if (!el || !isFinite(el.duration)) return;
  el.currentTime = el.duration * ratio;
}

export function getOfflineDurationMs(): number {
  const el = ensureAudio();
  if (!el || !isFinite(el.duration)) return 0;
  return Math.floor(el.duration * 1000);
}

export function isOfflinePlaying(): boolean {
  const el = ensureAudio();
  return !!el && !el.paused && !el.ended;
}
