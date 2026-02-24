import {
  type ReactNode,
  memo,
  useCallback,
  useRef,
  useState,
} from "react";
import { Spinner } from "./Spinner";
import styles from "./PullToRefresh.module.css";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 64;

/**
 * Pull-to-refresh gesture handler.
 * Wraps scrollable content, shows accent-gradient spinner on pull-down.
 */
export const PullToRefresh = memo(function PullToRefresh({
  onRefresh,
  children,
  className = "",
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch && scrollRef.current?.scrollTop === 0) {
      startY.current = touch.clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;
      const touch = e.touches[0];
      if (!touch || scrollRef.current?.scrollTop !== 0) return;

      const delta = touch.clientY - startY.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.4, THRESHOLD * 1.5));
      }
    },
    [isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  const isAnimating = pullDistance === 0;

  return (
    <div className={`${styles.container} ${className}`.trim()}>
      {/* Pull indicator */}
      <div
        className={styles.indicator}
        style={{
          transform: `translate(-50%, ${pullDistance - 40}px)`,
          opacity: pullDistance / THRESHOLD,
          transition: isAnimating ? "all 0.3s ease" : "none",
        }}
      >
        <Spinner
          size={20}
          style={{
            transform: isRefreshing
              ? undefined
              : `rotate(${(pullDistance / THRESHOLD) * 360}deg)`,
          }}
        />
      </div>

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={styles.scrollable}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isAnimating ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
});
