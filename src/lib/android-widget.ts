export type AndroidWidgetState = {
  title: string;
  artist: string;
  image?: string | null;
  playing: boolean;
};

export function isAndroidTwa(): boolean {
  if (typeof window === "undefined") return false;
  if (!/Android/i.test(navigator.userAgent)) return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches
  );
}

let lastSyncKey = "";
let lastSyncAt = 0;

export function syncAndroidWidgetState(state: AndroidWidgetState) {
  if (!isAndroidTwa()) return;
  if (!state.title.trim()) return;

  const key = `${state.title}|${state.artist}|${state.image ?? ""}|${state.playing ? 1 : 0}`;
  const now = Date.now();
  if (key === lastSyncKey && now - lastSyncAt < 1500) return;
  lastSyncKey = key;
  lastSyncAt = now;

  const params = new URLSearchParams({
    title: state.title,
    artist: state.artist,
    playing: state.playing ? "1" : "0",
  });
  if (state.image) params.set("image", state.image);

  const url = `shansmusic://widget/sync?${params.toString()}`;
  try {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "display:none;width:0;height:0;border:0;position:absolute";
    iframe.src = url;
    document.body.appendChild(iframe);
    window.setTimeout(() => iframe.remove(), 800);
  } catch {
    window.location.href = url;
  }
}

export function clearAndroidWidgetState() {
  if (!isAndroidTwa()) return;
  syncAndroidWidgetState({
    title: "ShaN'sMusic",
    artist: "Open the app and play a song",
    image: null,
    playing: false,
  });
}
