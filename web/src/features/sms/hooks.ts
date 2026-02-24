import { useMemo, useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useSmsStore, type SmsMessage } from "./store";
import { markConversationRead as markReadApi } from "./api";

/**
 * Get conversations list with unread total.
 */
export function useConversations() {
  const { conversations, isLoadingConversations } = useSmsStore(
    useShallow((s) => ({
      conversations: s.conversations,
      isLoadingConversations: s.isLoadingConversations,
    })),
  );

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  return { conversations, totalUnread, isLoading: isLoadingConversations };
}

/**
 * Get messages for a specific conversation by address.
 */
export function useConversation(address: string) {
  const { messagesByAddress, messagesById, isLoadingMessages, markConversationRead } =
    useSmsStore(
      useShallow((s) => ({
        messagesByAddress: s.messagesByAddress,
        messagesById: s.messagesById,
        isLoadingMessages: s.isLoadingMessages,
        markConversationRead: s.markConversationRead,
      })),
    );

  const messages: SmsMessage[] = useMemo(() => {
    const ids = messagesByAddress[address] ?? [];
    return ids
      .map((id) => messagesById[id])
      .filter((m): m is SmsMessage => m != null)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [messagesByAddress, messagesById, address]);

  const markRead = useCallback(() => {
    markConversationRead(address);
    // Persist to backend
    markReadApi(address).catch(() => {});
  }, [address, markConversationRead]);

  return { messages, isLoading: isLoadingMessages, markRead };
}

/**
 * Get total SMS unread count (for tab badge).
 */
export function useSmsUnread(): number {
  const conversations = useSmsStore((s) => s.conversations);
  return useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );
}
