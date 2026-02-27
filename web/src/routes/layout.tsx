import { IncomingCallSheet } from "@/features/calls/IncomingCallSheet";
import { useNotifications } from "@/features/notifications/hooks";
import { useSmsUnread } from "@/features/sms/hooks";
import { TabBar } from "@/shared/ui/TabBar";
import { Outlet, useLocation } from "react-router";

const MsgIcon = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const MsgIconActive = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
);
const CallIcon = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const CallIconActive = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const BellIcon = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const BellIconActive = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);
const UserIcon = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const UserIconActive = () => (
  <svg
    aria-hidden="true"
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export function Layout() {
  const location = useLocation();
  const smsUnread = useSmsUnread();
  const { count: notifCount } = useNotifications();

  const hideTabBar =
    location.pathname.startsWith("/sms/") ||
    location.pathname === "/calls/dialer" ||
    location.pathname === "/calls/active" ||
    location.pathname.startsWith("/contacts/");

  const tabs = [
    {
      path: "/sms",
      label: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f",
      icon: <MsgIcon />,
      activeIcon: <MsgIconActive />,
      badge: smsUnread,
    },
    {
      path: "/calls",
      label: "\u0412\u044b\u0437\u043e\u0432\u044b",
      icon: <CallIcon />,
      activeIcon: <CallIconActive />,
    },
    {
      path: "/notifications",
      label: "\u0423\u0432\u0435\u0434\u043e\u043c\u043b\u0435\u043d\u0438\u044f",
      icon: <BellIcon />,
      activeIcon: <BellIconActive />,
      badge: notifCount > 0 ? notifCount : undefined,
    },
    {
      path: "/contacts",
      label: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b",
      icon: <UserIcon />,
      activeIcon: <UserIconActive />,
    },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
      <main
        style={{
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          paddingBottom: hideTabBar ? 0 : "var(--tab-bar-height)",
        }}
      >
        <div style={{ height: "100%" }}>
          <Outlet />
        </div>
      </main>
      {!hideTabBar && <TabBar tabs={tabs} />}
      <IncomingCallSheet />
    </div>
  );
}
