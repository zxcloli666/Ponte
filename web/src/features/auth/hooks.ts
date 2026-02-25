import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useAuthStore } from "./store";

/**
 * Main auth hook. Returns auth state and actions.
 */
export function useAuth() {
  const { accessToken, pairingStatus, deviceName, logout } = useAuthStore(
    useShallow((s) => ({
      accessToken: s.accessToken,
      pairingStatus: s.pairingStatus,
      deviceName: s.deviceName,
      logout: s.logout,
    })),
  );

  const isAuthenticated = accessToken !== null;

  return { isAuthenticated, pairingStatus, deviceName, logout };
}

/**
 * Hook for pairing flow — returns pairing state and actions.
 */
export function usePairingStatus() {
  const { pairingToken, pairingStatus, setPairingToken, setPairingStatus } = useAuthStore(
    useShallow((s) => ({
      pairingToken: s.pairingToken,
      pairingStatus: s.pairingStatus,
      setPairingToken: s.setPairingToken,
      setPairingStatus: s.setPairingStatus,
    })),
  );

  const resetPairing = useCallback(() => {
    setPairingStatus("idle");
  }, [setPairingStatus]);

  return {
    pairingToken,
    pairingStatus,
    setPairingToken,
    setPairingStatus,
    resetPairing,
  };
}
