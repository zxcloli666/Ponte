import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useCallsStore } from "./store";

/**
 * Get call log, optionally filtered.
 */
export function useCalls() {
  const { calls, isLoading, filter, setFilter } = useCallsStore(
    useShallow((s) => ({
      calls: s.calls,
      isLoading: s.isLoading,
      filter: s.filter,
      setFilter: s.setFilter,
    })),
  );

  const filteredCalls = useMemo(
    () => (filter === "missed" ? calls.filter((c) => c.direction === "missed") : calls),
    [calls, filter],
  );

  const missedCount = useMemo(() => calls.filter((c) => c.direction === "missed").length, [calls]);

  return { calls: filteredCalls, allCalls: calls, isLoading, filter, setFilter, missedCount };
}

/**
 * Get active call state.
 */
export function useActiveCall() {
  return useCallsStore(
    useShallow((s) => ({
      activeCall: s.activeCall,
      setActiveCall: s.setActiveCall,
      updateStatus: s.updateActiveCallStatus,
    })),
  );
}
