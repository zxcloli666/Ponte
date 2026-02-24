const steps = [
  {
    number: "1",
    title: "Установите на Android",
    description:
      "Скачайте Ponte на ваш Android-телефон и предоставьте необходимые разрешения для SMS, звонков и уведомлений.",
  },
  {
    number: "2",
    title: "Отсканируйте QR-код",
    description:
      "Откройте Ponte на iPhone через браузер и отсканируйте QR-код для мгновенного сопряжения устройств.",
  },
  {
    number: "3",
    title: "Готово!",
    description:
      "Все SMS, звонки и уведомления с Android теперь доступны на вашем iPhone в реальном времени.",
  },
];

export function HowItWorks() {
  return (
    <section className="section" style={{ position: "relative" }}>
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
          Настройка за <span className="gradient-text">3 шага</span>
        </h2>
        <p
          className="fade-in fade-in-delay-1"
          style={{
            fontSize: "var(--font-size-title3)",
            color: "var(--color-text-secondary)",
            textAlign: "center",
            maxWidth: 480,
            margin: "0 auto var(--space-3xl)",
          }}
        >
          Никаких сложных настроек — просто установите и подключите
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "var(--space-xl)",
            position: "relative",
          }}
        >
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`fade-in fade-in-delay-${Math.min(i + 1, 3)}`}
              style={{ textAlign: "center" }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  margin: "0 auto var(--space-lg)",
                  borderRadius: "50%",
                  background: "var(--gradient-accent-vivid)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--font-size-title)",
                  fontWeight: 700,
                  color: "#fff",
                  boxShadow: "var(--glow-accent)",
                }}
              >
                {step.number}
              </div>
              <h3
                style={{
                  fontSize: "var(--font-size-title2)",
                  fontWeight: 600,
                  marginBottom: "var(--space-sm)",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--font-size-body)",
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.6,
                  maxWidth: 320,
                  margin: "0 auto",
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
