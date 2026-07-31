import { CATALOG_API_V1 } from "@/lib/catalog-endpoints";
import { getApiSessionWithToken, unauthorized, tokenExpired } from "@/lib/api-auth";
import { NextRequest, NextResponse } from "next/server";



type PlayerAction = "play" | "repeat" | "shuffle" | "transfer" | "pause" | "resume" | "seek" | "volume";

interface PlayBody {
  action: "play";
  deviceId: string;
  uris: string[];
  offset?: { position: number };
  positionMs?: number;
}

interface RepeatBody {
  action: "repeat";
  deviceId: string;
  state: "off" | "context" | "track";
}

interface ShuffleBody {
  action: "shuffle";
  deviceId: string;
  state: boolean;
}

interface TransferBody {
  action: "transfer";
  deviceId: string;
  play?: boolean;
}

interface PauseBody {
  action: "pause";
  deviceId: string;
}

interface ResumeBody {
  action: "resume";
  deviceId: string;
}

interface SeekBody {
  action: "seek";
  deviceId: string;
  positionMs: number;
}

interface VolumeBody {
  action: "volume";
  deviceId: string;
  volumePercent: number;
}

type PlayerBody =
  | PlayBody
  | RepeatBody
  | ShuffleBody
  | TransferBody
  | PauseBody
  | ResumeBody
  | SeekBody
  | VolumeBody;

const MAX_PLAY_URIS = 100;

function slicePlayUris(uris: string[], offsetPosition = 0) {
  if (uris.length <= MAX_PLAY_URIS) {
    return { uris, offset: { position: Math.max(0, offsetPosition) } };
  }

  let start = Math.max(0, offsetPosition - Math.floor(MAX_PLAY_URIS / 2));
  if (start + MAX_PLAY_URIS > uris.length) {
    start = Math.max(0, uris.length - MAX_PLAY_URIS);
  }

  return {
    uris: uris.slice(start, start + MAX_PLAY_URIS),
    offset: { position: Math.max(0, offsetPosition - start) },
  };
}

async function catalogPlayerRequest(path: string, accessToken: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${CATALOG_API_V1}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog service unreachable";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || `Catalog API ${res.status}`;
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // keep raw text
    }
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}

async function transferPlaybackIfNeeded(deviceId: string, accessToken: string) {
  try {
    const res = await fetch(`${CATALOG_API_V1}/me/player`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { device?: { id?: string } };
      if (data?.device?.id === deviceId) return;
    }
    await fetch(`${CATALOG_API_V1}/me/player`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
      cache: "no-store",
    });
  } catch {
    // Non-fatal — play request targets device_id directly anyway.
  }
}

export async function POST(req: NextRequest) {
  const session = await getApiSessionWithToken();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as PlayerBody;
  if (!body?.action || !body.deviceId) {
    return NextResponse.json({ error: "Missing player action or device" }, { status: 400 });
  }

  switch (body.action as PlayerAction) {
    case "play": {
      const playBody = body as PlayBody;
      if (!Array.isArray(playBody.uris) || playBody.uris.length === 0) {
        return NextResponse.json({ error: "Track uris required" }, { status: 400 });
      }
      const offsetPosition =
        typeof playBody.offset?.position === "number" ? playBody.offset.position : 0;
      const sliced = slicePlayUris(playBody.uris, offsetPosition);
      await transferPlaybackIfNeeded(playBody.deviceId, session.accessToken);
      return catalogPlayerRequest(
        `/me/player/play?device_id=${encodeURIComponent(playBody.deviceId)}`,
        session.accessToken,
        {
          method: "PUT",
          body: JSON.stringify({
            uris: sliced.uris,
            ...(sliced.uris.length > 1 ? { offset: sliced.offset } : {}),
            position_ms: playBody.positionMs ?? 0,
          }),
        }
      );
    }
    case "repeat": {
      const repeatBody = body as RepeatBody;
      return catalogPlayerRequest(
        `/me/player/repeat?state=${encodeURIComponent(repeatBody.state)}&device_id=${encodeURIComponent(repeatBody.deviceId)}`,
        session.accessToken,
        { method: "PUT" }
      );
    }
    case "shuffle": {
      const shuffleBody = body as ShuffleBody;
      return catalogPlayerRequest(
        `/me/player/shuffle?state=${shuffleBody.state}&device_id=${encodeURIComponent(shuffleBody.deviceId)}`,
        session.accessToken,
        { method: "PUT" }
      );
    }
    case "transfer": {
      const transferBody = body as TransferBody;
      return catalogPlayerRequest(`/me/player`, session.accessToken, {
        method: "PUT",
        body: JSON.stringify({
          device_ids: [transferBody.deviceId],
          play: transferBody.play !== false,
        }),
      });
    }
    case "pause": {
      const pauseBody = body as PauseBody;
      return catalogPlayerRequest(
        `/me/player/pause?device_id=${encodeURIComponent(pauseBody.deviceId)}`,
        session.accessToken,
        { method: "PUT" }
      );
    }
    case "resume": {
      const resumeBody = body as ResumeBody;
      return catalogPlayerRequest(
        `/me/player/play?device_id=${encodeURIComponent(resumeBody.deviceId)}`,
        session.accessToken,
        { method: "PUT", body: JSON.stringify({}) }
      );
    }
    case "seek": {
      const seekBody = body as SeekBody;
      const ms = Math.max(0, Math.floor(seekBody.positionMs ?? 0));
      return catalogPlayerRequest(
        `/me/player/seek?position_ms=${ms}&device_id=${encodeURIComponent(seekBody.deviceId)}`,
        session.accessToken,
        { method: "PUT" }
      );
    }
    case "volume": {
      const volumeBody = body as VolumeBody;
      const pct = Math.max(0, Math.min(100, Math.round(volumeBody.volumePercent ?? 0)));
      return catalogPlayerRequest(
        `/me/player/volume?volume_percent=${pct}&device_id=${encodeURIComponent(volumeBody.deviceId)}`,
        session.accessToken,
        { method: "PUT" }
      );
    }
    default:
      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
}
