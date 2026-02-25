import { motion } from "framer-motion";
import { memo, useCallback } from "react";
import { useLines } from "./hooks";
import type { LineOption } from "./store";

interface LineSelectorProps {
  value?: string | null;
  onChange: (lineId: string) => void;
  style?: React.CSSProperties;
}

export const LineSelector = memo(function LineSelector({
  value,
  onChange,
  style,
}: LineSelectorProps) {
  const { options, selectedLineId, showSelector } = useLines();
  if (!showSelector) return null;
  const activeId = value ?? selectedLineId;

  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "4px 0",
        scrollbarWidth: "none",
        ...style,
      }}
    >
      {options.map((o) => (
        <LinePill key={o.id} option={o} isActive={o.id === activeId} onSelect={onChange} />
      ))}
    </div>
  );
});

const LinePill = memo(function LinePill({
  option,
  isActive,
  onSelect,
}: { option: LineOption; isActive: boolean; onSelect: (id: string) => void }) {
  const click = useCallback(() => onSelect(option.id), [option.id, onSelect]);
  return (
    <motion.button
      type="button"
      onClick={click}
      whileTap={{ scale: 0.95 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 12px",
        borderRadius: "var(--radius-full)",
        flexShrink: 0,
        whiteSpace: "nowrap",
        cursor: "pointer",
        border: isActive ? `2px solid ${option.color}` : "1px solid var(--glass-border)",
        background: isActive ? `${option.color}18` : "var(--glass-bg)",
        fontSize: "var(--font-size-caption)",
        fontWeight: isActive ? 600 : 400,
        color: isActive ? option.color : "var(--color-text-secondary)",
        transition: "all var(--duration-fast)",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          backgroundColor: option.color,
          flexShrink: 0,
        }}
      />
      {option.displayName}
    </motion.button>
  );
});
