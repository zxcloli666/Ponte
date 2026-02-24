/// <reference lib="webworker" />

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface ExtendedNotificationOptions extends NotificationOptions {
  actions?: NotificationAction[];
  vibrate?: number[];
}

declare global {
  interface ServiceWorkerRegistration {
    showNotification(title: string, options?: ExtendedNotificationOptions): Promise<void>;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Service Worker: push notifications, offline cache strategy.
 * Registered via vite-plugin-pwa.
 */

// Push notification handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data: Record<string, string>;
  try {
    data = event.data.json() as Record<string, string>;
  } catch {
    return;
  }

  if (data.type === "call:incoming") {
    event.waitUntil(
      self.registration.showNotification(data.callerName ?? "Входящий вызов", {
        body: `Входящий вызов \u2014 ${data.lineName ?? ""} ${data.lineNumber ?? ""}`.trim(),
        icon: "/icons/192.png",
        badge: "/icons/72.png",
        actions: [
          { action: "accept", title: "Ответить" },
          { action: "reject", title: "Отклонить" },
        ],
        tag: `call-${data.callId ?? "unknown"}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      }),
    );
  }

  if (data.type === "sms:new") {
    event.waitUntil(
      self.registration.showNotification(data.contactName ?? data.address ?? "SMS", {
        body: data.body ?? "",
        icon: "/icons/192.png",
        badge: "/icons/72.png",
        tag: `sms-${data.id ?? "unknown"}`,
        data: { url: `/sms/${data.address ?? ""}` },
      }),
    );
  }

  if (data.type === "notification:new") {
    event.waitUntil(
      self.registration.showNotification(data.title ?? data.appName ?? "Уведомление", {
        body: data.body ?? "",
        icon: "/icons/192.png",
        badge: "/icons/72.png",
        tag: `notif-${data.id ?? "unknown"}`,
      }),
    );
  }
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data as { url?: string } | undefined;

  if (action === "accept") {
    // Open active call screen
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        const client = clients[0];
        if (client) {
          client.navigate("/calls/active");
          client.focus();
        } else {
          self.clients.openWindow("/calls/active");
        }
      }),
    );
    return;
  }

  if (action === "reject") {
    // Just close the notification
    return;
  }

  // Default: open the relevant URL
  const url = data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const client = clients[0];
      if (client) {
        client.navigate(url);
        client.focus();
      } else {
        self.clients.openWindow(url);
      }
    }),
  );
});
