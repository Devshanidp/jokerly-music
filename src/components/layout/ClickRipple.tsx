"use client";

import { useEffect, useState } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
};

const RIPPLE_MS = 650;
const MAX_RIPPLES = 8;

export default function ClickRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  useEffect(() => {
    let seq = 0;

    const spawn = (x: number, y: number) => {
      const id = ++seq;
      setRipples((prev) => [...prev.slice(-(MAX_RIPPLES - 1)), { id, x, y }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, RIPPLE_MS);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      spawn(e.clientX, e.clientY);
    };

    // Extra touch path for some Android WebViews / TWA
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      spawn(t.clientX, t.clientY);
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    // Fallback only when PointerEvent is missing (old WebViews)
    if (typeof window.PointerEvent === "undefined") {
      document.addEventListener("touchstart", onTouchStart, { passive: true });
    }
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("touchstart", onTouchStart);
    };
  }, []);

  return (
    <div className="click-ripple-layer" aria-hidden>
      {ripples.map((r) => (
        <span key={r.id} className="click-ripple" style={{ left: r.x, top: r.y }}>
          <span className="click-ripple-core" />
          <span className="click-ripple-ring" />
        </span>
      ))}
    </div>
  );
}
