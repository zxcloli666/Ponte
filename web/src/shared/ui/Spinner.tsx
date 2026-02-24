import { memo, type CSSProperties } from "react";
import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Loading spinner with accent gradient stroke.
 */
export const Spinner = memo(function Spinner({
  size = 24,
  className = "",
  style,
}: SpinnerProps) {
  return (
    <svg
      className={`${styles.spinner} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
      role="status"
      style={style}
    >
      <defs>
        <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-secondary)" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#spinner-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="45 90"
        opacity="0.9"
      />
    </svg>
  );
});
