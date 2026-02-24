const features = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    title: "SMS",
    description:
      "Отправляйте и получайте SMS с iPhone, используя номер вашего Android. Поддержка нескольких SIM и виртуальных номеров.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
    title: "Звонки",
    description:
      "Управляйте звонками с любого устройства. Принимайте, отклоняйте и инициируйте вызовы прямо из браузера.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
    title: "Уведомления",
    description:
      "Все уведомления Android прямо на iPhone. Фильтрация по приложениям, OTP-коды извлекаются автоматически.",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: "Контакты",
    description:
      "Синхронизация контактов Android. Имена и фото отображаются во всех разделах — звонки, SMS и уведомления.",
  },
];

export function Features() {
  return (
    <section id="features" className="section">
      <div className="container">
        <h2
          className="fade-in"
          style={{
            fontSize: "var(--font-size-hero)",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "var(--space-md)",
            letterSpacing: "-0.02em",
          }}
        >
          Все возможности <span className="gradient-text">в одном месте</span>
        </h2>
        <p
          className="fade-in fade-in-delay-1"
          style={{
            fontSize: "var(--font-size-title3)",
            color: "var(--color-text-secondary)",
            textAlign: "center",
            maxWidth: 540,
            margin: "0 auto var(--space-3xl)",
          }}
        >
          Ponte связывает ваш Android и iOS через защищённое WebSocket-соединение
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "var(--space-lg)",
          }}
        >
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`glass-card fade-in fade-in-delay-${Math.min(i + 1, 3)}`}
              style={{ padding: "var(--space-xl)" }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--gradient-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "var(--space-lg)",
                  color: "#fff",
                }}
              >
                {f.icon}
              </div>
              <h3
                style={{
                  fontSize: "var(--font-size-title2)",
                  fontWeight: 600,
                  marginBottom: "var(--space-sm)",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--font-size-body)",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
