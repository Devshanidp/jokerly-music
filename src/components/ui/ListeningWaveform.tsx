"use client";

interface Props {
  className?: string;
  barClassName?: string;
}

const HEIGHTS = [8, 14, 10, 16, 11];

export default function ListeningWaveform({ className = "", barClassName = "" }: Props) {
  return (
    <span className={`inline-flex items-end gap-[2px] h-4 ${className}`.trim()} aria-hidden="true">
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className={`w-[2px] rounded-full bg-current animate-pulse ${barClassName}`.trim()}
          style={{
            height: `${h}px`,
            animationDelay: `${i * 90}ms`,
            animationDuration: "700ms",
          }}
        />
      ))}
    </span>
  );
}
