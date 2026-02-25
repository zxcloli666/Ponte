import { api } from "@/shared/api/client";
import { useCallback, useEffect, useState } from "react";

type PushPermission = "granted" | "denied" | "default" | "unsupported";

/**
 * Manage Web Push notification registration.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission as PushPermission;
  });

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission as PushPermission);
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === "undefined") return false;

    const result = await Notification.requestPermission();
    setPermission(result as PushPermission);

    if (result !== "granted") return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || ""),
      });

      // Send subscription to backend
      await api.post("push/subscribe", { json: subscription.toJSON() });
      return true;
    } catch (err) {
      console.error("[Push] Subscription failed:", err);
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post("push/unsubscribe");
      }
    } catch (err) {
      console.error("[Push] Unsubscribe failed:", err);
    }
  }, []);

  return { permission, subscribe, unsubscribe };
}

/**
 * Convert a base64 VAPID key to Uint8Array for pushManager.subscribe.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
