import { type CSSProperties, memo } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  ring?: boolean;
  glassBackground?: boolean;
  className?: string;
  style?: CSSProperties;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (name[0] ?? "?").toUpperCase();
}

function nameToColor(name: string): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#82E0AA",
    "#F8C471",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? "#85C1E9";
}

/**
 * Contact avatar with optional gradient ring and glass background.
 * Shows photo if available, otherwise hash-coloured initials.
 */
export const Avatar = memo(function Avatar({
  name,
  photoUrl,
  size = 40,
  ring = false,
  glassBackground = false,
  className = "",
  style,
}: AvatarProps) {
  const displayName = name || "?";
  const initials = getInitials(displayName);
  const bgColor = nameToColor(displayName);

  const sizeStyle: CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    fontSize: size * 0.38,
  };

  const avatarEl = photoUrl ? (
    <div className={`${styles.avatar} ${className}`} style={{ ...sizeStyle, ...style }}>
      <img src={photoUrl} alt={displayName} loading="lazy" className={styles.avatarImage} />
    </div>
  ) : (
    <div
      className={`${glassBackground ? styles.avatarGlass : styles.avatar} ${className}`}
      style={{
        ...sizeStyle,
        ...(glassBackground ? {} : { backgroundColor: bgColor }),
        ...style,
      }}
    >
      {initials}
    </div>
  );

  if (!ring) return avatarEl;

  return (
    <div
      className={styles.ringWrapper}
      style={{ width: size + 6, height: size + 6, minWidth: size + 6 }}
    >
      {avatarEl}
    </div>
  );
});
