import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { type Contact, useContactsStore } from "./store";

interface ContactSection {
  letter: string;
  contacts: Contact[];
}

/**
 * Get all contacts, grouped alphabetically.
 */
export function useContacts() {
  const { contacts, isLoading, searchQuery, setSearchQuery } = useContactsStore(
    useShallow((s) => ({
      contacts: s.contacts,
      isLoading: s.isLoading,
      searchQuery: s.searchQuery,
      setSearchQuery: s.setSearchQuery,
    })),
  );

  const filtered = useMemo(() => {
    if (!searchQuery) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phones.some((p) => p.number.includes(q)),
    );
  }, [contacts, searchQuery]);

  const sections: ContactSection[] = useMemo(() => {
    const sectionMap = new Map<string, Contact[]>();

    for (const contact of filtered) {
      const letter = (contact.name[0] ?? "#").toUpperCase();
      const existing = sectionMap.get(letter);
      if (existing) {
        existing.push(contact);
      } else {
        sectionMap.set(letter, [contact]);
      }
    }

    return Array.from(sectionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b, "ru"))
      .map(([letter, contacts]) => ({ letter, contacts }));
  }, [filtered]);

  const alphabet = useMemo(() => sections.map((s) => s.letter), [sections]);

  return {
    contacts: filtered,
    sections,
    alphabet,
    isLoading,
    searchQuery,
    setSearchQuery,
    totalCount: contacts.length,
  };
}

/**
 * Search contacts by query.
 */
export function useContactSearch(query: string) {
  const contacts = useContactsStore((s) => s.contacts);

  return useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return contacts
      .filter((c) => c.name.toLowerCase().includes(q) || c.phones.some((p) => p.number.includes(q)))
      .slice(0, 10);
  }, [contacts, query]);
}
