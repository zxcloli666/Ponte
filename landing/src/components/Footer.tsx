export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--glass-border)",
        padding: "var(--space-2xl) 0",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "var(--space-md)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              background: "var(--gradient-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M9 12l2 2 4-4" />
              <rect x="3" y="5" width="18" height="16" rx="2" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 600,
              fontSize: "var(--font-size-body)",
            }}
          >
            Ponte
          </span>
        </div>

        <p
          style={{
            fontSize: "var(--font-size-caption)",
            color: "var(--color-text-tertiary)",
          }}
        >
          Android &rarr; iOS bridge for SMS, calls & more
        </p>
      </div>
    </footer>
  );
}
