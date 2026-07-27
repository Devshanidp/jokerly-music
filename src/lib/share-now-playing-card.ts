import { APP_NAME } from "@/lib/branding";

export interface NowPlayingCardInput {
  name: string;
  artist: string;
  imageUrl?: string | null;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    const last = lines[maxLines - 1];
    let trimmed = last;
    while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    lines[maxLines - 1] = `${trimmed}…`;
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawPlaceholderArt(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  drawRoundedRect(ctx, x, y, size, size, 48);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(239,68,68,0.45)";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "rgba(239,68,68,0.35)";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

export function buildNowPlayingShareText(input: NowPlayingCardInput) {
  return `Now playing on ${APP_NAME}: “${input.name}” — ${input.artist}`;
}

export async function createNowPlayingCardBlob(input: NowPlayingCardInput): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create share image");

  const bg = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, "#0a0a0a");
  bg.addColorStop(0.45, "#111827");
  bg.addColorStop(1, "#1a0505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.fillStyle = "rgba(239,68,68,0.12)";
  ctx.beginPath();
  ctx.arc(CARD_WIDTH * 0.82, CARD_HEIGHT * 0.18, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(CARD_WIDTH * 0.12, CARD_HEIGHT * 0.72, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(239,68,68,0.9)";
  ctx.font = "bold 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NOW PLAYING", CARD_WIDTH / 2, 120);

  const artSize = 720;
  const artX = (CARD_WIDTH - artSize) / 2;
  const artY = 190;
  const cover = input.imageUrl ? await loadImage(input.imageUrl) : null;

  ctx.save();
  drawRoundedRect(ctx, artX, artY, artSize, artSize, 56);
  ctx.clip();
  if (cover) {
    ctx.drawImage(cover, artX, artY, artSize, artSize);
  } else {
    drawPlaceholderArt(ctx, artX, artY, artSize);
  }
  ctx.restore();

  if (cover) {
    drawRoundedRect(ctx, artX, artY, artSize, artSize, 56);
    ctx.strokeStyle = "rgba(239,68,68,0.55)";
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  const textX = CARD_WIDTH / 2;
  const textMax = CARD_WIDTH - 140;

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 64px system-ui, -apple-system, Segoe UI, sans-serif";
  wrapText(ctx, input.name, textX, artY + artSize + 110, textMax, 74, 2);

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "500 42px system-ui, -apple-system, Segoe UI, sans-serif";
  wrapText(ctx, input.artist, textX, artY + artSize + 250, textMax, 52, 2);

  const footerY = CARD_HEIGHT - 120;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(90, footerY - 36, CARD_WIDTH - 180, 2);

  ctx.fillStyle = "#EF4444";
  ctx.font = "bold 38px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(APP_NAME, CARD_WIDTH / 2, footerY + 18);

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = "500 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Listening you", CARD_WIDTH / 2, footerY + 62);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not create share image"));
        else resolve(blob);
      },
      "image/png",
      1
    );
  });
}
