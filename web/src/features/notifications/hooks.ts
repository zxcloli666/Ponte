import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useNotificationsStore, type NotificationGroup } from "./store";

/**
 * Get notifications, optionally grouped by app.
 */
export function useNotifications() {
  const { notifications, isLoading } = useNotificationsStore(
    useShallow((s) => ({
      notifications: s.notifications,
      isLoading: s.isLoading,
    })),
  );

  const grouped: NotificationGroup[] = useMemo(() => {
    const groupMap = new Map<string, NotificationGroup>();

    for (const notif of notifications) {
      if (!notif?.packageName) continue;
      const existing = groupMap.get(notif.packageName);
      if (existing) {
        existing.notifications.push(notif);
      } else {
        groupMap.set(notif.packageName, {
          appName: notif.appName,
          packageName: notif.packageName,
          notifications: [notif],
          isExpanded: true,
        });
      }
    }

    return Array.from(groupMap.values());
  }, [notifications]);

  return { notifications, grouped, isLoading, count: notifications.length };
}
