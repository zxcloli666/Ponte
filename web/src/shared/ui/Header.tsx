import { memo, type ReactNode } from "react";
import styles from "./Header.module.css";

interface HeaderProps {
  title?: string;
  largeTitle?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  transparent?: boolean;
}

/**
 * Floating glass navigation header.
 * Supports large-title mode (iOS / Vision Pro style), left/right action slots,
 * and optional children (search bar, etc.) rendered below the bar.
 */
export const Header = memo(function Header({
  title,
  largeTitle = false,
  left,
  right,
  children,
  transparent = false,
}: HeaderProps) {
  return (
    <header
      className={transparent ? styles.headerTransparent : styles.headerGlass}
    >
      {/* Standard header bar */}
      <div className={styles.bar}>
        <div className={styles.slotLeft}>{left}</div>

        {!largeTitle && title && (
          <h1 className={styles.titleCenter}>{title}</h1>
        )}

        <div className={styles.slotRight}>{right}</div>
      </div>

      {/* Large title */}
      {largeTitle && title && (
        <div className={styles.largeTitleContainer}>
          <h1 className={styles.largeTitle}>{title}</h1>
        </div>
      )}

      {/* Optional extra content */}
      {children}
    </header>
  );
});
