import { setLastEventId } from "@/shared/api/ws";
import type { Socket } from "socket.io-client";
import { useNotificationsStore } from "./store";

/**
 * Register notification Socket.IO event handlers.
 */
export function registerNotificationHandlers(socket: Socket): () => void {
  const handleNewNotification = (data: {
    id: string;
    packageName: string;
    appName: string;
    title: string;
    body: string;
    postedAt: string;
    ackId?: string;
    eventId?: string;
  }) => {
    const { ackId, eventId, ...notification } = data;
    useNotificationsStore.getState().addNotification(notification);

    socket.emit("notification:received", { id: data.id, ackId: ackId ?? data.id });

    if (eventId) {
      setLastEventId(eventId);
    }
  };

  socket.on("notification:new", handleNewNotification);

  return () => {
    socket.off("notification:new", handleNewNotification);
  };
}
