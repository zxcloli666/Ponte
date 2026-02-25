import { memo } from "react";
import s from "./LineBadge.module.css";
import { useLineBadge } from "./hooks";

interface LineBadgeProps {
  simId: string;
  extraNumberId?: string | null;
  showCarrier?: boolean;
  size?: "sm" | "md";
}

export const LineBadge = memo(function LineBadge({
  simId,
  extraNumberId,
  showCarrier = false,
  size = "sm",
}: LineBadgeProps) {
  const { displayName, color, carrierName } = useLineBadge(simId, extraNumberId);

  return (
    <span className={size === "md" ? s.badgeMd : s.badge}>
      <span className={s.dot} style={{ backgroundColor: color }} />
      {displayName}
      {showCarrier && carrierName && <span className={s.carrier}>{carrierName}</span>}
    </span>
  );
});
