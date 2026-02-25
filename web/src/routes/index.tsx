import { useAuthStore } from "@/features/auth/store";
import { Spinner } from "@/shared/ui/Spinner";
import { Suspense, lazy } from "react";
import { Navigate, Outlet, useRouteError, isRouteErrorResponse, type RouteObject } from "react-router";
import { Layout } from "./layout";

/** Lazy-loaded screens for code splitting */
const PairingScreen = lazy(() => import("@/features/auth/PairingScreen"));
const ConversationsScreen = lazy(() => import("@/features/sms/ConversationsScreen"));
const ChatScreen = lazy(() => import("@/features/sms/ChatScreen"));
const CallLogScreen = lazy(() => import("@/features/calls/CallLogScreen"));
const Dialer = lazy(() => import("@/features/calls/Dialer"));
const ActiveCallScreen = lazy(() => import("@/features/calls/ActiveCallScreen"));
const NotificationsScreen = lazy(() => import("@/features/notifications/NotificationsScreen"));
const ContactsScreen = lazy(() => import("@/features/contacts/ContactsScreen"));
const ContactDetailScreen = lazy(() => import("@/features/contacts/ContactDetailScreen"));

function SuspenseFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 200,
      }}
    >
      <Spinner size={28} />
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Component />
    </Suspense>
  );
}

/** Redirects to /pair if not authenticated */
function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/pair" replace />;
  return <Outlet />;
}

/** Redirects to / if already authenticated */
function GuestOnly() {
  const token = useAuthStore((s) => s.accessToken);
  if (token) return <Navigate to="/" replace />;
  return <Outlet />;
}

function ErrorScreen({ code, title, message }: { code: string; title: string; message: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100dvh",
        padding: "var(--space-lg, 24px)",
        background: "var(--color-bg, #0a0a0f)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-lg, 24px)",
          padding: "var(--space-2xl, 48px) var(--space-xl, 32px)",
          background: "var(--glass-bg, rgba(255,255,255,0.05))",
          backdropFilter: "blur(var(--glass-blur, 40px))",
          WebkitBackdropFilter: "blur(var(--glass-blur, 40px))",
          border: "1px solid var(--glass-border, rgba(255,255,255,0.08))",
          borderRadius: "var(--radius-xl, 28px)",
          boxShadow:
            "var(--glass-shadow, 0 8px 32px rgba(0,0,0,0.4)), var(--glass-inner-glow, inset 0 1px 0 rgba(255,255,255,0.06))",
          maxWidth: 360,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-hero, 2.5rem)",
            fontWeight: "var(--font-weight-bold, 700)" as never,
            background: "var(--gradient-accent, linear-gradient(135deg, #6e8efb, #a777e3))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            lineHeight: 1,
          }}
        >
          {code}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm, 8px)" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--font-size-title2, 1.25rem)",
              fontWeight: "var(--font-weight-semibold, 600)" as never,
              color: "var(--color-text-primary, rgba(255,255,255,0.95))",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-subheadline, 0.9375rem)",
              color: "var(--color-text-secondary, rgba(255,255,255,0.55))",
              lineHeight: "var(--line-height-relaxed, 1.6)",
            }}
          >
            {message}
          </p>
        </div>

        <button
          onClick={() => window.location.assign("/")}
          style={{
            marginTop: "var(--space-sm, 8px)",
            padding: "12px 32px",
            borderRadius: "var(--radius-full, 9999px)",
            border: "none",
            background: "var(--gradient-accent, linear-gradient(135deg, #6e8efb, #a777e3))",
            color: "#fff",
            fontSize: "var(--font-size-body, 1rem)",
            fontWeight: "var(--font-weight-semibold, 600)" as never,
            cursor: "pointer",
            boxShadow: "var(--glow-accent, 0 0 20px rgba(110,142,251,0.3))",
            transition: "transform var(--duration-fast, 150ms) var(--ease-out)",
          }}
          onPointerDown={(e) => ((e.currentTarget.style.transform = "scale(0.96)"))}
          onPointerUp={(e) => ((e.currentTarget.style.transform = ""))}
          onPointerLeave={(e) => ((e.currentTarget.style.transform = ""))}
        >
          На главную
        </button>
      </div>
    </div>
  );
}

function RootErrorBoundary() {
  const error = useRouteError();
  const is404 = isRouteErrorResponse(error) && error.status === 404;

  if (is404) {
    return (
      <ErrorScreen
        code="404"
        title="Страница не найдена"
        message="Такой страницы не существует или она была перемещена."
      />
    );
  }

  return (
    <ErrorScreen
      code="Ошибка"
      title="Что-то пошло не так"
      message="Произошла непредвиденная ошибка. Попробуйте вернуться на главную."
    />
  );
}

export const routes: RouteObject[] = [
  {
    errorElement: <RootErrorBoundary />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          {
            path: "/pair",
            element: withSuspense(PairingScreen),
          },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <Layout />,
            children: [
              {
                index: true,
                element: <Navigate to="/sms" replace />,
              },
              {
                path: "sms",
                element: withSuspense(ConversationsScreen),
              },
              {
                path: "sms/:address",
                element: withSuspense(ChatScreen),
              },
              {
                path: "calls",
                element: withSuspense(CallLogScreen),
              },
              {
                path: "calls/dialer",
                element: withSuspense(Dialer),
              },
              {
                path: "calls/active",
                element: withSuspense(ActiveCallScreen),
              },
              {
                path: "notifications",
                element: withSuspense(NotificationsScreen),
              },
              {
                path: "contacts",
                element: withSuspense(ContactsScreen),
              },
              {
                path: "contacts/:contactId",
                element: withSuspense(ContactDetailScreen),
              },
            ],
          },
        ],
      },
    ],
  },
];
