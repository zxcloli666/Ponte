import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface Device {
  id: string;
  userId: string;
  name: string;
  androidVersion: string;
  lastSeenAt: string | null;
  createdAt: string;
}

interface DevicesState {
  devices: Device[];
  activeDeviceId: string | null;

  setDevices: (devices: Device[]) => void;
  setActiveDevice: (deviceId: string) => void;
}

export const useDevicesStore = create<DevicesState>()(
  persist(
    (set, get) => ({
      devices: [],
      activeDeviceId: null,

      setDevices: (devices) => {
        const current = get().activeDeviceId;
        const stillExists = devices.find((d) => d.id === current);
        set({
          devices,
          activeDeviceId: stillExists ? current : (devices[0]?.id ?? null),
        });
      },

      setActiveDevice: (deviceId) => set({ activeDeviceId: deviceId }),
    }),
    {
      name: "ponte-devices",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ activeDeviceId: s.activeDeviceId }),
    },
  ),
);
