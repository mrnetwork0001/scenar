/**
 * Scenar mark: two rounded bars leaning at -35° - two voices, one conversation.
 * Solid ink; inherits `currentColor` so it can be inverted when needed.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <g transform="rotate(-35 16 16)" fill="currentColor">
        <rect x="7.5" y="4" width="7.5" height="24" rx="3.75" />
        <rect x="17" y="9" width="7.5" height="15" rx="3.75" />
      </g>
    </svg>
  );
}
