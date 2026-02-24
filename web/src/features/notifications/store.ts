import { create } from "zustand";

export interface AppNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  body: string;
  postedAt: string;
}

export interface NotificationGroup {
  appName: string;
  packageName: string;
  notifications: AppNotification[];
  isExpanded: boolean;
}

interface NotificationsState {
  notifications: AppNotification[];
  isLoading: boolean;

  // Actions
  setNotifications: (notifications: AppNotification[]) => void;
  addNotification: (notification: AppNotification) => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>()((set, get) => ({
  notifications: [],
  isLoading: false,

  setNotifications: (notifications) =>
    set({
      notifications: notifications.sort(
        (a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime(),
      ),
    }),

  addNotification: (notification) =>
    set({
      notifications: [notification, ...get().notifications],
    }),

  removeNotification: (id) =>
    set({
      notifications: get().notifications.filter((n) => n.id !== id),
    }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
