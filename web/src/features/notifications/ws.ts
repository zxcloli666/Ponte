import { setLastEventId } from "@/shared/api/ws";
import type { Socket } from "socket.io-client";
import { type AppNotification, useNotificationsStore } from "./store";

/**
 * Register notification Socket.IO event handlers.
 */
export function registerNotificationHandlers(socket: Socket): () => void {
  const handleNewNotification = (data: {
    notification: AppNotification;
    eventId?: string;
  }) => {
    useNotificationsStore.getState().addNotification(data.notification);

    socket.emit("notification:received", { id: data.notification.id });

    if (data.eventId) {
      setLastEventId(data.eventId);
    }
  };

  socket.on("notification:new", handleNewNotification);

  return () => {
    socket.off("notification:new", handleNewNotification);
  };
}
