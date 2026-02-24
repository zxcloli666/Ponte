import { api } from "@/shared/api/client";
import type { Contact } from "./store";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Fetch all contacts (auto-paginates to get everything).
 */
export async function getContacts(
  page = 1,
  limit = 100,
): Promise<PaginatedResponse<Contact>> {
  const first = await api
    .get("contacts", { searchParams: { page, limit } })
    .json<PaginatedResponse<Contact>>();

  if (first.totalPages <= 1) return first;

  // Fetch remaining pages in parallel
  const remaining = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      api
        .get("contacts", { searchParams: { page: i + 2, limit } })
        .json<PaginatedResponse<Contact>>(),
    ),
  );

  return {
    ...first,
    items: [first.items, ...remaining.map((r) => r.items)].flat(),
  };
}

/**
 * Search contacts by query.
 */
export async function searchContacts(
  query: string,
  limit = 20,
): Promise<Contact[]> {
  return api
    .get("contacts/search", { searchParams: { q: query, limit } })
    .json<Contact[]>();
}
