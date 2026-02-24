import {
  memo,
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./Toast.module.css";

interface ToastData {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface ToastContextType {
  show: (message: string, type?: ToastData["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const show = useCallback(
    (message: string, type: ToastData["type"] = "info", duration = 2500) => {
      const id = `toast-${++toastId}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className={styles.container}>
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

const iconMap: Record<string, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u2139",
};

const colorMap: Record<string, string> = {
  success: "var(--color-success)",
  error: "var(--color-danger)",
  info: "var(--color-accent)",
};

const ToastItem = memo(function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 2500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const type = toast.type ?? "info";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={styles.toast}
    >
      <div className={styles.toastInner}>
        <span className={styles.toastIcon} style={{ color: colorMap[type] }}>
          {iconMap[type]}
        </span>
        <span className={styles.toastMessage}>{toast.message}</span>
      </div>
    </motion.div>
  );
});
