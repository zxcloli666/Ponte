import { isPasskeySupported, registerPasskey } from "@/features/auth/passkey";
import { useAuthStore } from "@/features/auth/store";
import { Glass } from "@/shared/ui/Glass";
import { Header } from "@/shared/ui/Header";
import { motion } from "framer-motion";
import { useState } from "react";

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const deviceName = useAuthStore((s) => s.deviceName);
  const [passkeyStatus, setPasskeyStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleRegisterPasskey = async () => {
    setPasskeyStatus("loading");
    const ok = await registerPasskey();
    setPasskeyStatus(ok ? "done" : "error");
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Header title="Настройки" largeTitle />
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-md)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-md)",
        }}
      >
        {deviceName && (
          <Glass variant="card" style={{ padding: "var(--space-lg)" }}>
            <p
              style={{
                fontSize: "var(--font-size-subheadline)",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              Устройство
            </p>
            <p
              style={{
                fontSize: "var(--font-size-body)",
                color: "var(--color-text-primary)",
                margin: "var(--space-xs) 0 0",
                fontWeight: 600,
              }}
            >
              {deviceName}
            </p>
          </Glass>
        )}

        {isPasskeySupported() && (
          <Glass variant="card" style={{ padding: "var(--space-lg)" }}>
            <p
              style={{
                fontSize: "var(--font-size-subheadline)",
                color: "var(--color-text-secondary)",
                margin: "0 0 var(--space-sm)",
              }}
            >
              Ключ доступа позволяет войти из любого браузера без QR-кода
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={passkeyStatus === "loading" || passkeyStatus === "done"}
              onClick={handleRegisterPasskey}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "var(--radius-full)",
                background:
                  passkeyStatus === "done" ? "var(--color-success)" : "var(--gradient-accent)",
                color: "#fff",
                fontSize: "var(--font-size-body)",
                fontWeight: 600,
                cursor: passkeyStatus === "loading" ? "wait" : "pointer",
                border: "none",
                opacity: passkeyStatus === "loading" ? 0.7 : 1,
              }}
            >
              {passkeyStatus === "idle" && "Создать ключ доступа"}
              {passkeyStatus === "loading" && "Создание..."}
              {passkeyStatus === "done" && "Ключ создан"}
              {passkeyStatus === "error" && "Ошибка — попробовать снова"}
            </motion.button>
          </Glass>
        )}

        <Glass variant="card" style={{ padding: "0" }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={logout}
            style={{
              width: "100%",
              padding: "var(--space-lg)",
              background: "none",
              border: "none",
              color: "var(--color-danger)",
              fontSize: "var(--font-size-body)",
              fontWeight: 600,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Выйти
          </motion.button>
        </Glass>
      </div>
    </div>
  );
}
