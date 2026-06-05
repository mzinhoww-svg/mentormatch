/**
 * Inline stroke icons for the primary nav (sidebar + mobile bottom-nav). Keyed
 * by NavItem.icon. Decorative (aria-hidden) — the link text is the label.
 */
const PATHS: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-3.5 3.6-6 8-6s8 2.5 8 6',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM16 8l-2 6-6 2 2-6 6-2Z',
  inbox: 'M3 13h5l1.5 3h5L16 13h5M3 13l3-8h12l3 8v6H3v-6Z',
  link: 'M9 12a3 3 0 0 1 3-3h3a3 3 0 0 1 0 6h-1M15 12a3 3 0 0 1-3 3H9a3 3 0 0 1 0-6h1',
  calendar: 'M7 3v3m10-3v3M4 8h16M5 6h14v14H5V6Z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  shield: 'M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.2A1.7 1.7 0 0 0 7 19.5l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 0 1 0-4h.2A1.7 1.7 0 0 0 4.5 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z',
};

export function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  const d = PATHS[name] ?? PATHS.home;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
