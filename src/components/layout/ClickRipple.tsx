"use client";

import { useEffect, useState } from "react";

type Ripple = {
  id: number;
  x: number;
  y: number;
};

const RIPPLE_MS = 720;
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

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      spawn(t.clientX, t.clientY);
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
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
          <span className="click-ripple-bloom" />
          <span className="click-ripple-spark" />
          <span className="click-ripple-wave click-ripple-wave-a" />
          <span className="click-ripple-wave click-ripple-wave-b" />
        </span>
      ))}
    </div>
  );
}
