import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useLinesStore, useLineOptions } from "./store";

/**
 * Get all lines and the current selection.
 */
export function useLines() {
  const { sims, extraNumbers, selectedLineId, selectLine, setConversationLine, conversationLines } =
    useLinesStore(
      useShallow((s) => ({
        sims: s.sims,
        extraNumbers: s.extraNumbers,
        selectedLineId: s.selectedLineId,
        selectLine: s.selectLine,
        setConversationLine: s.setConversationLine,
        conversationLines: s.conversationLines,
      })),
    );

  const options = useLineOptions();
  const showSelector = options.length > 1;

  return {
    sims,
    extraNumbers,
    options,
    selectedLineId,
    selectLine,
    showSelector,
    setConversationLine,
    conversationLines,
  };
}

/**
 * Resolve the display info for a line given simId and optional extraNumberId.
 * Priority: extraNumber > sim.
 */
export function useLineBadge(
  simId: string | null,
  extraNumberId?: string | null,
): {
  displayName: string;
  displayNumber: string | null;
  color: string;
  carrierName: string | null;
  isExtra: boolean;
} {
  const { sims, extraNumbers } = useLinesStore(
    useShallow((s) => ({ sims: s.sims, extraNumbers: s.extraNumbers })),
  );

  return useMemo(() => {
    if (extraNumberId) {
      const extra = extraNumbers.find((en) => en.id === extraNumberId);
      const sim = sims.find((s) => s.id === simId);
      if (extra) {
        return {
          displayName: extra.displayName,
          displayNumber: extra.displayNumber,
          color: extra.color,
          carrierName: sim?.carrierName ?? null,
          isExtra: true,
        };
      }
    }

    const sim = sims.find((s) => s.id === simId);
    if (sim) {
      return {
        displayName: sim.displayName,
        displayNumber: sim.displayNumber,
        color: sim.color,
        carrierName: sim.carrierName,
        isExtra: false,
      };
    }

    return {
      displayName: "Unknown",
      displayNumber: null,
      color: "#8e8e93",
      carrierName: null,
      isExtra: false,
    };
  }, [simId, extraNumberId, sims, extraNumbers]);
}
