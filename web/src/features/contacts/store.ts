import { create } from "zustand";

export interface ContactPhone {
  number: string;
  type: string;
  label: string;
}

export interface Contact {
  id: string;
  name: string;
  phones: ContactPhone[];
  photoUrl: string | null;
}

interface ContactsState {
  contacts: Contact[];
  isLoading: boolean;
  searchQuery: string;

  // Actions
  setContacts: (contacts: Contact[]) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
}

export const useContactsStore = create<ContactsState>()((set) => ({
  contacts: [],
  isLoading: false,
  searchQuery: "",

  setContacts: (contacts) =>
    set({
      contacts: contacts.sort((a, b) => a.name.localeCompare(b.name, "ru")),
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
