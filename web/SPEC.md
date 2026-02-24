# Ponte — iOS Web App (PWA)

> React 19 + TypeScript, Vite, Zustand, Socket.IO
> Деплой: Firebase Hosting (или Cloudflare Pages)
> PWA: Add to Home Screen, Push Notifications, offline shell

---

## 1. Общее описание

Progressive Web App для iOS Safari.
Пользователь открывает в браузере, добавляет на Home Screen через "Поделиться".
Полноценный интерфейс: SMS, звонки, уведомления, контакты.
Дизайн — iOS-native feel: glassmorphism, SF Pro-подобные шрифты,
Vision Pro-inspired effects, плавные анимации.

---

## 2. Стек

| Слой            | Технология                                 |
| --------------- | ------------------------------------------ |
| Framework       | React 19                                   |
| Bundler         | Vite 6                                     |
| Язык            | TypeScript 5.x (strict mode)              |
| State           | Zustand (global) + React.memo/useMemo     |
| Routing         | React Router 7                             |
| Real-time       | Socket.IO client                           |
| HTTP            | ky (tiny fetch wrapper)                    |
| UI              | CSS Modules + PostCSS (no framework)       |
| Animations      | Framer Motion                              |
| QR              | qrcode.react                               |
| Audio/Video     | WebRTC (native browser API)                |
| Push            | Web Push API + Service Worker              |
| PWA             | vite-plugin-pwa                            |
| Тесты           | Vitest + Testing Library                   |
| Lint            | Biome                                      |

---

## 3. Архитектура

```
src/
  main.tsx                        — entry point
  app.tsx                         — root component, providers, router

  routes/
    index.tsx                     — route definitions
    layout.tsx                    — app shell (tab bar, header)

  features/
    auth/
      store.ts                    — Zustand: tokens, pairing state
      hooks.ts                    — useAuth, usePairing
      api.ts                      — REST calls
      PairingScreen.tsx           — QR code generation + waiting
    sms/
      store.ts                    — Zustand: messages, conversations
      hooks.ts                    — useSms, useConversation
      api.ts                      — REST calls
      ws.ts                       — WebSocket event handlers
      ConversationsScreen.tsx     — Список диалогов
      ChatScreen.tsx              — Один диалог (chat bubbles)
      CodeBadge.tsx               — Extracted OTP code badge
    calls/
      store.ts                    — Zustand: call log, active call
      hooks.ts                    — useCalls, useActiveCall
      api.ts                      — REST
      ws.ts                       — WebSocket + WebRTC signaling
      CallLogScreen.tsx           — История вызовов
      ActiveCallScreen.tsx        — Экран активного вызова
      IncomingCallSheet.tsx       — Bottom sheet входящего вызова
      Dialer.tsx                  — Набор номера
    notifications/
      store.ts                    — Zustand: notifications list
      hooks.ts                    — useNotifications
      ws.ts                       — WebSocket handlers
      NotificationsScreen.tsx     — Лента уведомлений
    contacts/
      store.ts                    — Zustand: contacts list
      hooks.ts                    — useContacts, useContactSearch
      api.ts                      — REST
      ContactsScreen.tsx          — Список контактов
      ContactDetailScreen.tsx     — Детали контакта
    lines/
      store.ts                    — Zustand: SIMs + extra numbers
      hooks.ts                    — useLines, useLineBadge
      api.ts                      — REST
      LineBadge.tsx               — Цветной badge (SIM или доп. номер)
      LineSelector.tsx            — Pill selector для выбора линии

  shared/
    api/
      client.ts                   — ky instance, interceptors, auth
      ws.ts                       — Socket.IO singleton, reconnect
    hooks/
      useMediaQuery.ts            — responsive breakpoints
      usePushNotifications.ts     — Web Push registration
      useWebRTC.ts                — WebRTC peer connection management
      useHaptics.ts               — Haptic feedback (if available)
    ui/
      Glass.tsx                   — Glassmorphic container
      BlurBackground.tsx          — Backdrop blur wrapper
      TabBar.tsx                  — iOS-style tab bar
      Header.tsx                  — Navigation header with blur
      Avatar.tsx                  — Contact avatar
      Badge.tsx                   — Notification badge
      Spinner.tsx                 — Loading spinner
      PullToRefresh.tsx           — Pull-to-refresh gesture
      SegmentedControl.tsx        — iOS segmented control
      ActionSheet.tsx             — iOS action sheet
      Toast.tsx                   — Toast notifications
      EmptyState.tsx              — Empty state illustrations
    styles/
      tokens.css                  — Design tokens (CSS custom properties)
      glass.module.css            — Glassmorphic styles
      typography.module.css       — Font styles
      animations.module.css       — Shared animations
    utils/
      phone.ts                    — Phone number formatting
      date.ts                     — Relative time formatting
      code-extractor.ts           — OTP display logic

  service-worker/
    sw.ts                         — Service worker: push, offline cache
```

