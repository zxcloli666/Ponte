import type { Socket } from "socket.io-client";
import { useSmsStore, type SmsMessage } from "./store";
import { setLastEventId } from "@/shared/api/ws";

/**
 * Register SMS-related Socket.IO event handlers.
 */
export function registerSmsHandlers(socket: Socket): () => void {
  const handleNewSms = (data: { message: SmsMessage; eventId?: string }) => {
    useSmsStore.getState().addMessage(data.message);

    // Acknowledge receipt
    socket.emit("sms:received", { id: data.message.id });

    // Track last event for reconnect sync
    if (data.eventId) {
      setLastEventId(data.eventId);
    }
  };

  const handleSmsStatus = (data: {
    id: string;
    status: "delivered" | "failed";
  }) => {
    useSmsStore.getState().updateMessageStatus(data.id, data.status);
  };

  socket.on("sms:new", handleNewSms);
  socket.on("sms:status", handleSmsStatus);

  // Return cleanup function
  return () => {
    socket.off("sms:new", handleNewSms);
    socket.off("sms:status", handleSmsStatus);
  };
}
