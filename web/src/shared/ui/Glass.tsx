import { type ReactNode, forwardRef } from "react";
import styles from "@/shared/styles/glass.module.css";

type GlassVariant = "card" | "surface" | "inset" | "bar" | "floating";
type GlassPadding = "none" | "sm" | "md" | "lg";

interface GlassProps {
  children: ReactNode;
  variant?: GlassVariant;
  padding?: GlassPadding;
  hoverable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "section" | "article" | "nav" | "aside" | "header" | "footer";
}

const variantMap: Record<GlassVariant, string> = {
  card: styles.glassCard ?? "",
  surface: styles.glass ?? "",
  inset: styles.glassInset ?? "",
  bar: styles.glassBar ?? "",
  floating: styles.glassFloating ?? "",
};

const paddingMap: Record<GlassPadding, string> = {
  none: styles.paddingNone ?? "",
  sm: styles.paddingSm ?? "",
  md: styles.paddingMd ?? "",
  lg: styles.paddingLg ?? "",
};

/**
 * Polymorphic glassmorphic container component.
 * Renders frosted-glass panels with blur, border, shadow, and inner glow.
 */
export const Glass = forwardRef<HTMLElement, GlassProps>(function Glass(
  {
    children,
    variant = "card",
    padding,
    hoverable = false,
    className = "",
    style,
    as: Tag = "div",
  },
  ref,
) {
  const base = hoverable ? styles.glassHover ?? "" : variantMap[variant];
  const pad = padding ? paddingMap[padding] : "";

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`${base} ${pad} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
});
