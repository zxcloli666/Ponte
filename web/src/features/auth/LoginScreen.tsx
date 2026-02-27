import { Glass } from "@/shared/ui/Glass";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import { authenticateWithPasskey } from "./passkey";
import { useAuthStore } from "./store";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError(null);

    const result = await authenticateWithPasskey();
    if (result) {
      setTokens(result.accessToken, result.refreshToken);
      navigate("/", { replace: true });
    } else {
      setError("Не удалось войти. Попробуйте снова.");
    }
    setLoading(false);
  };

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
            Войдите с сохранённым ключом доступа
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
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            onClick={handlePasskeyLogin}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "var(--radius-full)",
              background: "var(--gradient-accent)",
              color: "#fff",
              fontSize: "var(--font-size-body)",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              border: "none",
              opacity: loading ? 0.7 : 1,
              boxShadow: "var(--glow-accent)",
            }}
          >
            {loading ? "Проверка..." : "Войти с ключом доступа"}
          </motion.button>

          {error && (
            <p
              style={{
                color: "var(--color-danger)",
                fontSize: "var(--font-size-subheadline)",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <div
            style={{
              width: "100%",
              height: 1,
              background: "rgba(255, 255, 255, 0.1)",
            }}
          />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/pair", { replace: true })}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "var(--radius-full)",
              background: "rgba(255, 255, 255, 0.08)",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "var(--font-size-body)",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
            }}
          >
            Сканировать QR-код
          </motion.button>
        </Glass>
      </motion.div>
    </div>
  );
}
