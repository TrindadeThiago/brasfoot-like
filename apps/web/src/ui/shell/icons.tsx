import type { ReactNode } from "react";

/** Ícones da navegação (025): SVG inline, sem requisição externa; decorativos (`aria-hidden`). */
const PATHS = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5" />,
  squad: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.5-3.2 2.6-5 5.5-5s5 1.8 5.5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16.5 14.2c2.4.1 3.8 1.6 4.2 4.3" />
    </>
  ),
  lineup: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M12 4.5v15M3.5 12h17" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H4.5c0 3 1.2 4.6 3.7 5M16 6h3.5c0 3-1.2 4.6-3.7 5M12 13v4M8.5 20h7M10 17h4" />
  ),
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  coins: (
    <>
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" />
      <path d="M5.5 6.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5M5.5 11.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" />
    </>
  ),
  history: <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4.5v4h4M12 8v4.5l3 2" />,
  market: <path d="M4 8h16M7 8l-1.5 11.5h13L17 8M9 8V6.5a3 3 0 0 1 6 0V8" />,
  career: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" />
      <path d="M9 7.5V5.5h6v2M3.5 13h17" />
    </>
  ),
  news: (
    <>
      <path d="M5 5.5h11.5v13H6.5a1.5 1.5 0 0 1-1.5-1.5V5.5ZM16.5 9H20v8a1.5 1.5 0 0 1-3 0" />
      <path d="M8 9h5.5M8 12h5.5M8 15h3" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  keyboard: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7.5 14h9" />
    </>
  ),
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
