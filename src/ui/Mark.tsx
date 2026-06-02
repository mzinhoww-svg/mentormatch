/**
 * "A Corrente" — the approved MentorMatch symbol (brand spec §5.3). Two arms
 * rotating around a central node; one arm ink, one arm accent. Reproduced
 * exactly from the brand kit (never redrawn from a letter). Also a Lockup
 * (symbol + Mentormatch wordmark, weight 700 + 500, brand spec §5.5).
 */
import type { CSSProperties } from 'react';

const ARM = 'M 50 15 C 71 17, 81 35, 69 51 C 62 61, 53 58, 51 50';

export function Mark({
  size = 28,
  ink = '#14100D',
  accent = 'var(--brand-primary)',
  className,
  style,
}: {
  size?: number;
  ink?: string;
  accent?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const weight = 9;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="MentorMatch"
      className={className}
      style={style}
    >
      <path d={ARM} stroke={ink} strokeWidth={weight} strokeLinecap="round" />
      <path d={ARM} stroke={accent} strokeWidth={weight} strokeLinecap="round" transform="rotate(180 50 50)" />
      <circle cx="50" cy="50" r={weight * 0.66} fill={ink} />
    </svg>
  );
}

export function Lockup({
  height = 22,
  ink = 'currentColor',
  accent = 'var(--brand-primary)',
}: {
  height?: number;
  ink?: string;
  accent?: string;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: height * 0.34 }}>
      <Mark size={Math.round(height * 1.18)} ink={ink} accent={accent} />
      <span
        style={{
          fontFamily: 'var(--sans)',
          fontSize: height * 0.92,
          letterSpacing: '-0.035em',
          lineHeight: 1,
          color: ink,
        }}
      >
        <span style={{ fontWeight: 700 }}>Mentor</span>
        <span style={{ fontWeight: 500 }}>match</span>
      </span>
    </span>
  );
}
