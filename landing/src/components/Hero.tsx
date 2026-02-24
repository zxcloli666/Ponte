export function Hero() {
  return (
    <section
      className="section"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* Decorative glow orbs */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(110, 142, 251, 0.12) 0%, transparent 70%)",
          top: "10%",
          left: "15%",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(167, 119, 227, 0.1) 0%, transparent 70%)",
          bottom: "15%",
          right: "10%",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div
          className="fade-in"
          style={{
            width: 88,
            height: 88,
            margin: "0 auto var(--space-xl)",
            borderRadius: "var(--radius-xl)",
            background: "var(--gradient-accent-vivid)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "var(--glow-accent)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 4h16v16H4z" opacity="0" />
            <path d="M8 3v3M16 3v3" />
            <path d="M4 8h16" />
            <path d="M9 12l2 2 4-4" />
            <rect x="3" y="5" width="18" height="16" rx="2" />
          </svg>
        </div>

        <h1
          className="fade-in fade-in-delay-1"
          style={{
            fontSize: "var(--font-size-display)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "var(--space-lg)",
            letterSpacing: "-0.03em",
          }}
        >
          <span className="gradient-text">Ponte</span>
        </h1>

        <p
          className="fade-in fade-in-delay-2"
          style={{
            fontSize: "var(--font-size-title2)",
            color: "var(--color-text-secondary)",
            maxWidth: 600,
            margin: "0 auto var(--space-2xl)",
            lineHeight: 1.5,
          }}
        >
          Мост между Android и iOS.
          <br />
          SMS, звонки, контакты и уведомления — на любом устройстве.
        </p>

        <div
          className="fade-in fade-in-delay-3"
          style={{ display: "flex", gap: "var(--space-md)", justifyContent: "center", flexWrap: "wrap" }}
        >
          <a href="#install" className="btn-primary">
            Начать
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#features"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-sm)",
              padding: "var(--space-md) var(--space-xl)",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-full)",
              color: "var(--color-text-primary)",
              fontWeight: 500,
              backdropFilter: "blur(var(--glass-blur-sm))",
              WebkitBackdropFilter: "blur(var(--glass-blur-sm))",
              transition: "all var(--duration-fast)",
            }}
          >
            Подробнее
          </a>
        </div>
      </div>
    </section>
  );
}
