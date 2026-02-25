import { AnimatePresence, motion } from "framer-motion";
import { type ReactNode, memo } from "react";
import { NavLink, useLocation } from "react-router";
import { Badge } from "./Badge";
import styles from "./TabBar.module.css";

interface Tab {
  path: string;
  label: string;
  icon: ReactNode;
  activeIcon: ReactNode;
  badge?: number;
}

interface TabBarProps {
  tabs: Tab[];
}

/**
 * Vision Pro floating pill tab bar.
 * Centered at the bottom with rounded pill shape, glass background,
 * and gradient-filled active indicator.
 */
export const TabBar = memo(function TabBar({ tabs }: TabBarProps) {
  return (
    <nav className={styles.wrapper} role="tablist">
      <div className={styles.pill}>
        {tabs.map((tab) => (
          <TabBarItem key={tab.path} tab={tab} />
        ))}
      </div>
    </nav>
  );
});

function useIsActive(path: string): boolean {
  const location = useLocation();
  if (path === "/") return location.pathname === "/";
  return location.pathname.startsWith(path);
}

const TabBarItem = memo(function TabBarItem({ tab }: { tab: Tab }) {
  const active = useIsActive(tab.path);

  return (
    <NavLink
      to={tab.path}
      role="tab"
      aria-selected={active}
      aria-label={tab.label}
      className={active ? styles.tabActive : styles.tab}
    >
      <AnimatePresence>
        {active && (
          <motion.div
            className={styles.tabActivePill}
            layoutId="tab-active-pill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}
      </AnimatePresence>

      <div className={styles.tabIcon} style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          animate={{ scale: active ? 1 : 0.92 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <span className={active ? styles.tabIconActive : styles.tabIcon}>
            {active ? tab.activeIcon : tab.icon}
          </span>
        </motion.div>

        {tab.badge != null && tab.badge > 0 && (
          <div className={styles.badgeWrapper}>
            <Badge count={tab.badge} size="sm" />
          </div>
        )}
      </div>

      <span className={active ? styles.tabLabelActive : styles.tabLabel}>{tab.label}</span>
    </NavLink>
  );
});
