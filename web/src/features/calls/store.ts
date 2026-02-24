import { create } from "zustand";

export interface CallRecord {
  id: string;
  simId: string;
  extraNumberId: string | null;
  direction: "incoming" | "outgoing" | "missed";
  address: string;
  contactId: string | null;
  contactName: string | null;
  contactPhotoUrl: string | null;
  duration: number;
  startedAt: string;
  endedAt: string | null;
}

export interface ActiveCall {
  callId: string;
  address: string;
  contactName: string | null;
  direction: "incoming" | "outgoing";
  simId: string;
  extraNumberId: string | null;
  status: "ringing" | "connecting" | "active" | "ended";
  startedAt: string;
}

interface CallsState {
  calls: CallRecord[];
  activeCall: ActiveCall | null;
  isLoading: boolean;
  filter: "all" | "missed";

  // Actions
  setCalls: (calls: CallRecord[]) => void;
  addCall: (call: CallRecord) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  updateActiveCallStatus: (status: ActiveCall["status"]) => void;
  setLoading: (loading: boolean) => void;
  setFilter: (filter: "all" | "missed") => void;
}

export const useCallsStore = create<CallsState>()((set, get) => ({
  calls: [],
  activeCall: null,
  isLoading: false,
  filter: "all",

  setCalls: (calls) => set({ calls }),

  addCall: (call) =>
    set({ calls: [call, ...get().calls] }),

  setActiveCall: (call) => set({ activeCall: call }),

  updateActiveCallStatus: (status) => {
    const current = get().activeCall;
    if (current) {
      set({ activeCall: { ...current, status } });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setFilter: (filter) => set({ filter }),
}));
