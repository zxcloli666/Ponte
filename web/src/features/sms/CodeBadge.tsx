import { memo, useCallback, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/shared/ui/Toast";

interface CodeBadgeProps {
  code: string;
  style?: CSSProperties;
}

export const CodeBadge = memo(function CodeBadge({ code, style }: CodeBadgeProps) {
  const toast = useToast();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.show("Код скопирован", "success");
    } catch {
      toast.show("Не удалось скопировать", "error");
    }
  }, [code, toast]);

  return (
    <motion.button
      type="button"
      onClick={handleCopy}
      whileTap={{ scale: 0.95 }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: "var(--radius-full)",
        background: "rgba(110, 142, 251, 0.15)",
        border: "1px solid rgba(110, 142, 251, 0.3)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-family-mono)",
          fontSize: "var(--font-size-body)",
          fontWeight: 700,
          color: "var(--color-accent)",
          letterSpacing: "0.08em",
        }}
      >
        {code}
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
    </motion.button>
  );
});
