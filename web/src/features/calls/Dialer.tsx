import { memo, useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { Header } from "@/shared/ui/Header";
import { LineSelector } from "@/features/lines/LineSelector";
import { useLines } from "@/features/lines/hooks";
import { initiateCall } from "./api";
import { useCallsStore } from "./store";

const DIALPAD: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*", letters: "" },
  { digit: "0", letters: "+" },
  { digit: "#", letters: "" },
];

export default function Dialer() {
  const [number, setNumber] = useState("");
  const { selectedLineId, selectLine } = useLines();
  const setActiveCall = useCallsStore((s) => s.setActiveCall);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill from URL params (e.g., from call log callback)
  useEffect(() => {
    const num = searchParams.get("number");
    if (num) setNumber(num);
    const sim = searchParams.get("simId");
    if (sim) selectLine(sim);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDigit = useCallback((digit: string) => {
    setNumber((prev) => prev + digit);
  }, []);

  const handleDelete = useCallback(() => {
    setNumber((prev) => prev.slice(0, -1));
  }, []);

  const handleCall = useCallback(() => {
    if (!number.trim() || !selectedLineId) return;
    try {
      initiateCall({ to: number.trim(), simId: selectedLineId });
      // Set initial state; ws.ts will update status via call:status events
      setActiveCall({
        callId: `pending-${Date.now()}`,
        address: number.trim(), contactName: null,
        direction: "outgoing", simId: selectedLineId, extraNumberId: null,
        status: "ringing", startedAt: new Date().toISOString(),
      });
      navigate("/calls/active");
    } catch (err) { console.error("Failed to initiate call:", err); }
  }, [number, selectedLineId, setActiveCall, navigate]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Набор номера"
        left={
          <button type="button" onClick={() => navigate("/calls")} style={{ display: "flex", alignItems: "center", color: "var(--color-accent)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        }
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "var(--space-md)", paddingBottom: "calc(var(--safe-bottom, 0px) + var(--space-xl))" }}>
        {/* Number display */}
        <div style={{ textAlign: "center", padding: "var(--space-lg) 0", minHeight: 60 }}>
          <span style={{
            fontSize: number.length > 12 ? 24 : 34, fontWeight: 200,
            letterSpacing: "0.04em", color: "var(--color-text-primary)",
            transition: "font-size var(--duration-fast)",
          }}>
            {number || "\u00A0"}
          </span>
        </div>

        {/* Line selector */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-lg)" }}>
          <LineSelector value={selectedLineId} onChange={selectLine} />
        </div>

        {/* Dial pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)", maxWidth: 280, margin: "0 auto", width: "100%" }}>
          {DIALPAD.map((key) => (
            <DialKey key={key.digit} digit={key.digit} letters={key.letters} onPress={handleDigit} />
          ))}
        </div>

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-md)", maxWidth: 280, margin: "var(--space-lg) auto 0", width: "100%", alignItems: "center", justifyItems: "center" }}>
          <div />
          <motion.button
            type="button" onClick={handleCall} whileTap={{ scale: 0.9 }}
            style={{
              width: 64, height: 64, borderRadius: "50%",
              background: number ? "var(--color-success)" : "var(--glass-bg)",
              border: number ? "none" : "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: number ? "pointer" : "default",
              boxShadow: number ? "0 4px 20px rgba(52, 199, 89, 0.4)" : "none",
              transition: "all var(--duration-normal)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill={number ? "#fff" : "var(--color-text-tertiary)"}>
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </motion.button>
          {number ? (
            <motion.button
              type="button" onClick={handleDelete} whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </motion.button>
          ) : <div />}
        </div>
      </div>
    </div>
  );
}

const DialKey = memo(function DialKey({ digit, letters, onPress }: { digit: string; letters: string; onPress: (d: string) => void }) {
  return (
    <motion.button
      type="button" onClick={() => onPress(digit)}
      whileTap={{ scale: 0.9, backgroundColor: "rgba(255,255,255,0.15)" }}
      style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        cursor: "pointer", margin: "0 auto",
        transition: "background var(--duration-fast)",
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, color: "var(--color-text-primary)" }}>{digit}</span>
      {letters && <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", color: "var(--color-text-tertiary)", lineHeight: 1 }}>{letters}</span>}
    </motion.button>
  );
});
