import { memo, useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineBadge } from "@/features/lines/LineBadge";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { formatDuration } from "@/shared/utils/date";
import { useActiveCall } from "./hooks";
import { endCall } from "./api";
import { getSocket } from "@/shared/api/ws";
import { router } from "@/router";

export default function ActiveCallScreen() {
  const { activeCall, setActiveCall } = useActiveCall();
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (activeCall?.status !== "active") { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // Navigate away when call ends (works both inside and outside Router context)
  useEffect(() => {
    if (!activeCall && window.location.pathname === "/calls/active") {
      router.navigate("/calls", { replace: true });
    }
  }, [activeCall]);

  const handleEnd = useCallback(() => {
    if (!activeCall) return;
    try { endCall(activeCall.callId); } catch {}
    setActiveCall(null);
  }, [activeCall, setActiveCall]);

  const handleAccept = useCallback(() => {
    if (activeCall) getSocket()?.emit("call:accept", { callId: activeCall.callId });
  }, [activeCall]);

  const handleDecline = useCallback(() => {
    if (activeCall) { getSocket()?.emit("call:reject", { callId: activeCall.callId }); setActiveCall(null); }
  }, [activeCall, setActiveCall]);

  if (!activeCall) return null;

  const displayName = activeCall.contactName || formatPhoneNumber(activeCall.address);
  const isRinging = activeCall.status === "ringing";

  const statusText: Record<string, string> = {
    ringing: activeCall.direction === "incoming" ? "Входящий вызов" : "Вызов...",
    connecting: "Подключение...",
    active: formatDuration(elapsed),
    ended: "Завершен",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 5000,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
        padding: "calc(var(--safe-top, 0px) + var(--space-3xl)) var(--space-lg) calc(var(--safe-bottom, 0px) + var(--space-2xl))",
        background: "linear-gradient(180deg, rgba(15,15,30,0.95) 0%, rgba(20,20,50,0.98) 50%, rgba(10,10,35,0.95) 100%)",
        backdropFilter: "blur(40px)",
        color: "#ffffff",
      }}
    >
      {/* Top: name, status */}
      <div style={{ textAlign: "center" }}>
        <motion.div
          animate={isRinging ? { boxShadow: ["0 0 0 0 rgba(110,142,251,0.4)", "0 0 0 28px rgba(110,142,251,0)", "0 0 0 0 rgba(110,142,251,0.4)"] } : {}}
          transition={isRinging ? { duration: 2, repeat: Infinity } : {}}
          style={{
            width: 100, height: 100, borderRadius: "50%",
            background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 38, fontWeight: 600, margin: "0 auto var(--space-lg)",
            boxShadow: "var(--glass-inner-glow)",
          }}
        >
          {(displayName[0] ?? "?").toUpperCase()}
        </motion.div>

        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: "var(--space-xs)", letterSpacing: "-0.01em" }}>{displayName}</h1>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-sm)" }}>
          <LineBadge simId={activeCall.simId} extraNumberId={activeCall.extraNumberId} showCarrier size="md" />
        </div>

        <p style={{ fontSize: "var(--font-size-subheadline)", color: "rgba(255, 255, 255, 0.6)" }}>
          {statusText[activeCall.status] ?? ""}
        </p>
      </div>

      {/* Controls */}
      <div>
        {isRinging && activeCall.direction === "incoming" ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3xl)" }}>
            <CallButton color="var(--color-danger)" label="Отклонить" onClick={handleDecline}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" style={{ transform: "rotate(135deg)" }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </CallButton>
            <CallButton color="var(--color-success)" label="Ответить" onClick={handleAccept} pulse>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </CallButton>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-xl)" }}>
            <CallButton
              color={isMuted ? "rgba(255,255,255,0.25)" : "var(--glass-bg)"}
              label={isMuted ? "Вкл. звук" : "Без звука"}
              onClick={() => setIsMuted((m) => !m)} small
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                {isMuted
                  ? <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
                  : <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />}
              </svg>
            </CallButton>

            <CallButton color="var(--color-danger)" label="Завершить" onClick={handleEnd}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" style={{ transform: "rotate(135deg)" }}>
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </CallButton>

            <div style={{ width: 56 }} /> {/* Spacer for symmetry */}
          </div>
        )}
      </div>
    </motion.div>
  );
}

const CallButton = memo(function CallButton({ color, label, onClick, children, small, pulse }: {
  color: string; label: string; onClick: () => void; children: React.ReactNode; small?: boolean; pulse?: boolean;
}) {
  const size = small ? 56 : 68;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <motion.button
        type="button" onClick={onClick} whileTap={{ scale: 0.9 }}
        animate={pulse ? { boxShadow: ["0 0 0 0 rgba(52,199,89,0.4)", "0 0 0 18px rgba(52,199,89,0)", "0 0 0 0 rgba(52,199,89,0.4)"] } : {}}
        transition={pulse ? { duration: 1.5, repeat: Infinity } : {}}
        style={{
          width: size, height: size, borderRadius: "50%", background: color,
          border: "1px solid var(--glass-border)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          backdropFilter: "blur(12px)",
        }}
      >
        {children}
      </motion.button>
      <span style={{ fontSize: "var(--font-size-caption)", color: "rgba(255, 255, 255, 0.6)" }}>{label}</span>
    </div>
  );
});
