import { useAuthStore } from "@/features/auth/store";
import { Spinner } from "@/shared/ui/Spinner";
import { Suspense, lazy } from "react";
import { Navigate, Outlet, type RouteObject } from "react-router";
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

/**
 * Route definitions for the app.
 * Pairing screen is guest-only (redirects to / if authenticated).
 * All other screens require authentication (redirect to /pair otherwise).
 */
export const routes: RouteObject[] = [
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
];
