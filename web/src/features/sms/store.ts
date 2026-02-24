import { create } from "zustand";

export interface SmsMessage {
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
}

export interface Conversation {
  address: string;
  contactId: string | null;
  contactName: string | null;
  contactPhotoUrl: string | null;
  lastMessage: SmsMessage;
  unreadCount: number;
  simId: string;
  extraNumberId: string | null;
}

interface SmsState {
  /** All messages indexed by id */
  messagesById: Record<string, SmsMessage>;
  /** Message IDs grouped by address */
  messagesByAddress: Record<string, string[]>;
  /** Conversations list (derived, cached) */
  conversations: Conversation[];
  /** Loading states */
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (address: string, messages: SmsMessage[]) => void;
  addMessage: (message: SmsMessage) => void;
  updateMessageStatus: (id: string, status: SmsMessage["status"]) => void;
  markConversationRead: (address: string) => void;
  removeConversation: (address: string) => void;
  removeMessage: (id: string) => void;
  setLoadingConversations: (loading: boolean) => void;
  setLoadingMessages: (loading: boolean) => void;
}

export const useSmsStore = create<SmsState>()((set, get) => ({
  messagesById: {},
  messagesByAddress: {},
  conversations: [],
  isLoadingConversations: false,
  isLoadingMessages: false,

  setConversations: (conversations) => set({ conversations }),

  setMessages: (address, messages) => {
    const byId: Record<string, SmsMessage> = { ...get().messagesById };
    const ids: string[] = [];

    for (const msg of messages) {
      byId[msg.id] = msg;
      ids.push(msg.id);
    }

    set({
      messagesById: byId,
      messagesByAddress: {
        ...get().messagesByAddress,
        [address]: ids,
      },
    });
  },

  addMessage: (message) => {
    const state = get();
    const byId = { ...state.messagesById, [message.id]: message };
    const addressMsgs = state.messagesByAddress[message.address] ?? [];

    // Add to address group if not already present
    const newAddressMsgs = addressMsgs.includes(message.id)
      ? addressMsgs
      : [...addressMsgs, message.id];

    // Update conversations
    const existingConv = state.conversations.find(
      (c) => c.address === message.address,
    );
    let conversations: Conversation[];

    if (existingConv) {
      conversations = state.conversations.map((c) =>
        c.address === message.address
          ? {
              ...c,
              lastMessage: message,
              unreadCount:
                message.direction === "incoming"
                  ? c.unreadCount + 1
                  : c.unreadCount,
              simId: message.simId,
              extraNumberId: message.extraNumberId,
            }
          : c,
      );
    } else {
      conversations = [
        {
          address: message.address,
          contactId: message.contactId,
          contactName: null,
          contactPhotoUrl: null,
          lastMessage: message,
          unreadCount: message.direction === "incoming" ? 1 : 0,
          simId: message.simId,
          extraNumberId: message.extraNumberId,
        },
        ...state.conversations,
      ];
    }

    // Sort by latest message
    conversations.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime(),
    );

    set({
      messagesById: byId,
      messagesByAddress: {
        ...state.messagesByAddress,
        [message.address]: newAddressMsgs,
      },
      conversations,
    });
  },

  updateMessageStatus: (id, status) => {
    const msg = get().messagesById[id];
    if (!msg) return;
    set({
      messagesById: {
        ...get().messagesById,
        [id]: { ...msg, status },
      },
    });
  },

  markConversationRead: (address) => {
    set({
      conversations: get().conversations.map((c) =>
        c.address === address ? { ...c, unreadCount: 0 } : c,
      ),
    });
  },

  removeConversation: (address) => {
    const state = get();
    const msgIds = state.messagesByAddress[address] ?? [];
    const byId = { ...state.messagesById };
    for (const id of msgIds) delete byId[id];
    const { [address]: _, ...restByAddress } = state.messagesByAddress;
    set({
      messagesById: byId,
      messagesByAddress: restByAddress,
      conversations: state.conversations.filter((c) => c.address !== address),
    });
  },

  removeMessage: (id) => {
    const state = get();
    const msg = state.messagesById[id];
    if (!msg) return;
    const { [id]: _, ...restById } = state.messagesById;
    const addressMsgs = (state.messagesByAddress[msg.address] ?? []).filter((mid) => mid !== id);
    set({
      messagesById: restById,
      messagesByAddress: { ...state.messagesByAddress, [msg.address]: addressMsgs },
    });
  },

  setLoadingConversations: (loading) => set({ isLoadingConversations: loading }),
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
}));
