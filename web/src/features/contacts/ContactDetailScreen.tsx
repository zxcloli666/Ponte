import { memo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Header } from "@/shared/ui/Header";
import { Avatar } from "@/shared/ui/Avatar";
import { Glass } from "@/shared/ui/Glass";
import { LineSelector } from "@/features/lines/LineSelector";
import { useLines } from "@/features/lines/hooks";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { useContactsStore, type ContactPhone } from "./store";

const PHONE_TYPE_LABELS: Record<string, string> = {
  mobile: "Мобильный",
  work: "Рабочий",
  home: "Домашний",
  main: "Основной",
  other: "Другой",
};

export default function ContactDetailScreen() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { selectedLineId, selectLine } = useLines();
  const contact = useContactsStore((s) => s.contacts.find((c) => c.id === contactId));

  const backBtn = (
    <button type="button" onClick={() => navigate("/contacts")} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--color-accent)" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
    </button>
  );

  if (!contact) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <Header title="Контакт" left={backBtn} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
          Контакт не найден
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header transparent left={backBtn} />

      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", paddingBottom: "var(--space-2xl)" }}>
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "var(--space-lg) var(--space-md)", gap: "var(--space-md)" }}
        >
          <Avatar name={contact.name} photoUrl={contact.photoUrl} size={96} />
          <h1 style={{ fontSize: 28, fontWeight: 600, textAlign: "center", letterSpacing: "-0.01em" }}>{contact.name}</h1>
        </motion.div>

        {/* Line selector */}
        <div style={{ display: "flex", justifyContent: "center", padding: "0 var(--space-md) var(--space-md)" }}>
          <LineSelector value={selectedLineId} onChange={selectLine} />
        </div>

        {/* Phone numbers */}
        <div style={{ padding: "0 var(--space-md)" }}>
          <Glass variant="card" padding="none" style={{ overflow: "hidden" }}>
            {contact.phones.map((phone, i) => (
              <PhoneRow key={`${phone.number}-${i}`} phone={phone} isLast={i === contact.phones.length - 1} />
            ))}
          </Glass>
        </div>
      </div>
    </div>
  );
}

const PhoneRow = memo(function PhoneRow({ phone, isLast }: { phone: ContactPhone; isLast: boolean }) {
  const navigate = useNavigate();
  const typeLabel = PHONE_TYPE_LABELS[phone.type.toLowerCase()] ?? (phone.label || phone.type);

  const handleCall = useCallback(() => navigate(`/calls/dialer?number=${encodeURIComponent(phone.number)}`), [navigate, phone.number]);
  const handleMessage = useCallback(() => navigate(`/sms/${encodeURIComponent(phone.number)}`), [navigate, phone.number]);

  return (
    <div style={{
      padding: "var(--space-md)",
      borderBottom: isLast ? "none" : "1px solid var(--glass-border)",
    }}>
      <p style={{ fontSize: "var(--font-size-caption)", color: "var(--color-text-tertiary)", marginBottom: 4 }}>
        {typeLabel}
      </p>
      <p style={{ fontSize: "var(--font-size-body)", color: "var(--color-accent)", marginBottom: "var(--space-sm)" }}>
        {formatPhoneNumber(phone.number)}
      </p>
      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <ActionBtn label="Написать" onClick={handleMessage}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>}
        />
        <ActionBtn label="Позвонить" onClick={handleCall}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.11 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>}
        />
      </div>
    </div>
  );
});

const ActionBtn = memo(function ActionBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.95 }}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 14px", borderRadius: "var(--radius-full)",
        background: "rgba(110, 142, 251, 0.12)", border: "1px solid rgba(110, 142, 251, 0.2)",
        color: "var(--color-accent)", fontSize: "var(--font-size-footnote)", fontWeight: 500,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
});
