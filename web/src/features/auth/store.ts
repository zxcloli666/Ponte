import { idbStorage } from "@/shared/storage/idb";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type PairingStatus = "idle" | "pending" | "connected" | "error";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  pairingToken: string | null;
  pairingStatus: PairingStatus;
  deviceName: string | null;

  // Actions
  setPairingToken: (token: string) => void;
  setPairingStatus: (status: PairingStatus) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setDeviceName: (name: string) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      pairingToken: null,
      pairingStatus: "idle",
      deviceName: null,

      setPairingToken: (token) => set({ pairingToken: token, pairingStatus: "pending" }),

      setPairingStatus: (status) => set({ pairingStatus: status }),

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          pairingStatus: "connected",
        }),

      setDeviceName: (name) => set({ deviceName: name }),

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error("No refresh token");

        const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const res = await fetch(`${baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) throw new Error("Refresh failed");

        const json = await res.json();
        // Backend wraps responses in { data, meta } envelope (TransformInterceptor)
        const tokens = (json.data ?? json) as {
          accessToken: string;
          refreshToken: string;
        };
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        });
      },

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          pairingToken: null,
          pairingStatus: "idle",
          deviceName: null,
        }),
    }),
    {
      name: "ponte-auth",
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        pairingStatus: state.pairingStatus,
        deviceName: state.deviceName,
      }),
    },
  ),
);
