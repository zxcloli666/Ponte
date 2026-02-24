<p align="center">
  <img src="landing/public/icons/icon-192.png" width="80" alt="Ponte — мост Android-iPhone для SMS, звонков, контактов и уведомлений" />
</p>

<h1 align="center">Ponte — SMS и звонки с Android на iPhone</h1>

<p align="center">
  <strong>Мост Android → iPhone: SMS, звонки, контакты и уведомления в реальном времени</strong>
</p>

<p align="center">
  Используй номер Android-телефона на iPhone без переноса SIM-карты и переадресации.<br/>
  Отправляй и получай SMS, управляй звонками, синхронизируй контакты и получай уведомления — всё через PWA.
</p>

<p align="center">
  <a href="https://ponte.work.gd">Сайт</a> · <a href="https://app.ponte.work.gd">Веб-приложение</a>
</p>

---

## Что такое Ponte?

**Ponte** — open-source приложение-мост между Android и iPhone (iOS). Установи легковесное Android-приложение, открой PWA на iPhone — и всё работает: SMS, телефонные звонки, контакты, push-уведомления.

Ponte решает главную проблему перехода с Android на iPhone: **как сохранить свой номер телефона и не потерять SMS и звонки**, когда основным устройством становится iPhone, а SIM остаётся в Android.

**Без переноса SIM. Без платной переадресации. Без привязки к iMessage.**

### Для кого это?

- Перешёл на iPhone, но номер остался в Android — **получай SMS и звони прямо с iPhone**
- Два телефона (Android + iPhone) — **управляй обоими с одного экрана**
- Нужен доступ к Android-уведомлениям с любого устройства — **всё пробрасывается в реальном времени**
- Хочешь читать и отправлять SMS с компьютера — **открой PWA в браузере**

### Возможности

- **SMS-мост** — Отправляй и получай SMS с Android-номера на iPhone или в любом браузере. Поддержка двух SIM-карт и виртуальных номеров (Мегафон Мультиномер и аналоги).
- **Управление звонками** — Начинай, принимай, отклоняй и завершай телефонные звонки удалённо. Полная синхронизация журнала вызовов с именами контактов и аватарками.
- **Синхронизация контактов** — Автоматическая синхронизация контактов Android с именами, номерами телефонов и фото.
- **Пересылка уведомлений** — Все уведомления Android доставляются на iPhone в реальном времени. Фильтрация по приложениям, автоизвлечение OTP-кодов.
- **Две SIM-карты и доп. номера** — Полная поддержка Dual SIM и виртуальных номеров оператора.
- **PWA для iOS** — Устанавливается как полноценное приложение на iPhone через Safari. Push-уведомления, офлайн-режим, полноэкранный режим.
- **Синхронизация в реальном времени** — WebSocket-соединение с гарантированной доставкой (outbox-паттерн с подтверждениями и повторами).
- **Безопасность** — JWT-аутентификация, шифрованные настройки на Android, сопряжение через QR-код.

### Как это работает

```
Android-телефон                 Сервер (NestJS)                  iPhone / Браузер
┌──────────────┐    WebSocket    ┌──────────────┐    WebSocket    ┌──────────────┐
│ Приложение   │ ◄────────────► │  API-сервер  │ ◄────────────► │   PWA (Web)  │
│   Ponte      │                 │              │                 │              │
│ • SMS        │  REST (синхр.)  │ • PostgreSQL │   REST (авт.)  │ • Реалтайм   │
│ • Звонки     │ ─────────────► │ • Redis      │ ◄───────────── │ • Звонки     │
│ • Контакты   │                 │ • BullMQ     │                 │ • SMS-чат    │
│ • Уведомл.   │                 │ • JWT auth   │                 │ • Контакты   │
└──────────────┘                 └──────────────┘                 └──────────────┘
```

1. **Сопряжение** — Сканируешь QR-код в веб-приложении камерой Android
2. **Синхронизация** — Android загружает SMS, звонки, контакты через WebSocket
3. **Использование** — Открываешь PWA на iPhone — всё работает в реальном времени

## Структура проекта

```
ponte/
├── android/     — Android-приложение (Kotlin, Jetpack Compose, Hilt, Room)
├── backend/     — API-сервер (NestJS, TypeScript, Drizzle ORM, PostgreSQL)
├── web/         — PWA-клиент (React 19, TypeScript, Vite, Zustand)
└── landing/     — Лендинг (React 19, Vite, Firebase Hosting)
```

## Сервисы

| Сервис       | URL                              |
|--------------|----------------------------------|
| Лендинг      | https://ponte.work.gd            |
| Веб-приложение | https://app.ponte.work.gd      |
| API          | https://api.ponte.work.gd        |

## Быстрый старт

### Требования

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Android Studio (для Android-приложения)
- pnpm (web) / npm (landing, backend)

### Сервер

```bash
cd backend
cp .env.example .env   # настрой DATABASE_URL, REDIS_URL, JWT-секреты
npm install
npm run db:migrate
npm run dev
```

### Веб-приложение

```bash
cd web
cp .env.example .env   # настрой VITE_API_BASE_URL, VITE_WS_URL
pnpm install
pnpm dev
```

### Лендинг

```bash
cd landing
npm install
npm run dev
```

### Android

Открой `android/` в Android Studio, синхронизируй Gradle, запусти на устройстве с разрешениями SMS и звонков.

## Технологии

| Слой         | Стек                                                          |
|--------------|---------------------------------------------------------------|
| Android      | Kotlin, Jetpack Compose, Hilt, Room, Socket.IO, Retrofit     |
| Backend      | NestJS, TypeScript, Drizzle ORM, PostgreSQL, Redis, BullMQ   |
| Web          | React 19, TypeScript, Vite, Zustand, Socket.IO, Framer Motion|
| Landing      | React 19, TypeScript, Vite, Firebase Hosting                  |
| Дизайн       | Vision Pro glassmorphism, dark-first, CSS custom properties   |

## Сравнение с аналогами

| Функция                     | Ponte        | AirDroid   | Phone Link (Microsoft) |
|-----------------------------|--------------|------------|------------------------|
| SMS с Android на iPhone     | +            | Частично   | Только на ПК           |
| Управление звонками         | +            | -          | + (через BT)           |
| Синхронизация контактов     | +            | -          | Частично               |
| Пересылка уведомлений       | +            | +          | +                      |
| PWA (работает на iPhone)    | +            | -          | -                      |
| Open Source                 | +            | -          | -                      |
| Без подписки                | +            | Freemium   | Бесплатно              |

## Ключевые слова

Android на iPhone, SMS с Android на iPhone, звонки Android iPhone, мост Android iOS, управление Android с iPhone, SMS-мост, пересылка SMS Android, Android bridge iOS, remote SMS Android, управление звонками Android удалённо, два телефона Android iPhone, синхронизация контактов Android iPhone, уведомления Android на iPhone, PWA Android bridge, open source phone bridge

## Лицензия

MIT
