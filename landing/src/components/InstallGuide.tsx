const APP_URL = import.meta.env.VITE_APP_URL || "https://app.ponte.work.gd";

const installSteps = [
  {
    step: 1,
    title: "Откройте приложение в Safari",
    description:
      `Откройте ${APP_URL} в Safari на вашем iPhone. Важно: используйте именно Safari — другие браузеры не поддерживают установку PWA.`,
    visual: "safari-url-bar",
  },
  {
    step: 2,
    title: 'Нажмите "Поделиться"',
    description:
      'Найдите кнопку "Поделиться" (квадрат со стрелкой вверх) в нижней панели Safari и нажмите на неё.',
    visual: "share-button",
  },
  {
    step: 3,
    title: '"На экран Домой"',
    description:
      'Прокрутите вниз и выберите "На экран Домой" (Add to Home Screen). Подтвердите название и нажмите "Добавить".',
    visual: "add-home",
  },
  {
    step: 4,
    title: "Готово! Запускайте",
    description:
      "Ponte появится на домашнем экране как обычное приложение. Оно работает в полноэкранном режиме и поддерживает push-уведомления.",
    visual: "home-screen",
  },
];

function StepVisual({ visual }: { visual: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    "safari-url-bar": (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12" />
      </svg>
    ),
    "share-button": (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    ),
    "add-home": (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
    "home-screen": (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="2" />
        <path d="M9 8l2 2 4-4" />
      </svg>
    ),
  };

  return (
    <div
      style={{
        width: 96,
        height: 96,
        borderRadius: "var(--radius-xl)",
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--color-accent)",
        flexShrink: 0,
      }}
    >
      {iconMap[visual] ?? null}
    </div>
  );
}

export function InstallGuide() {
  return (
    <section id="install" className="section">
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
          Установка <span className="gradient-text">PWA на iOS</span>
        </h2>
        <p
          className="fade-in fade-in-delay-1"
          style={{
            fontSize: "var(--font-size-title3)",
            color: "var(--color-text-secondary)",
            textAlign: "center",
            maxWidth: 520,
            margin: "0 auto var(--space-3xl)",
          }}
        >
          Ponte работает как PWA — Progressive Web App. Установите его на iPhone за 30 секунд.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-lg)",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          {installSteps.map((item, i) => (
            <div
              key={item.step}
              className={`glass-card fade-in fade-in-delay-${Math.min(i + 1, 3)}`}
              style={{
                padding: "var(--space-xl)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-xl)",
              }}
            >
              <StepVisual visual={item.visual} />
              <div>
                <div
                  style={{
                    fontSize: "var(--font-size-caption)",
                    fontWeight: 600,
                    color: "var(--color-accent)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  Шаг {item.step}
                </div>
                <h3
                  style={{
                    fontSize: "var(--font-size-title3)",
                    fontWeight: 600,
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--font-size-body)",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA to open the PWA */}
        <div
          className="fade-in"
          style={{
            textAlign: "center",
            marginTop: "var(--space-2xl)",
          }}
        >
          <a
            href={import.meta.env.VITE_APP_URL || "https://app.ponte.work.gd"}
            className="btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть Ponte
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>

        {/* Feature callouts */}
        <div
          className="fade-in"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-xl)",
            marginTop: "var(--space-2xl)",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Полноэкранный режим", icon: "fullscreen" },
            { label: "Push-уведомления", icon: "bell" },
            { label: "Работает офлайн", icon: "wifi-off" },
          ].map((feat) => (
            <div
              key={feat.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-sm)",
                color: "var(--color-text-secondary)",
                fontSize: "var(--font-size-body)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--color-success)",
                }}
              />
              {feat.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
