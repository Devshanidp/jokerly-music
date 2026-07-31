"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cast,
  Check,
  Laptop,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Smartphone,
  Speaker,
  Tv,
  X,
} from "lucide-react";
import { APP_NAME } from "@/lib/branding";
import { useBackHandler } from "@/hooks/useBackHandler";
import { PlaybackDevice, usePlayerStore } from "@/store/player";
import { useToastStore } from "@/store/toast";

function deviceIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("speaker") || t.includes("audio")) return Speaker;
  if (t.includes("tv") || t.includes("cast")) return Tv;
  if (t.includes("smartphone") || t.includes("tablet")) return Smartphone;
  if (t.includes("computer")) return Laptop;
  return MonitorSmartphone;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DevicePickerSheet({ open, onClose }: Props) {
  useBackHandler(open, onClose);
  const { toast } = useToastStore();
  const deviceId = usePlayerStore((s) => s.deviceId);
  const activeDeviceId = usePlayerStore((s) => s.activeDeviceId);
  const activeDeviceName = usePlayerStore((s) => s.activeDeviceName);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isOfflinePlayback = usePlayerStore((s) => s.isOfflinePlayback);
  const transferToDevice = usePlayerStore((s) => s.transferToDevice);

  const [devices, setDevices] = useState<PlaybackDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferringId, setTransferringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/music/player/devices", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not load devices");
      const list = (json.devices ?? []) as PlaybackDevice[];
      setDevices(list);

      const activeId = (json.activeDeviceId as string | null) ?? null;
      if (activeId) {
        const match = list.find((d) => d.id === activeId);
        const local = deviceId && activeId === deviceId;
        usePlayerStore.setState({
          activeDeviceId: activeId,
          activeDeviceName: local
            ? `${APP_NAME} (this device)`
            : match?.name ?? activeDeviceName,
          isRemotePlayback: !local,
        });
      }
    } catch (e) {
      setError((e as Error).message || "Could not load devices");
    } finally {
      setLoading(false);
    }
  }, [activeDeviceName, deviceId]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    void load();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, load]);

  if (!open) return null;

  const thisDevice: PlaybackDevice | null = deviceId
    ? {
        id: deviceId,
        name: `${APP_NAME} (this device)`,
        type: "Computer",
        is_active: activeDeviceId === deviceId || (!activeDeviceId && !usePlayerStore.getState().isRemotePlayback),
        is_restricted: false,
        volume_percent: Math.round(usePlayerStore.getState().volume * 100),
        supports_volume: true,
      }
    : null;

  const others = devices.filter((d) => d.id !== deviceId);
  const rows: PlaybackDevice[] = [
    ...(thisDevice ? [thisDevice] : []),
    ...others,
  ];

  const select = async (device: PlaybackDevice) => {
    if (isOfflinePlayback) {
      toast("Switch to online playback to use speakers", "error");
      return;
    }
    if (device.is_restricted) {
      toast("This device can't take playback right now", "error");
      return;
    }
    if (device.id === (activeDeviceId || deviceId)) {
      onClose();
      return;
    }
    setTransferringId(device.id);
    try {
      await transferToDevice({ id: device.id, name: device.name }, { play: isPlaying });
      toast(`Playing on ${device.name}`, "success");
      onClose();
    } catch (e) {
      toast((e as Error).message || "Could not switch device", "error");
      void load();
    } finally {
      setTransferringId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="theme-dark w-full max-w-sm rounded-3xl border-2 border-[#EF4444]/50 shadow-2xl overflow-hidden"
        style={{ background: "#000000" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Cast size={16} className="text-[#EF4444] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Playing on</p>
              <p className="text-xs text-white/45 truncate">
                {activeDeviceName || `${APP_NAME} (this device)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="p-2 rounded-xl text-white/45 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-40"
              title="Refresh devices"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-white/45 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-3 pb-4 max-h-[55vh] overflow-y-auto space-y-1">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-white/40 text-sm">
              <Loader2 size={16} className="animate-spin text-[#EF4444]" />
              Looking for devices…
            </div>
          ) : error && rows.length === 0 ? (
            <div className="px-2 py-8 text-center space-y-3">
              <p className="text-sm text-white/50">{error}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="text-xs font-semibold text-[#EF4444]"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {rows.map((device) => {
                const Icon = device.id === deviceId ? Smartphone : deviceIcon(device.type);
                const selected = device.id === (activeDeviceId || deviceId);
                const busy = transferringId === device.id;
                return (
                  <button
                    key={device.id}
                    type="button"
                    disabled={busy || !!transferringId}
                    onClick={() => void select(device)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${
                      selected
                        ? "bg-[#EF4444]/15 border border-[#EF4444]/40"
                        : "hover:bg-white/[0.06] border border-transparent"
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                        selected ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-white/[0.06] text-white/55"
                      }`}
                    >
                      {busy ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${selected ? "text-[#EF4444]" : "text-white"}`}>
                        {device.name}
                      </p>
                      <p className="text-[11px] text-white/40 truncate capitalize">
                        {device.id === deviceId ? "This phone / browser" : device.type.replace(/_/g, " ").toLowerCase()}
                      </p>
                    </div>
                    {selected && <Check size={16} className="text-[#EF4444] shrink-0" />}
                  </button>
                );
              })}
              {others.length === 0 && (
                <p className="px-2 pt-3 pb-1 text-xs text-white/40 leading-relaxed">
                  Open Spotify on a speaker, TV, or another phone, then tap refresh.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
