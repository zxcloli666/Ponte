import { memo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/shared/ui/Header";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PullToRefresh } from "@/shared/ui/PullToRefresh";
import { Spinner } from "@/shared/ui/Spinner";
import { relativeTime } from "@/shared/utils/date";
import { useNotifications } from "./hooks";
import { useNotificationsStore, type AppNotification } from "./store";
import { api } from "@/shared/api/client";

export default function NotificationsScreen() {
  const { grouped, isLoading, notifications } = useNotifications();
  const setNotifications = useNotificationsStore((s) => s.setNotifications);
  const setLoading = useNotificationsStore((s) => s.setLoading);
  const removeNotification = useNotificationsStore((s) => s.removeNotification);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const d = await api.get("notifications", { searchParams: { page: 1, limit: 100 } }).json<{ items: AppNotification[] }>();
        if (!c) setNotifications(d.items);
      } catch (e) { console.error("Load notifications failed:", e); }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [setNotifications, setLoading]);

  const handleRefresh = useCallback(async () => {
    try {
      const d = await api.get("notifications", { searchParams: { page: 1, limit: 100 } }).json<{ items: AppNotification[] }>();
      setNotifications(d.items);
    } catch {}
  }, [setNotifications]);

  const handleDismiss = useCallback((id: string) => {
    removeNotification(id);
    api.delete(`notifications/${id}`).catch(() => {});
  }, [removeNotification]);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Уведомления" largeTitle />

      <PullToRefresh onRefresh={handleRefresh}>
        {isLoading && notifications.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-2xl)" }}><Spinner size={28} /></div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>}
            title="Нет уведомлений"
            description="Уведомления с Android появятся здесь"
          />
        ) : (
          <div style={{ padding: "var(--space-sm) var(--space-md)" }}>
            <AnimatePresence>
              {grouped.map((group) => (
                <div key={group.packageName} style={{ marginBottom: "var(--space-lg)" }}>
                  {/* App group header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "var(--space-sm) var(--space-xs)" }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: "var(--glass-bg)", border: "1px solid var(--glass-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)",
                    }}>
                      {(group.appName[0] ?? "?").toUpperCase()}
                    </div>
                    <span style={{
                      fontSize: "var(--font-size-caption)", fontWeight: 600,
                      color: "var(--color-text-tertiary)",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      {group.appName}
                    </span>
                  </div>

                  {group.notifications.map((notif) => (
                    <NotificationItem key={notif.id} notification={notif} onDismiss={handleDismiss} />
                  ))}
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}

const NotificationItem = memo(function NotificationItem({ notification, onDismiss }: { notification: AppNotification; onDismiss: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -200 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.5, right: 0 }}
      onDragEnd={(_e, info) => { if (info.offset.x < -100) onDismiss(notification.id); }}
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(var(--glass-blur))",
        WebkitBackdropFilter: "blur(var(--glass-blur))",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-md)",
        marginBottom: "var(--space-xs)",
        border: "1px solid var(--glass-border)",
        cursor: "grab",
        boxShadow: "var(--glass-shadow)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <p style={{ fontSize: "var(--font-size-subheadline)", fontWeight: 600, color: "var(--color-text-primary)", flex: 1 }}>
          {notification.title}
        </p>
        <span style={{ fontSize: "var(--font-size-caption2)", color: "var(--color-text-tertiary)", flexShrink: 0, marginLeft: 8 }}>
          {relativeTime(notification.postedAt)}
        </span>
      </div>
      <p style={{
        fontSize: "var(--font-size-subheadline)", color: "var(--color-text-secondary)",
        lineHeight: "var(--line-height-normal)",
        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>
        {notification.body}
      </p>
    </motion.div>
  );
});
