import { Glass } from "@/shared/ui/Glass";
import { Spinner } from "@/shared/ui/Spinner";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { checkPairingStatus, fetchQrToken } from "./api";
import { isPasskeySupported, registerPasskey } from "./passkey";
import { useAuthStore } from "./store";

export default function PairingScreen() {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPasskeyPrompt, setShowPasskeyPrompt] = useState(false);
  const [passkeyRegistering, setPasskeyRegistering] = useState(false);
  const pendingTokensRef = useRef<{ accessToken: string; refreshToken: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const setTokens = useAuthStore((s) => s.setTokens);
  const setPairingToken = useAuthStore((s) => s.setPairingToken);
  const setDeviceName = useAuthStore((s) => s.setDeviceName);

  const restartPairingRef = useRef<() => void>(() => {});

  const initPairing = useCallback(async () => {
    try {
      setError(null);
      const { pairingToken } = await fetchQrToken();
      setPairingToken(pairingToken);
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
      setQrValue(`ponte://pair?token=${pairingToken}&server=${encodeURIComponent(baseUrl)}`);

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const status = await checkPairingStatus(pairingToken);
          if (status.status === "connected" && status.accessToken && status.refreshToken) {
            if (pollRef.current) clearInterval(pollRef.current);
            setIsSuccess(true);
            if (status.deviceName) setDeviceName(status.deviceName);

            // Store tokens temporarily — we need them for passkey registration
            const tokens = { accessToken: status.accessToken, refreshToken: status.refreshToken };
            pendingTokensRef.current = tokens;

            // Set tokens now so the API client is authenticated for passkey registration
            setTokens(tokens.accessToken, tokens.refreshToken);

            // After success animation, show passkey prompt if supported
            if (isPasskeySupported()) {
              setTimeout(() => setShowPasskeyPrompt(true), 1200);
            }
          }
          // biome-ignore lint/suspicious/noExplicitAny: error handler
        } catch (e: any) {
          console.log("checkPairingStatus error:", e);
          // ---------- exception «pairing token expired» ----------
          if (e?.response?.status === 400) {
            try {
              const body = await e.response.json();
              const msg = body?.error?.message?.toLowerCase?.() ?? "";
              if (msg.includes("expired") || msg.includes("invalid")) {
                // токен устарел – перезапускаем процесс паринга
                if (pollRef.current) clearInterval(pollRef.current);
                setError("Токен pairing expired, getting new…");
                restartPairingRef.current();
                return;
              }
            } catch {
              if (pollRef.current) clearInterval(pollRef.current);
              restartPairingRef.current();
              return;
            }
          }

          console.error("checkPairingStatus error:", e);
        }
      }, 2000);
    } catch {
      setError("Не удалось получить код. Попробуйте снова.");
    }
  }, [setPairingToken, setTokens, setDeviceName]);

  restartPairingRef.current = () => {
    setTimeout(() => initPairing(), 500);
  };

  useEffect(() => {
    initPairing();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [initPairing]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-lg)",
        background: "var(--mesh-gradient)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Glow orbs */}
      <div
        style={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(110, 142, 251, 0.25)",
          filter: "blur(80px)",
          top: "10%",
          left: "-10%",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "rgba(167, 119, 227, 0.2)",
          filter: "blur(60px)",
          bottom: "15%",
          right: "-5%",
        }}
      />

      <AnimatePresence mode="wait">
        {isSuccess ? (
          showPasskeyPrompt ? (
            <motion.div
              key="passkey-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-xl)",
                width: "100%",
                maxWidth: 360,
              }}
            >
              <Glass
                variant="card"
                style={{
                  padding: "var(--space-xl)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-lg)",
                  width: "100%",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "var(--gradient-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                  }}
                >
                  {"\uD83D\uDD11"}
                </div>
                <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 600, margin: 0 }}>
                  Сохранить ключ доступа?
                </h2>
                <p
                  style={{
                    fontSize: "var(--font-size-subheadline)",
                    color: "var(--color-text-secondary)",
                    lineHeight: "var(--line-height-relaxed)",
                    margin: 0,
                  }}
                >
                  Вы сможете войти в Ponte из любого браузера или режима инкогнито без повторного
                  сканирования QR-кода
                </p>
                <div style={{ display: "flex", gap: "var(--space-md)", width: "100%" }}>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowPasskeyPrompt(false)}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "rgba(255, 255, 255, 0.7)",
                      fontSize: "var(--font-size-body)",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    Пропустить
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    disabled={passkeyRegistering}
                    onClick={async () => {
                      setPasskeyRegistering(true);
                      await registerPasskey();
                      setPasskeyRegistering(false);
                      setShowPasskeyPrompt(false);
                    }}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--gradient-accent)",
                      color: "#fff",
                      fontSize: "var(--font-size-body)",
                      fontWeight: 600,
                      cursor: passkeyRegistering ? "wait" : "pointer",
                      border: "none",
                      opacity: passkeyRegistering ? 0.7 : 1,
                    }}
                  >
                    {passkeyRegistering ? "Создание..." : "Создать ключ"}
                  </motion.button>
                </div>
              </Glass>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-lg)",
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  color: "#fff",
                  boxShadow: "0 0 30px rgba(52, 199, 89, 0.5)",
                }}
              >
                {"\u2713"}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                style={{ color: "#fff", fontSize: 24, fontWeight: 600, textAlign: "center" }}
              >
                Подключено!
              </motion.p>
            </motion.div>
          )
        ) : (
          <motion.div
            key="pairing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-xl)",
              width: "100%",
              maxWidth: 360,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <h1
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: "var(--space-sm)",
                  letterSpacing: "-0.02em",
                }}
              >
                Ponte
              </h1>
              <p style={{ fontSize: "var(--font-size-body)", color: "rgba(255, 255, 255, 0.7)" }}>
                Свяжите ваш Android-телефон
              </p>
            </div>

            <Glass
              variant="card"
              style={{
                padding: "var(--space-xl)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "var(--space-lg)",
                width: "100%",
              }}
            >
              {qrValue ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    padding: "var(--space-md)",
                    background: "#fff",
                    borderRadius: "var(--radius-lg)",
                  }}
                >
                  <QRCodeSVG
                    value={qrValue}
                    size={220}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    style={{ display: "block" }}
                  />
                </motion.div>
              ) : error ? (
                <div style={{ textAlign: "center", padding: "var(--space-xl) 0" }}>
                  <p style={{ color: "var(--color-danger)", marginBottom: "var(--space-md)" }}>
                    {error}
                  </p>
                  <motion.button
                    type="button"
                    onClick={initPairing}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: "var(--space-sm) var(--space-lg)",
                      borderRadius: "var(--radius-full)",
                      background: "var(--gradient-accent)",
                      color: "#fff",
                      fontSize: "var(--font-size-body)",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    Повторить
                  </motion.button>
                </div>
              ) : (
                <div style={{ padding: "var(--space-2xl) 0" }}>
                  <Spinner size={32} />
                </div>
              )}

              <p
                style={{
                  textAlign: "center",
                  fontSize: "var(--font-size-subheadline)",
                  color: "var(--color-text-secondary)",
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                Отсканируйте QR-код в Android-приложении Ponte
              </p>
            </Glass>

            {qrValue && !error && <WaitingDots />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WaitingDots() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
            transition={{
              duration: 1.4,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.6)",
              display: "block",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: "var(--font-size-footnote)", color: "rgba(255, 255, 255, 0.6)" }}>
        Ожидание подключения
      </span>
    </div>
  );
}
