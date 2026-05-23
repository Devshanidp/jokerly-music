interface SpotifyIconProps {
  size?: number;
  className?: string;
}

export default function SpotifyIcon({ size = 16, className }: SpotifyIconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
    >
      <path d="M12 1.75C6.34 1.75 1.75 6.34 1.75 12S6.34 22.25 12 22.25 22.25 17.66 22.25 12 17.66 1.75 12 1.75Zm4.7 14.78a.74.74 0 0 1-1.02.24c-2.8-1.7-6.32-2.09-10.46-1.14a.75.75 0 1 1-.33-1.46c4.53-1.03 8.43-.59 11.57 1.33.35.21.46.67.24 1.03Zm1.25-2.78a.92.92 0 0 1-1.27.3c-3.2-1.97-8.08-2.54-11.86-1.39a.93.93 0 0 1-.54-1.77c4.32-1.31 9.7-.68 13.37 1.58.43.26.56.83.3 1.28Zm.11-2.9C14.22 8.57 7.9 8.36 4.22 9.47a1.1 1.1 0 1 1-.64-2.1c4.23-1.28 11.2-1.04 15.6 1.57a1.1 1.1 0 0 1-1.12 1.9Z" />
    </svg>
  );
}
