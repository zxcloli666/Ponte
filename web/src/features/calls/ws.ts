import { setLastEventId } from "@/shared/api/ws";
import type { Socket } from "socket.io-client";
import { type ActiveCall, type CallRecord, useCallsStore } from "./store";

/**
 * Register call-related Socket.IO event handlers.
 */
export function registerCallHandlers(socket: Socket): () => void {
  const handleIncomingCall = (data: {
    callId: string;
    from: string;
    simId: string;
    extraNumberId?: string | null;
    sim?: { displayName: string; displayNumber: string; color: string } | null;
    contact?: { id: string; name: string; photoUrl: string | null } | null;
    extraNumber?: { displayName: string; displayNumber: string; color: string } | null;
    eventId?: string;
  }) => {
    const activeCall: ActiveCall = {
      callId: data.callId,
      address: data.from,
      contactName: data.contact?.name ?? null,
      direction: "incoming",
      simId: data.simId,
      extraNumberId: data.extraNumberId ?? null,
      status: "ringing",
      startedAt: new Date().toISOString(),
    };
    useCallsStore.getState().setActiveCall(activeCall);

    // Haptic feedback for incoming call
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    if (data.eventId) setLastEventId(data.eventId);
  };

  const handleCallStatus = (data: {
    callId: string;
    status: string;
    duration?: number;
    call?: CallRecord & { contact?: { id: string; name: string; photoUrl: string | null } | null };
  }) => {
    const store = useCallsStore.getState();
    const current = store.activeCall;

    // Update callId if we have a pending outgoing call (callId starts with "pending-")
    if (current?.callId.startsWith("pending-") && data.callId) {
      store.setActiveCall({
        ...current,
        callId: data.callId,
        status: data.status as ActiveCall["status"],
      });
      return;
    }

    switch (data.status) {
      case "ringing":
        store.updateActiveCallStatus("ringing");
        break;
      case "active":
        store.updateActiveCallStatus("active");
        break;
      case "ended": {
        store.updateActiveCallStatus("ended");

        // Clear active call after a brief delay
        setTimeout(() => {
          useCallsStore.getState().setActiveCall(null);
        }, 1500);

        // Add to call log if record provided
        if (data.call) {
          const call: CallRecord = {
            ...data.call,
            contactPhotoUrl: data.call.contactPhotoUrl ?? data.call.contact?.photoUrl ?? null,
          };
          store.addCall(call);
        }
        break;
      }
    }
  };

  socket.on("call:incoming", handleIncomingCall);
  socket.on("call:status", handleCallStatus);

  return () => {
    socket.off("call:incoming", handleIncomingCall);
    socket.off("call:status", handleCallStatus);
  };
}
