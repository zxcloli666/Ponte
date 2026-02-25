import { Avatar } from "@/shared/ui/Avatar";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Header } from "@/shared/ui/Header";
import { PullToRefresh } from "@/shared/ui/PullToRefresh";
import { SearchBar } from "@/shared/ui/SearchBar";
import { Spinner } from "@/shared/ui/Spinner";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { motion } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getContacts } from "./api";
import { useContacts } from "./hooks";
import { type Contact, useContactsStore } from "./store";

export default function ContactsScreen() {
  const { sections, alphabet, isLoading, searchQuery, setSearchQuery, totalCount } = useContacts();
  const setContacts = useContactsStore((s) => s.setContacts);
  const setLoading = useContactsStore((s) => s.setLoading);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const d = await getContacts(1, 100);
        if (!c) setContacts(d.items);
      } catch (e) {
        console.error("Load contacts failed:", e);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [setContacts, setLoading]);

  const handleRefresh = useCallback(async () => {
    try {
      const d = await getContacts(1, 100);
      setContacts(d.items);
    } catch {}
  }, [setContacts]);

  const scrollToSection = useCallback((letter: string) => {
    document
      .getElementById(`section-${letter}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <Header title="Контакты" largeTitle>
        <div style={{ padding: "0 var(--space-md) var(--space-sm)" }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Поиск" />
        </div>
      </Header>

      <div style={{ flex: 1, position: "relative" }}>
        <PullToRefresh onRefresh={handleRefresh}>
          {isLoading && totalCount === 0 ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-2xl)" }}>
              <Spinner size={28} />
            </div>
          ) : sections.length === 0 ? (
            <EmptyState
              icon={
                <svg
                  aria-hidden="true"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              title={searchQuery ? "Ничего не найдено" : "Нет контактов"}
              description={
                searchQuery ? "Попробуйте другой запрос" : "Контакты с Android появятся здесь"
              }
            />
          ) : (
            <div style={{ padding: "0 var(--space-sm)" }}>
              {sections.map((section) => (
                <div key={section.letter} id={`section-${section.letter}`}>
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      padding: "var(--space-xs) var(--space-md)",
                      fontSize: "var(--font-size-footnote)",
                      fontWeight: 700,
                      color: "var(--color-text-secondary)",
                      background: "var(--glass-bg-solid)",
                      backdropFilter: "blur(var(--glass-blur))",
                    }}
                  >
                    {section.letter}
                  </div>
                  {section.contacts.map((contact, i) => (
                    <ContactItem key={contact.id} contact={contact} index={i} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </PullToRefresh>

        {alphabet.length > 3 && <AlphabetScrubber alphabet={alphabet} onSelect={scrollToSection} />}
      </div>
    </div>
  );
}

const ContactItem = memo(function ContactItem({
  contact,
  index,
}: { contact: Contact; index: number }) {
  const navigate = useNavigate();
  const click = useCallback(() => navigate(`/contacts/${contact.id}`), [navigate, contact.id]);
  const primaryPhone = contact.phones[0];

  return (
    <motion.button
      type="button"
      onClick={click}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.15 }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-sm) var(--space-md)",
        textAlign: "left",
        cursor: "pointer",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-lg)",
        marginBottom: 2,
        transition: "background var(--duration-fast)",
      }}
    >
      <Avatar name={contact.name} photoUrl={contact.photoUrl} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: "var(--font-size-body)",
            fontWeight: 400,
            color: "var(--color-text-primary)",
            display: "block",
          }}
        >
          {contact.name}
        </span>
        {primaryPhone && (
          <span
            style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)" }}
          >
            {formatPhoneNumber(primaryPhone.number)}
          </span>
        )}
      </div>
    </motion.button>
  );
});

const AlphabetScrubber = memo(function AlphabetScrubber({
  alphabet,
  onSelect,
}: { alphabet: string[]; onSelect: (l: string) => void }) {
  const [active, setActive] = useState<string | null>(null);

  const handleTouch = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const letter = el?.getAttribute("data-letter");
      if (letter) {
        setActive(letter);
        onSelect(letter);
      }
    },
    [onSelect],
  );

  return (
    <div
      onTouchMove={handleTouch}
      onTouchEnd={() => setActive(null)}
      style={{
        position: "absolute",
        right: 2,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "6px 3px",
        zIndex: 10,
        background: "var(--glass-bg)",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      {alphabet.map((letter) => (
        <button
          key={letter}
          type="button"
          data-letter={letter}
          onClick={() => onSelect(letter)}
          style={{
            padding: "1px 4px",
            fontSize: 10,
            fontWeight: active === letter ? 700 : 500,
            color: active === letter ? "var(--color-accent)" : "var(--color-text-tertiary)",
            lineHeight: 1.4,
            cursor: "pointer",
            transition: "color var(--duration-fast)",
          }}
        >
          {letter}
        </button>
      ))}
    </div>
  );
});
