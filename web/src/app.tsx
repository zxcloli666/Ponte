import { useAuthStore } from "@/features/auth/store";
import ActiveCallScreen from "@/features/calls/ActiveCallScreen";
import { useCallsStore } from "@/features/calls/store";
import { registerCallHandlers } from "@/features/calls/ws";
import { getDevices } from "@/features/devices/api";
import { useDevicesStore } from "@/features/devices/store";
import { loadLines } from "@/features/lines/api";
import { useLinesStore } from "@/features/lines/store";
import { registerNotificationHandlers } from "@/features/notifications/ws";
import { registerSmsHandlers } from "@/features/sms/ws";
import { router } from "@/router";
import { connectSocket, disconnectSocket } from "@/shared/api/ws";
import { usePushNotifications } from "@/shared/hooks/usePushNotifications";
import { ToastProvider } from "@/shared/ui/Toast";
import { AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import { RouterProvider } from "react-router";

/**
 * Root application component.
 * Manages WebSocket connection, Zustand hydration, and routing.
 */
export function App() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeCall = useCallsStore((s) => s.activeCall);
  const { subscribe: subscribePush } = usePushNotifications();

  // Request push notification permission when authenticated
  useEffect(() => {
    if (!accessToken) return;
    subscribePush();
  }, [accessToken, subscribePush]);

  // Connect WebSocket when authenticated
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const cleanupSms = registerSmsHandlers(socket);
    const cleanupCalls = registerCallHandlers(socket);
    const cleanupNotifications = registerNotificationHandlers(socket);

    return () => {
      cleanupSms();
      cleanupCalls();
      cleanupNotifications();
      disconnectSocket();
    };
  }, [accessToken]);

  // Load devices, SIMs, and extra numbers when authenticated
  useEffect(() => {
    if (!accessToken) return;

    async function loadData() {
      try {
        const [devices, linesData] = await Promise.all([getDevices(), loadLines()]);

        useDevicesStore.getState().setDevices(devices);
        useLinesStore.getState().setSims(linesData.sims);
        useLinesStore.getState().setExtraNumbers(linesData.extraNumbers);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }

    loadData();
  }, [accessToken]);

  // Apply theme based on system preference
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      document.documentElement.setAttribute("data-theme", mql.matches ? "dark" : "light");
    };

    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  return (
    <ToastProvider>
      <RouterProvider router={router} />

      {/* Full-screen active call overlay (renders above everything) */}
      <AnimatePresence>
        {activeCall &&
          (activeCall.status === "active" ||
            activeCall.status === "connecting" ||
            activeCall.status === "ringing") && <ActiveCallScreen />}
      </AnimatePresence>
    </ToastProvider>
  );
}