### Паттерны

- **Feature-based structure** — каждая фича изолирована со своим store, api, ws, компонентами.
- **Zustand slices** — каждый feature store — отдельный Zustand store. Никаких god-stores.
- **Selector pattern** — компоненты подписываются на конкретные селекторы, не на весь store.
- **React.memo + useMemo + useCallback** — мемоизация по умолчанию для списков и тяжёлых компонентов.
- **Optimistic updates** — UI обновляется мгновенно, откат при ошибке.
- **Compound components** — сложные UI-блоки как composable parts.

---

## 4. Дизайн

### Философия

iOS-native feel в вебе. Пользователь не должен чувствовать, что это PWA.
Вдохновение: iOS 18 UI, visionOS glassmorphism, Apple Human Interface Guidelines.

### Design Tokens

```css
:root {
  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.72);
  --glass-bg-dark: rgba(28, 28, 30, 0.72);
  --glass-blur: 24px;
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  /* Typography — SF Pro-like via system font stack */
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
    'SF Pro Text', system-ui, sans-serif;
  --font-size-caption: 0.75rem;    /* 12px */
  --font-size-body: 1rem;          /* 16px */
  --font-size-title: 1.25rem;      /* 20px */
  --font-size-large-title: 2rem;   /* 32px */

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Safe areas */
  --safe-top: env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);

  /* Virtual number colors (dynamic, set by JS from backend data) */
  --line-1-color: #007AFF;
  --line-2-color: #FF9500;
  --line-3-color: #34C759;
}
```

### Glassmorphism

Каждый "карточный" элемент — glass panel:
- `backdrop-filter: blur(var(--glass-blur))`.
- Semi-transparent background.
- Subtle border (1px, semi-transparent white).
- Soft shadow.
- `border-radius: var(--radius-lg)`.

### Цветовая схема

