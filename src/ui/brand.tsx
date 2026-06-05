// Vector Security brand assets, recreated as crisp inline SVG so they scale to
// any size and inherit the brand teal via currentColor.

interface MarkProps {
  size?: number;
  className?: string;
  title?: string;
}

/** The Vector "hooked pin" mark. Uses currentColor. */
export function VectorMark({ size = 28, className, title }: MarkProps) {
  return (
    <svg
      width={size}
      height={(size * 130) / 120}
      viewBox="0 0 120 130"
      className={className}
      role="img"
      aria-label={title ?? "Vector"}
      fill="none"
    >
      {/* Downward pin / triangle */}
      <path
        d="M16 40 L104 40 L60 120 Z"
        stroke="currentColor"
        strokeWidth={11}
        strokeLinejoin="round"
      />
      {/* Hook shackle rising from the pin */}
      <path
        d="M44 40 a21 21 0 1 1 32 0"
        stroke="currentColor"
        strokeWidth={11}
        strokeLinecap="round"
      />
      {/* Indicator dot */}
      <circle cx="44" cy="74" r="7.5" fill="currentColor" />
    </svg>
  );
}

interface LogoProps {
  /** Height of the mark in px; wordmark scales with it. */
  size?: number;
  /** Hide the wordmark, show only the mark. */
  markOnly?: boolean;
  className?: string;
}

/** Full lockup: mark + "vector security" wordmark, both in brand teal. */
export function VectorLogo({ size = 26, markOnly = false, className }: LogoProps) {
  return (
    <span className={`brand-logo ${className ?? ""}`} style={{ color: "var(--accent)" }}>
      <VectorMark size={size} />
      {!markOnly && (
        <span className="brand-wordmark" style={{ fontSize: size * 0.82 }}>
          vector <span className="brand-wordmark-2">security</span>
        </span>
      )}
    </span>
  );
}
