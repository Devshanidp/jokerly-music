import { CATALOG_API_V1 } from "@/lib/catalog-endpoints";
import { getApiSessionWithToken, unauthorized } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export interface CatalogDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number | null;
  supports_volume: boolean;
}

/** List Connect devices + currently active playback target. */
export async function GET() {
  const session = await getApiSessionWithToken();
  if (!session) return unauthorized();

  try {
    const [devicesRes, playerRes] = await Promise.all([
      fetch(`${CATALOG_API_V1}/me/player/devices`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      }),
      fetch(`${CATALOG_API_V1}/me/player`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        cache: "no-store",
      }),
    ]);

    if (!devicesRes.ok) {
      const text = await devicesRes.text().catch(() => "");
      return NextResponse.json(
        { error: text || `Could not list devices (${devicesRes.status})` },
        { status: devicesRes.status }
      );
    }

    const devicesJson = (await devicesRes.json()) as { devices?: CatalogDevice[] };
    const devices = (devicesJson.devices ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      is_active: Boolean(d.is_active),
      is_restricted: Boolean(d.is_restricted),
      volume_percent: d.volume_percent ?? null,
      supports_volume: d.supports_volume !== false && d.volume_percent != null,
    }));

    let activeDeviceId: string | null = null;
    let isPlaying = false;
    let progressMs = 0;
    let durationMs = 0;

    if (playerRes.ok && playerRes.status !== 204) {
      const playerJson = (await playerRes.json()) as {
        device?: { id?: string };
        is_playing?: boolean;
        progress_ms?: number;
        item?: { duration_ms?: number };
      };
      activeDeviceId = playerJson.device?.id ?? null;
      isPlaying = Boolean(playerJson.is_playing);
      progressMs = playerJson.progress_ms ?? 0;
      durationMs = playerJson.item?.duration_ms ?? 0;
    }

    if (!activeDeviceId) {
      activeDeviceId = devices.find((d) => d.is_active)?.id ?? null;
    }

    return NextResponse.json(
      { devices, activeDeviceId, isPlaying, progressMs, durationMs },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Could not list devices" },
      { status: 502 }
    );
  }
}