- Light mode: светлый blur-фон, белые glass-карточки.
- Dark mode: тёмный blur-фон, тёмные glass-карточки.
- Accent colors: iOS system blue (#007AFF) primary.
- Виртуальные номера: уникальные цвета (настраиваемые, из бэкенда).

### Анимации

- Page transitions: slide + fade (Framer Motion, `AnimatePresence`).
- List items: staggered fade-in.
- Pull-to-refresh: iOS-native feel (overscroll + spinner).
- Tab switch: crossfade.
- Incoming call: pulse glow effect.
- Всё с `will-change`, `transform`, `opacity` — GPU-accelerated.

### Haptics

- `navigator.vibrate()` для incoming call notification.
- Для остального — visual-only feedback (нет Taptic Engine API в PWA).

---

## 5. Экраны

### 5.1 Pairing Screen

- Полноэкранный QR-код (крупный, по центру).
- Под ним — инструкция: "Отсканируйте с Android-приложения Ponte".
- Animated dots ("Ожидание подключения…").
- При успешном pairing — confetti/checkmark animation → переход на Dashboard.
- Glassmorphic card с QR внутри, на размытом gradient background.

### 5.2 Tab Bar (Layout)

Нижний tab bar в стиле iOS:
1. **Сообщения** — SMS (иконка: message bubble)
2. **Вызовы** — Call log + dialer (иконка: phone)
3. **Уведомления** — App notifications (иконка: bell)
4. **Контакты** — Contact list (иконка: person)

Tab bar — glass panel с blur. Active tab — accent color. Badge count на табах.

### 5.3 SMS — Conversations List

- Список диалогов, сгруппированных по номеру/контакту.
- Каждый элемент:
  - Avatar (из контакта или initials).
  - Имя контакта / номер.
  - Последнее сообщение (preview, 1 строка, truncated).
  - Время последнего сообщения (relative: "5 мин", "Вчера").
  - **Line badge** — цветная точка / tag с именем виртуального номера.
  - Badge — unread count (если есть непрочитанные).
  - Если есть `extractedCode` в последнем сообщении — OTP badge.
- Поиск сверху (search bar в стиле iOS).
- Pull-to-refresh.

### 5.4 SMS — Chat Screen

- Chat bubbles в стиле iMessage:
  - Incoming — слева, серый glass.
  - Outgoing — справа, accent color.
  - Timestamp между группами сообщений.
- **Line indicator** — вверху экрана: какой виртуальный номер (имя + цвет + displayNumber).
- **OTP Code** — если сообщение содержит код:
  - Выделенный badge прямо в bubble.
  - Кнопка "Скопировать код" — копирует в clipboard.
  - Toast "Код скопирован".
- Input field внизу:
  - Текст + кнопка отправки.
  - Line selector (если несколько виртуальных номеров) — pill chips с цветами.
- Автоскролл вниз при новом сообщении.
- Виртуализация списка для длинных диалогов.

### 5.5 Calls — Call Log

- Список вызовов, как в iOS Phone app:
  - Avatar / initials.
  - Имя / номер.
  - Direction icon: ↙ incoming (зелёный), ↗ outgoing (синий), ↙ missed (красный).
  - **Line badge** с цветом виртуального номера.
  - Время вызова.
  - Длительность (если не missed).
- Segmented control сверху: "Все" / "Пропущенные".
- Кнопка вызова (трубка) при тапе — инициирует звонок через Android.

### 5.6 Calls — Dialer

- Номерной pad в стиле iOS.
- Line selector — pill chips с цветами виртуальных номеров (Осн. / Раб. / …).
- Кнопка вызова — зелёная, круглая.
- Поиск контакта при наборе (T9-style matching).

### 5.7 Calls — Active Call Screen

- Полноэкранный.
- Имя/номер сверху.
- Line badge (виртуальный номер).
- Таймер длительности.
- Кнопки: Mute, Speaker, End Call.
- Blur background с gradient.
- При incoming — пульсирующий glow, кнопки Accept (зелёная) / Decline (красная).
- Slide-to-answer gesture (опционально).

### 5.8 Calls — Incoming Call (Push Notification)

- Web Push notification с действиями: "Ответить" / "Отклонить".
- При открытии — сразу Active Call Screen.
- Sound: notification audio через Service Worker.

### 5.9 Notifications — Feed

- Хронологическая лента.
- Каждое уведомление:
  - App icon (если доступна) / app name badge.
  - Title (bold).
  - Body.
  - Время (relative).
- Группировка по приложению (expandable).
- Swipe-to-dismiss (visual only — не удаляет с Android).
- Pull-to-refresh.

### 5.10 Contacts

- Алфавитный список с section headers (А, Б, В…).
- Аватар, имя, основной номер.
- Alphabet scrubber справа (как в iOS Contacts).
- Поиск.
- Detail screen:
  - Аватар (большой).
  - Имя.
  - Все номера с типами (Mobile, Work, Home).
  - Кнопки: Позвонить, Написать (для каждого номера).
  - Line selector для действий (выбор виртуального номера).
- **Интеграция с iOS контактами:**
  - PWA не имеет прямого доступа к iOS Contacts API.
  - Workaround: Contact Picker API (`navigator.contacts`) — позволяет пользователю выбрать контакт.
  - Использовать для "merge" — если на iOS есть тот же контакт, показать обе версии.
  - Документировать ограничения.

---

## 6. Multi-SIM + Дополнительные номера — UX

### Два уровня

1. **Физическая SIM** — самостоятельная сущность. Yota и Мегафон — разные
   операторы, разные номера, разные цвета. Каждая SIM видна в UI.
2. **Дополнительные номера** — опциональная фича отдельных операторов
   (Мегафон "Мультиномер"). У Yota их нет. У Мегафона может быть
   "Рабочий" (prefix 20) и "Регистрации" (prefix 30).

Бэкенд отдаёт для каждого SMS/Call:
```typescript
// Всегда присутствует
interface Sim {
  id: string;
  slotIndex: number;
  carrierName: string;     // "Мегафон"
  displayName: string;     // "Мегафон"
  displayNumber: string;   // "+7 999 111-11-11"
  color: string;           // "#34C759"
  isDefault: boolean;
}

// Только если SMS/Call пришёл на дополнительный номер
interface ExtraNumber {
  id: string;
  displayName: string;     // "Рабочий"
  displayNumber: string;   // "+7 999 222-22-22"
  color: string;           // "#FF9500"
}
```

### Отображение — правила приоритета

**Если есть `extraNumber`** (звонок/SMS на доп. номер):
- Основной цвет и имя — из `extraNumber`.
- Мелким шрифтом — имя SIM (`sim.displayName`).
- Пример в списке: `🟠 Рабочий` / мелко: `Мегафон`.
- В header чата: `🟠 Рабочий +7 999 222-22-22 · Мегафон`.

**Если нет `extraNumber`** (обычный звонок на основной номер):
- Цвет и имя — из `sim`.
- Пример: `🔵 Yota +7 999 000-00-00` или `🟢 Мегафон +7 999 111-11-11`.

### Visual indicators

- **Цветная полоска** (2px border-left) в списках — цвет `extraNumber ?? sim`.
- **Badge** — короткое имя ("Раб.", "Yota") на цветном фоне.
- **Header** чата / call screen — полное имя + номер + цветная точка.

### Выбор линии для исходящих

**Pill selector** — flat list из SIM-ок и их доп. номеров:

```
┌──────────────────────────────────────────────────┐
│ 🔵 Yota   🟢 Мегафон   🟠 Рабочий   ⚪ Рег.   │
└──────────────────────────────────────────────────┘
```

- Физические SIM — крупные chips.
- Доп. номера — чуть мельче, визуально "под" своей SIM.
- Если 1 SIM без доп. номеров — selector скрыт.
- Запоминать выбор per-conversation (Zustand persist).
- Default: SIM с `isDefault: true`.

### Number Line Indicator

В SMS conversations и call log — слева от аватара тонкая цветная
полоска (2px border-left). Мгновенное визуальное различение линий.

---

## 7. Real-time (WebSocket)

### Подключение

```typescript
const socket = io('wss://api.ponte.app', {
  auth: { token: accessToken },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});
```

### Event handlers

Каждый feature module регистрирует свои handlers в `ws.ts`:

```typescript
// sms/ws.ts
export function registerSmsHandlers(socket: Socket) {
  socket.on('sms:new', (data) => {
    useSmsStore.getState().addMessage(data.message);
    // Send ack
    socket.emit('sms:received', { id: data.message.id });
  });
}
```

### Reconnect sync

При reconnect — отправить `sync:request` с `lastEventId` из Zustand persist.
Бэкенд досылает пропущенные события.

---

## 8. WebRTC (Calls)

### useWebRTC hook

```typescript
function useWebRTC() {
  // Manages PeerConnection lifecycle
  // Handles offer/answer/ICE through WebSocket
  // Returns: { localStream, remoteStream, connect, disconnect, mute, unmute }
}
```

### Flow

1. Incoming call → WebSocket `call:incoming`.
2. User accepts → emit `call:accept`.
3. Backend forwards → Android sends WebRTC offer.
4. `useWebRTC` creates answer, exchanges ICE.
5. Audio stream established.
6. UI shows ActiveCallScreen with controls.

### Outgoing call

1. User dials → emit `call:initiate { to, simId }`.
2. Backend forwards to Android.
3. Android initiates real call, sends WebRTC offer.
4. Same WebRTC flow.

---

## 9. Push Notifications

### Service Worker

```typescript
// service-worker/sw.ts
self.addEventListener('push', (event) => {
  const data = event.data.json();

  if (data.type === 'call:incoming') {
    event.waitUntil(
      self.registration.showNotification(data.callerName, {
        body: `Входящий вызов — ${data.lineName} ${data.lineNumber}`,
        icon: '/icons/phone.png',
        actions: [
          { action: 'accept', title: 'Ответить' },
          { action: 'reject', title: 'Отклонить' },
        ],
        tag: `call-${data.callId}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      }),
    );
  }

  if (data.type === 'sms:new') {
    event.waitUntil(
      self.registration.showNotification(data.contactName || data.address, {
        body: data.body,
        icon: '/icons/message.png',
        tag: `sms-${data.id}`,
        data: { url: `/sms/${data.address}` },
      }),
    );
  }
});
```

### Registration

При pairing — запросить разрешение на Push Notifications.
Отправить subscription endpoint на бэкенд.
Бэкенд использует web-push library для отправки.

---

## 10. PWA

### Manifest

```json
{
  "name": "Ponte",
  "short_name": "Ponte",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#007AFF",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192" },
    { "src": "/icons/512.png", "sizes": "512x512" }
  ]
}
```

### Offline

- Service Worker кеширует app shell (HTML, CSS, JS).
- При offline — показывать cached данные из Zustand persist.
- Banner "Нет подключения" сверху.
- Новые данные подтянутся при reconnect.

### iOS PWA quirks

- `apple-mobile-web-app-capable`: `yes`.
- `apple-mobile-web-app-status-bar-style`: `black-translucent`.
- Splash screens для всех размеров iPhone.
- `viewport-fit=cover` для edge-to-edge.
- Safe area insets через `env()`.
- Нет badge API — badge count только визуально в app.

---

## 11. Деплой

### Firebase Hosting

```
firebase.json:
{
  "hosting": {
    "public": "dist",
    "cleanUrls": true,
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [{
      "source": "**",
      "headers": [{
        "key": "Cache-Control",
        "value": "public, max-age=31536000, immutable"
      }]
    }, {
      "source": "index.html",
      "headers": [{
        "key": "Cache-Control",
        "value": "no-cache"
      }]
    }]
  }
}
```

### CI/CD

- GitHub Actions:
  - On push to `main`: lint → test → build → deploy to Firebase Hosting.
  - Preview deploys on PR (Firebase Hosting channels).

### Альтернатива: Cloudflare Pages

- Если Firebase не подходит — Cloudflare Pages как fallback.
- Конфиг аналогичный, SPA routing через `_redirects`.

---

## 12. Производительность

| Метрика         | Цель         | Как                                    |
| --------------- | ------------ | -------------------------------------- |
| FCP             | < 1s         | Minimal bundle, code splitting         |
| LCP             | < 1.5s       | Preload critical assets                |
| CLS             | < 0.05       | Fixed layouts, skeleton screens        |
| Bundle size     | < 150KB gz   | Tree shaking, dynamic imports          |

### Конкретные меры

- **Code splitting** — lazy routes (`React.lazy`).
- **Virtualized lists** — `@tanstack/react-virtual` для SMS, Calls, Contacts, Notifications.
- **React.memo** — все list items, badges, avatars.
- **Zustand selectors** — shallow equality, no unnecessary re-renders.
- **Image optimization** — contact photos через `<img loading="lazy">`, WebP.
- **Debounce** — search inputs (300ms).
- **Skeleton screens** — при загрузке данных (не spinner, а плейсхолдеры).

---

## 13. Безопасность

- JWT хранится в `sessionStorage` (не `localStorage` — изолирован от других табов).
- Refresh token — в httpOnly cookie (secure, sameSite: strict).
- CSP headers: no inline scripts, restrict origins.
- No sensitive data in Service Worker cache.
- WebSocket auth: token в handshake, не в URL.

---

## 14. Доступность

- Semantic HTML: `<nav>`, `<main>`, `<article>`, `<button>`.
- ARIA labels для кастомных компонентов.
- Keyboard navigation (tab, enter, escape).
- Color contrast ≥ 4.5:1 (WCAG AA).
- Reduced motion: `prefers-reduced-motion` — отключает анимации.

---

## 15. Тестирование

| Тип           | Что                                            |
| ------------- | ---------------------------------------------- |
| Unit          | Zustand stores, utils, hooks                   |
| Component     | Компоненты с Testing Library                   |
| Integration   | WebSocket event flow (mock Socket.IO)          |
| E2E           | Playwright — pairing, SMS flow, call flow      |
| Visual        | Storybook + Chromatic для UI components        |
