import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const VALID_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

export async function GET(req: NextRequest) {
  const raw = parseInt(new URL(req.url).searchParams.get("size") ?? "192", 10);
  const size = VALID_SIZES.includes(raw) ? raw : 192;

  const squareSize = Math.round(size * 0.72);
  const radius    = Math.round(size * 0.18);
  const noteSize  = Math.round(size * 0.44);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Red rounded-square badge */}
        <div
          style={{
            width: squareSize,
            height: squareSize,
            borderRadius: radius,
            background: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Music note */}
          <svg
            width={noteSize}
            height={noteSize}
            viewBox="0 0 24 24"
            fill="white"
          >
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=604800, immutable",
      },
    }
  );
}
