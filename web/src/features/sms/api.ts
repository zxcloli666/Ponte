import { api } from "@/shared/api/client";
import { getSocket } from "@/shared/api/ws";
import type { Conversation, SmsMessage } from "./store";

interface BackendPaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

interface BackendConversation {
  address: string;
  lastMessage: BackendMessage;
  unreadCount: number;
}

interface BackendMessage {
  id: string;
  simId: string;
  extraNumberId: string | null;
  direction: "incoming" | "outgoing";
  address: string;
  contactId: string | null;
  body: string;
  extractedCode: string | null;
  status: "pending" | "delivered" | "failed";
  createdAt: string;
  sim?: { id: string; displayName: string; color: string } | null;
  extraNumber?: { id: string; displayName: string; color: string } | null;
  contact?: { id: string; name: string; photoUrl: string | null } | null;
}

function mapMessage(raw: BackendMessage): SmsMessage {
  return {
    id: raw.id,
    simId: raw.simId,
    extraNumberId: raw.extraNumberId ?? null,
    direction: raw.direction,
    address: raw.address,
    contactId: raw.contactId ?? null,
    body: raw.body,
    extractedCode: raw.extractedCode ?? null,
    status: raw.status,
    createdAt: raw.createdAt,
  };
}

function mapConversation(raw: BackendConversation): Conversation {
  return {
    address: raw.address,
    contactId: raw.lastMessage?.contactId ?? null,
    contactName: raw.lastMessage?.contact?.name ?? null,
    contactPhotoUrl: raw.lastMessage?.contact?.photoUrl ?? null,
    lastMessage: mapMessage(raw.lastMessage),
    unreadCount: raw.unreadCount,
    simId: raw.lastMessage?.simId ?? "",
    extraNumberId: raw.lastMessage?.extraNumberId ?? null,
  };
}

export async function getConversations(offset = 0, limit = 50): Promise<{ items: Conversation[] }> {
  const data = await api
    .get("sms/conversations", { searchParams: { offset, limit } })
    .json<BackendPaginatedResponse<BackendConversation>>();
  return { items: data.items.map(mapConversation) };
}

export async function getMessages(
  address: string,
  offset = 0,
  limit = 50,
): Promise<{ items: SmsMessage[] }> {
  const data = await api
    .get(`sms/conversations/${encodeURIComponent(address)}`, {
      searchParams: { offset, limit },
    })
    .json<BackendPaginatedResponse<BackendMessage>>();
  return { items: data.items.map(mapMessage) };
}

export async function markConversationRead(address: string): Promise<void> {
  await api.put(`sms/conversations/${encodeURIComponent(address)}/read`);
}

export async function deleteConversation(address: string): Promise<void> {
  await api.delete(`sms/conversations/${encodeURIComponent(address)}`);
}

export async function deleteMessage(id: string): Promise<void> {
  await api.delete(`sms/${id}`);
}

export function sendSms(params: {
  to: string;
  body: string;
  simId: string;
  extraNumberId?: string | null;
  tempId?: string;
}): Promise<{ messageId: string; status: string }> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket?.connected) {
      reject(new Error("WebSocket not connected"));
      return;
    }

    const timeout = setTimeout(() => {
      socket.off("sms:send:ack", handler);
      reject(new Error("SMS send timeout"));
    }, 15_000);

    const handler = (data: {
      tempId?: string;
      status: string;
      messageId?: string;
      error?: string;
    }) => {
      if (data.tempId !== params.tempId) return;
      socket.off("sms:send:ack", handler);
      clearTimeout(timeout);
      if (data.status === "error") {
        reject(new Error(data.error ?? "SMS send failed"));
      } else {
        resolve({ messageId: data.messageId ?? "", status: data.status });
      }
    };

    socket.on("sms:send:ack", handler);
    socket.emit("sms:send", params);
  });
}
