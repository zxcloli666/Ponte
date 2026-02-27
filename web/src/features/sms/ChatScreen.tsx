import { LineBadge } from "@/features/lines/LineBadge";
import { LineSelector } from "@/features/lines/LineSelector";
import { useLines } from "@/features/lines/hooks";
import { Avatar } from "@/shared/ui/Avatar";
import { Header } from "@/shared/ui/Header";
import { Spinner } from "@/shared/ui/Spinner";
import { extractCode } from "@/shared/utils/code-extractor";
import { formatMessageGroupDate, formatTime } from "@/shared/utils/date";
import { formatPhoneNumber } from "@/shared/utils/phone";
import { motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CodeBadge } from "./CodeBadge";
import { getMessages, sendSms } from "./api";
import { useConversation } from "./hooks";
import { type SmsMessage, useSmsStore } from "./store";

export default function ChatScreen() {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const decoded = address ? decodeURIComponent(address) : "";
  const { messages, isLoading, markRead } = useConversation(decoded);
  const setMessages = useSmsStore((s) => s.setMessages);
  const setLoadingMessages = useSmsStore((s) => s.setLoadingMessages);
  const addMessage = useSmsStore((s) => s.addMessage);
  const { selectedLineId, selectLine, conversationLines, setConversationLine } = useLines();
  const activeLine = conversationLines[decoded] ?? selectedLineId;
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!decoded) return;
    let c = false;
    (async () => {
      setLoadingMessages(true);
      try {
        const d = await getMessages(decoded);
        if (!c) {
          setMessages(decoded, d.items);
          markRead();
        }
      } catch (e) {
        console.error("Load messages failed:", e);
      } finally {
        if (!c) setLoadingMessages(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [decoded, setMessages, setLoadingMessages, markRead]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const grouped = useMemo(() => {
    const g: { date: string; messages: SmsMessage[] }[] = [];
    let cur: (typeof g)[number] | null = null;
    for (const m of messages) {
      const d = new Date(m.createdAt).toDateString();
      if (!cur || cur.date !== d) {
        cur = { date: d, messages: [] };
        g.push(cur);
      }
      cur.messages.push(m);
    }
    return g;
  }, [messages]);

  const conv = useSmsStore((s) => s.conversations.find((c) => c.address === decoded));
  const displayName = conv?.contactName || formatPhoneNumber(decoded);

  const handleSend = useCallback(async () => {
    const body = inputText.trim();
    if (!body || !activeLine) return;
    setIsSending(true);
    setInputText("");
    const tempId = `temp-${Date.now()}`;
    addMessage({
      id: tempId,
      simId: activeLine,
      extraNumberId: null,
      direction: "outgoing",
      address: decoded,
      contactId: conv?.contactId ?? null,
      body,
      extractedCode: null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    try {
      await sendSms({ to: decoded, body, simId: activeLine, tempId });
    } catch {
      useSmsStore.getState().updateMessageStatus(tempId, "failed");
    } finally {
      setIsSending(false);
    }
  }, [inputText, activeLine, decoded, conv?.contactId, addMessage]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );
  const handleLine = useCallback(
    (id: string) => {
      selectLine(id);
      setConversationLine(decoded, id);
    },
    [selectLine, setConversationLine, decoded],
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header
        title={displayName}
        left={
          <button
            type="button"
            onClick={() => navigate("/sms")}
            style={{ display: "flex", alignItems: "center", color: "var(--color-accent)" }}
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        }
        right={<Avatar name={conv?.contactName} size={30} />}
      >
        {conv && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "0 var(--space-md) var(--space-xs)",
            }}
          >
            <LineBadge
              simId={conv.simId}
              extraNumberId={conv.extraNumberId}
              showCarrier
              size="md"
            />
          </div>
        )}
      </Header>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overscrollBehavior: "contain",
          padding: "var(--space-sm) var(--space-md)",
        }}
      >
        {isLoading && messages.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-2xl)" }}>
            <Spinner size={24} />
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.date}>
              <div style={{ textAlign: "center", padding: "var(--space-md) 0 var(--space-sm)" }}>
                <span
                  style={{
                    fontSize: "var(--font-size-caption)",
                    color: "var(--color-text-tertiary)",
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    padding: "3px 12px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 500,
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {g.messages[0] && formatMessageGroupDate(g.messages[0].createdAt)}
                </span>
              </div>
              {g.messages.map((m, i) => (
                <Bubble
                  key={m.id}
                  message={m}
                  showTail={
                    i === g.messages.length - 1 || g.messages[i + 1]?.direction !== m.direction
                  }
                />
              ))}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          borderTop: "1px solid var(--glass-border)",
          background: "var(--glass-bg-solid)",
          backdropFilter: "blur(var(--glass-blur))",
          padding:
            "var(--space-sm) var(--space-md) calc(var(--safe-bottom, 0px) + var(--space-sm))",
        }}
      >
        <LineSelector
          value={activeLine}
          onChange={handleLine}
          style={{ marginBottom: "var(--space-xs)" }}
        />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-xl)",
              padding: "8px 14px",
              minHeight: 36,
            }}
          >
            <input
              type="text"
              placeholder="Сообщение"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKey}
              style={{
                flex: 1,
                fontSize: "var(--font-size-body)",
                background: "transparent",
                color: "var(--color-text-primary)",
                lineHeight: 1.4,
              }}
            />
          </div>
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isSending}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: inputText.trim() ? "var(--gradient-accent)" : "var(--glass-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: inputText.trim() ? "pointer" : "default",
              flexShrink: 0,
              border: "none",
              transition: "all var(--duration-fast)",
            }}
          >
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={inputText.trim() ? "#fff" : "var(--color-text-tertiary)"}
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

const Bubble = memo(function Bubble({
  message,
  showTail,
}: { message: SmsMessage; showTail: boolean }) {
  const out = message.direction === "outgoing";
  const code = message.extractedCode ?? extractCode(message.body);
  const pending = message.status === "pending";
  const failed = message.status === "failed";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: out ? "flex-end" : "flex-start",
        marginBottom: showTail ? 8 : 2,
        paddingLeft: out ? "15%" : 0,
        paddingRight: out ? 0 : "15%",
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          padding: "8px 12px",
          borderRadius: out
            ? showTail
              ? "var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg)"
              : "var(--radius-lg)"
            : showTail
              ? "var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-xs)"
              : "var(--radius-lg)",
          background: out ? "var(--gradient-accent)" : "var(--glass-bg)",
          border: out ? "none" : "1px solid var(--glass-border)",
          color: out ? "#fff" : "var(--color-text-primary)",
          opacity: pending ? 0.7 : 1,
          boxShadow: out ? "0 2px 12px rgba(110, 142, 251, 0.25)" : "none",
        }}
      >
        <p
          style={{
            fontSize: "var(--font-size-body)",
            lineHeight: "var(--line-height-normal)",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {message.body}
        </p>
        {code && (
          <div style={{ marginTop: 4 }}>
            <CodeBadge code={code} />
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            marginTop: 2,
          }}
        >
          <span style={{ fontSize: "var(--font-size-caption2)", opacity: 0.6 }}>
            {formatTime(new Date(message.createdAt))}
          </span>
          {out && (
            <span style={{ fontSize: 10, opacity: 0.6 }}>
              {failed ? "\u2717" : pending ? "\u25CB" : "\u2713"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
