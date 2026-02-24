import { useCallback } from "react";

/**
 * Haptic feedback hook.
 * Uses navigator.vibrate() where available (Android PWA, some browsers).
 * Falls back to no-op on iOS Safari PWA.
 */
export function useHaptics() {
  const light = useCallback(() => {
    navigator.vibrate?.(10);
  }, []);

  const medium = useCallback(() => {
    navigator.vibrate?.(20);
  }, []);

  const heavy = useCallback(() => {
    navigator.vibrate?.(40);
  }, []);

  const success = useCallback(() => {
    navigator.vibrate?.([10, 50, 10]);
  }, []);

  const error = useCallback(() => {
    navigator.vibrate?.([30, 50, 30, 50, 30]);
  }, []);

  return { light, medium, heavy, success, error };
}
