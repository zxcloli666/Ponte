import { LineBadge } from "@/features/lines/LineBadge";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Header } from "@/shared/ui/Header";
import { PullToRefresh } from "@/shared/ui/PullToRefresh";
import { SearchBar } from "@/shared/ui/SearchBar";
import { Spinner } from "@/shared/ui/Spinner";
import { hasCode } from "@/shared/utils/code-extractor";
import { relativeTime } from "@/shared/utils/date";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { deleteConversation as deleteConvApi, getConversations } from "./api";
import { useConversations } from "./hooks";
import { type Conversation, useSmsStore } from "./store";

export default function ConversationsScreen() {
  const { conversations, isLoading } = useConversations();
  const [search, setSearch] = useState("");
  const setConversations = useSmsStore((s) => s.setConversations);
  const setLoading = useSmsStore((s) => s.setLoadingConversations);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const d = await getConversations();
        if (!c) setConversations(d.items);
      } catch (e) {
        console.error("Load conversations failed:", e);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [setConversations, setLoading]);

  const handleRefresh = useCallback(async () => {
    try {
      const d = await getConversations();
      setConversations(d.items);
    } catch {}
  }, [setConversations]);

  const filtered = search
    ? conversations.filter(
        (c) =>
          (c.contactName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          c.address.includes(search),
      )
    : conversations;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Сообщения" largeTitle>
        <div style={{ padding: "0 var(--space-md) var(--space-sm)" }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Поиск" />
        </div>
      </Header>
      <PullToRefresh onRefresh={handleRefresh}>
        {isLoading && conversations.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-2xl)" }}>
            <Spinner size={28} />
          </div>
        ) : filtered.length === 0 ? (
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
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
            }
            title={search ? "Ничего не найдено" : "Нет сообщений"}
            description={search ? "Попробуйте другой запрос" : "Сообщения появятся здесь"}
          />
        ) : (
          <div style={{ padding: "0 var(--space-sm)" }}>
            <AnimatePresence>
              {filtered.map((conv, i) => (
                <ConvItem key={conv.address} conv={conv} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}

const ConvItem = memo(function ConvItem({ conv, index }: { conv: Conversation; index: number }) {
  const navigate = useNavigate();
  const removeConversation = useSmsStore((s) => s.removeConversation);
  const click = useCallback(
    () => navigate(`/sms/${encodeURIComponent(conv.address)}`),
    [navigate, conv.address],
  );
  const handleDelete = useCallback(() => {
    removeConversation(conv.address);
    deleteConvApi(conv.address).catch(() => {});
  }, [conv.address, removeConversation]);
  const name = conv.contactName || formatPhoneNumber(conv.address);
  const isOtp = hasCode(conv.lastMessage.body);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -200 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.2 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.5, right: 0 }}
      onDragEnd={(_e, info) => {
        if (info.offset.x < -100) handleDelete();
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-md)",
        padding: "var(--space-md)",
        textAlign: "left",
        cursor: "grab",
        borderRadius: "var(--radius-lg)",
        marginBottom: 2,
        position: "relative",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        transition: "background var(--duration-fast)",
      }}
      onClick={click}
    >
      <Avatar name={conv.contactName} photoUrl={conv.contactPhotoUrl} size={48} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: "var(--font-size-body)",
              fontWeight: conv.unreadCount > 0 ? 600 : 400,
              color: "var(--color-text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontSize: "var(--font-size-caption)",
              color: "var(--color-text-tertiary)",
              marginLeft: 8,
              flexShrink: 0,
            }}
          >
            {relativeTime(conv.lastMessage.createdAt)}
          </span>
        </div>
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                fontSize: "var(--font-size-subheadline)",
                color:
                  conv.unreadCount > 0
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                fontWeight: conv.unreadCount > 0 ? 500 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {conv.lastMessage.direction === "outgoing" && (
                <span style={{ color: "var(--color-text-tertiary)" }}>Вы: </span>
              )}
              {conv.lastMessage.body}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <LineBadge simId={conv.simId} extraNumberId={conv.extraNumberId} />
              {isOtp && (
                <span
                  style={{
                    fontSize: "var(--font-size-caption2)",
                    fontWeight: 600,
                    background: "var(--gradient-accent-subtle)",
                    color: "var(--color-accent)",
                    padding: "1px 6px",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  КОД
                </span>
              )}
            </div>
          </div>
          {conv.unreadCount > 0 && <Badge count={conv.unreadCount} />}
        </div>
      </div>
    </motion.div>
  );
});
