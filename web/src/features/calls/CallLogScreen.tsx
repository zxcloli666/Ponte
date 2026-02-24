import { memo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Header } from "@/shared/ui/Header";
import { Avatar } from "@/shared/ui/Avatar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PullToRefresh } from "@/shared/ui/PullToRefresh";
import { Spinner } from "@/shared/ui/Spinner";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { LineBadge } from "@/features/lines/LineBadge";
import { relativeTime, formatDuration } from "@/shared/utils/date";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { useCalls } from "./hooks";
import { getCalls } from "./api";
import { useCallsStore, type CallRecord } from "./store";

const FILTER_OPTIONS = [
  { value: "all" as const, label: "Все" },
  { value: "missed" as const, label: "Пропущенные" },
];

export default function CallLogScreen() {
  const { calls, isLoading, filter, setFilter } = useCalls();
  const setCalls = useCallsStore((s) => s.setCalls);
  const setLoading = useCallsStore((s) => s.setLoading);
  const navigate = useNavigate();

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try { const d = await getCalls(); if (!c) setCalls(d.items); }
      catch (e) { console.error("Load calls failed:", e); }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [setCalls, setLoading]);

  const handleRefresh = useCallback(async () => {
    try { const d = await getCalls(); setCalls(d.items); } catch {}
  }, [setCalls]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title="Вызовы"
        largeTitle
        right={
          <motion.button
            type="button"
            onClick={() => navigate("/calls/dialer")}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--color-accent)", cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </motion.button>
        }
      >
        <div style={{ padding: "0 var(--space-md) var(--space-sm)" }}>
          <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
        </div>
      </Header>

      <PullToRefresh onRefresh={handleRefresh}>
        {isLoading && calls.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-2xl)" }}><Spinner size={28} /></div>
        ) : calls.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>}
            title={filter === "missed" ? "Нет пропущенных" : "Нет вызовов"}
            description="История вызовов появится здесь"
          />
        ) : (
          <div style={{ padding: "0 var(--space-sm)" }}>
            {calls.map((call, i) => <CallItem key={call.id} call={call} index={i} />)}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}

const directionIcon: Record<string, { symbol: string; color: string }> = {
  incoming: { symbol: "\u2199", color: "var(--color-success)" },
  outgoing: { symbol: "\u2197", color: "var(--color-accent)" },
  missed: { symbol: "\u2199", color: "var(--color-danger)" },
};

const CallItem = memo(function CallItem({ call, index }: { call: CallRecord; index: number }) {
  const navigate = useNavigate();
  const displayName = call.contactName || formatPhoneNumber(call.address);
  const icon = directionIcon[call.direction] ?? directionIcon.incoming!;

  const handleCallBack = useCallback(() => {
    navigate(`/calls/dialer?number=${encodeURIComponent(call.address)}&simId=${call.simId}`);
  }, [navigate, call.address, call.simId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-md)",
        padding: "var(--space-md)", marginBottom: 2,
        background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)", cursor: "pointer",
      }}
      onClick={handleCallBack}
    >
      <Avatar name={call.contactName} photoUrl={call.contactPhotoUrl} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14, color: icon.color }}>{icon.symbol}</span>
          <span style={{
            fontSize: "var(--font-size-body)",
            fontWeight: call.direction === "missed" ? 600 : 400,
            color: call.direction === "missed" ? "var(--color-danger)" : "var(--color-text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {displayName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LineBadge simId={call.simId} extraNumberId={call.extraNumberId} />
          {call.direction !== "missed" && call.duration > 0 && (
            <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)" }}>
              {formatDuration(call.duration)}
            </span>
          )}
        </div>
      </div>
      <span style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)", flexShrink: 0 }}>
        {relativeTime(call.startedAt)}
      </span>
    </motion.div>
  );
});
