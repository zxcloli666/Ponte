import { memo } from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  count: number;
  maxCount?: number;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Notification badge with gradient background and subtle glow.
 */
export const Badge = memo(function Badge({
  count,
  maxCount = 99,
  size = "md",
  className = "",
}: BadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();
  const isWide = displayCount.length > 1;

  let badgeClass: string;
  if (size === "sm") {
    badgeClass = isWide ? (styles.smWide ?? "") : (styles.sm ?? "");
  } else {
    badgeClass = isWide ? (styles.mdWide ?? "") : (styles.md ?? "");
  }

  return (
    <span className={`${badgeClass} ${className}`.trim()} aria-label={`${count} unread`}>
      {displayCount}
    </span>
  );
});
