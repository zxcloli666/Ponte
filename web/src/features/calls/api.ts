import { api } from "@/shared/api/client";
import { getSocket } from "@/shared/api/ws";
import type { CallRecord } from "./store";

interface BackendCallRecord {
  id: string;
  simId: string;
  extraNumberId: string | null;
  direction: "incoming" | "outgoing" | "missed";
  address: string;
  contactId: string | null;
  duration: number;
  startedAt: string;
  endedAt: string | null;
  sim?: { id: string; displayName: string; color: string } | null;
  extraNumber?: { id: string; displayName: string; color: string } | null;
  contact?: { id: string; name: string; photoUrl: string | null } | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function mapCall(raw: BackendCallRecord): CallRecord {
  return {
    id: raw.id,
    simId: raw.simId,
    extraNumberId: raw.extraNumberId ?? null,
    direction: raw.direction,
    address: raw.address,
    contactId: raw.contactId ?? null,
    contactName: raw.contact?.name ?? null,
    contactPhotoUrl: raw.contact?.photoUrl ?? null,
    duration: raw.duration,
    startedAt: raw.startedAt,
    endedAt: raw.endedAt ?? null,
  };
}

export async function getCalls(
  page = 1,
  limit = 50,
): Promise<{ items: CallRecord[] }> {
  const data = await api
    .get("calls", { searchParams: { page, limit } })
    .json<PaginatedResponse<BackendCallRecord>>();
  return { items: data.items.map(mapCall) };
}

/**
 * Fire-and-forget call initiation via WebSocket.
 * Status updates come through ws.ts call:status handler.
 */
export function initiateCall(params: {
  to: string;
  simId: string;
  extraNumberId?: string | null;
}): void {
  const socket = getSocket();
  if (!socket?.connected) {
    throw new Error("WebSocket not connected");
  }
  socket.emit("call:initiate", params);
}

export function endCall(callId: string): void {
  const socket = getSocket();
  if (socket?.connected) {
    socket.emit("call:end", { callId });
  }
}
