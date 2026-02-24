import { create } from "zustand";
import { useShallow } from "zustand/shallow";

export interface Sim {
  id: string;
  deviceId: string;
  slotIndex: number;
  carrierName: string;
  displayName: string;
  displayNumber: string | null;
  color: string;
  isDefault: boolean;
}

export interface ExtraNumber {
  id: string;
  simId: string;
  displayName: string;
  displayNumber: string;
  color: string;
  prefix: string;
  sortOrder: number;
}

/** A selectable line option (SIM or ExtraNumber) */
export interface LineOption {
  type: "sim" | "extra";
  id: string;
  simId: string;
  extraNumberId?: string;
  displayName: string;
  displayNumber: string | null;
  color: string;
  carrierName?: string;
}

interface LinesState {
  sims: Sim[];
  extraNumbers: ExtraNumber[];
  selectedLineId: string | null;
  /** Per-conversation line selection */
  conversationLines: Record<string, string>;

  // Actions
  setSims: (sims: Sim[]) => void;
  setExtraNumbers: (extraNumbers: ExtraNumber[]) => void;
  selectLine: (lineId: string) => void;
  setConversationLine: (address: string, lineId: string) => void;
}

export const useLinesStore = create<LinesState>()((set, get) => ({
  sims: [],
  extraNumbers: [],
  selectedLineId: null,
  conversationLines: {},

  setSims: (sims) => {
    const defaultSim = sims.find((s) => s.isDefault);
    set({
      sims,
      selectedLineId: get().selectedLineId ?? defaultSim?.id ?? sims[0]?.id ?? null,
    });
  },

  setExtraNumbers: (extraNumbers) => set({ extraNumbers }),

  selectLine: (lineId) => set({ selectedLineId: lineId }),

  setConversationLine: (address, lineId) =>
    set((state) => ({
      conversationLines: { ...state.conversationLines, [address]: lineId },
    })),
}));

/**
 * Selector: get all line options (SIMs + their extra numbers) as flat list.
 */
export function useLineOptions(): LineOption[] {
  const { sims, extraNumbers } = useLinesStore(
    useShallow((s) => ({ sims: s.sims, extraNumbers: s.extraNumbers })),
  );

  const options: LineOption[] = [];

  for (const sim of sims) {
    options.push({
      type: "sim",
      id: sim.id,
      simId: sim.id,
      displayName: sim.displayName,
      displayNumber: sim.displayNumber,
      color: sim.color,
      carrierName: sim.carrierName,
    });

    const simExtras = extraNumbers
      .filter((en) => en.simId === sim.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    for (const en of simExtras) {
      options.push({
        type: "extra",
        id: en.id,
        simId: sim.id,
        extraNumberId: en.id,
        displayName: en.displayName,
        displayNumber: en.displayNumber,
        color: en.color,
        carrierName: sim.carrierName,
      });
    }
  }

  return options;
}
