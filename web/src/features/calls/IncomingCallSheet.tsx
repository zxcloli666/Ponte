import { LineBadge } from "@/features/lines/LineBadge";
import { getSocket } from "@/shared/api/ws";
import { Avatar } from "@/shared/ui/Avatar";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback } from "react";
import { useActiveCall } from "./hooks";

export const IncomingCallSheet = memo(function IncomingCallSheet() {
  const { activeCall, setActiveCall } = useActiveCall();
  const isVisible = activeCall?.status === "ringing" && activeCall.direction === "incoming";

  const handleAccept = useCallback(() => {
    if (activeCall) getSocket()?.emit("call:accept", { callId: activeCall.callId });
  }, [activeCall]);

  const handleDecline = useCallback(() => {
    if (activeCall) {
      getSocket()?.emit("call:reject", { callId: activeCall.callId });
      setActiveCall(null);
    }
  }, [activeCall, setActiveCall]);

  if (!activeCall) return null;
  const displayName = activeCall.contactName || formatPhoneNumber(activeCall.address);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed",
            top: "calc(var(--safe-top, 0px) + var(--space-sm))",
            left: "var(--space-sm)",
            right: "var(--space-sm)",
            zIndex: 8000,
            background: "var(--glass-bg-solid)",
            backdropFilter: "blur(var(--glass-blur))",
            WebkitBackdropFilter: "blur(var(--glass-blur))",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-md)",
            color: "#ffffff",
            border: "1px solid var(--glass-border)",
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4), var(--glass-inner-glow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            <Avatar name={activeCall.contactName} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: "var(--font-size-body)",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-tertiary)",
                  }}
                >
                  Входящий вызов
                </span>
                <LineBadge simId={activeCall.simId} extraNumberId={activeCall.extraNumberId} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <motion.button
                type="button"
                onClick={handleDecline}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--color-danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "none",
                }}
              >
                <svg
                  aria-hidden="true"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="#fff"
                  style={{ transform: "rotate(135deg)" }}
                >
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </motion.button>
              <motion.button
                type="button"
                onClick={handleAccept}
                whileTap={{ scale: 0.9 }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 0 16px rgba(52,199,89,0.4)",
                }}
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
