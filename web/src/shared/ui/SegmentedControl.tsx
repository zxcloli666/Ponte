import { motion } from "framer-motion";
import { type CSSProperties, memo, useCallback, useRef } from "react";
import styles from "./SegmentedControl.module.css";

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * Vision Pro glass segmented control with gradient active pill.
 */
function SegmentedControlInner<T extends string>({
  options,
  value,
  onChange,
  className = "",
  style,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndex = options.findIndex((o) => o.value === value);

  const handleClick = useCallback(
    (optionValue: T) => {
      onChange(optionValue);
    },
    [onChange],
  );

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${className}`.trim()}
      role="tablist"
      style={style}
    >
      {/* Sliding gradient indicator */}
      <motion.div
        className={styles.indicator}
        layout
        layoutId="segmented-indicator"
        style={{
          left: `calc(${(activeIndex / options.length) * 100}% + 3px)`,
          width: `calc(${100 / options.length}% - 6px)`,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
      />

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={option.value === value ? styles.segmentActive : styles.segment}
          onClick={() => handleClick(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export const SegmentedControl = memo(SegmentedControlInner) as typeof SegmentedControlInner;
