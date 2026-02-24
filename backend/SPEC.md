# Ponte — Backend

> NestJS + TypeScript, runtime: Deno
> База: PostgreSQL (Drizzle ORM), кеш: Redis, real-time: WebSocket (Socket.IO)

---

## 1. Общее описание

Бэкенд — центральное звено между Android-клиентом и iOS PWA.
Принимает данные с Android (SMS, звонки, уведомления, контакты),
хранит, нормализует и стримит на iOS-клиент в реальном времени.
Обеспечивает гарантированную доставку (at-least-once) с ack/retry.

---

## 2. Стек

| Слой            | Технология                              |
| --------------- | --------------------------------------- |
| Runtime         | Deno 2.x                               |
| Framework       | NestJS (с Deno-адаптером)              |
| ORM             | Drizzle ORM                             |
| БД              | PostgreSQL 16                           |
| Кеш / PubSub   | Redis 7                                 |
| Real-time       | Socket.IO (WebSocket + long-polling)    |
| Auth            | JWT (access + refresh), QR-code pairing |
| Валидация       | Zod (через zod-nestjs)                  |
| Очередь         | BullMQ (Redis-backed)                   |
| Тесты           | Vitest                                  |

---

## 3. Архитектура

```
src/
  main.ts                       — bootstrap, Deno adapter
  app.module.ts                 — root module

  modules/
    auth/                       — QR pairing, JWT, guards
    devices/                    — Android device registry
    sms/                        — SMS CRUD + delivery pipeline
    calls/                      — Call log + live call signaling
    notifications/              — App notification stream
    contacts/                   — Contact sync + merge
    sims/                       — Physical SIM registry + virtual numbers

  shared/
    database/                   — Drizzle schema, migrations
    redis/                      — Redis module, pub/sub helpers
    ws/                         — WebSocket gateway, rooms, ack protocol
    queue/                      — BullMQ producers/consumers
    guards/                     — JWT guard, device guard
    interceptors/               — logging, transform
    filters/                    — global exception filter
    types/                      — shared TS types / Zod schemas
```

### Паттерны

- **Модульная структура NestJS** — каждый домен изолирован в свой module.
- **Repository pattern** — Drizzle-запросы инкапсулированы в `*.repository.ts`, сервисы не знают про SQL.
- **Event-driven** — модули общаются через `EventEmitter2` (NestJS events), не через прямые импорты.
- **CQRS-lite** — команды (write) и запросы (read) разделены на уровне сервисов, без отдельного event store.
- **Outbox pattern** — для гарантированной доставки: запись в БД + очередь в одной транзакции.

---

## 4. Модули

### 4.1 Auth

**QR-code pairing flow:**

1. iOS PWA генерирует `GET /auth/qr` — бэкенд создаёт одноразовый `pairingToken` (UUID v4), TTL 5 минут, сохраняет в Redis. Возвращает `pairingToken` как payload для QR.
2. Android сканирует QR, отправляет `POST /auth/pair` с `{ pairingToken, deviceInfo }`.
3. Бэкенд валидирует токен, создаёт `Device` в БД, генерирует `deviceSecret` (случайный 256-bit), создаёт `Session` (JWT pair), привязывает устройство к сессии.
4. Бэкенд пушит по WebSocket в канал `pairing:{pairingToken}` — iOS получает JWT pair.
5. Оба клиента авторизованы. Android использует `deviceSecret` для reconnect.

**JWT:**

- Access token: 15 min, RS256.
- Refresh token: 30 days, rotated при каждом refresh.
- Отдельные JWT claims для `deviceType: 'android' | 'ios'`.

**Endpoints:**

| Method | Path              | Описание                          |
| ------ | ----------------- | --------------------------------- |
| GET    | /auth/qr          | Создать QR pairing token          |
| POST   | /auth/pair         | Android подтверждает pairing       |
| POST   | /auth/refresh      | Обновить JWT pair                 |
| POST   | /auth/logout       | Инвалидировать сессию             |

---

### 4.2 Devices

Реестр подключённых Android-устройств.

**Схема `devices`:**

| Поле           | Тип        | Описание                        |
| -------------- | ---------- | ------------------------------- |
| id             | uuid PK    |                                 |
| userId         | uuid FK    | Владелец (session)              |
| name           | text       | Модель устройства               |
| androidVersion | text       |                                 |
| secretHash     | text       | bcrypt от deviceSecret          |
| lastSeenAt     | timestamptz|                                 |
| createdAt      | timestamptz|                                 |

---

### 4.3 SIMs + Дополнительные номера

Двухуровневая модель:
1. **Физические SIM-карты** — самостоятельные сущности. Yota и Мегафон — два
   разных оператора, два разных номера, два разных цвета в UI. Каждая SIM —
   полноценная "линия" со своим именем, цветом и основным номером.
2. **Дополнительные номера** — опциональная фича некоторых операторов
   (Мегафон "Мультиномер" и аналоги). На одной физической SIM может быть
   0, 1, 2+ дополнительных номеров. У каждого — свой операторский prefix
   в caller ID (`10`, `20`, `30`…).

**Пример конфигурации:**

```
Слот 0: Yota — +7 999 000-00-00 (цвет: синий)
  └── дополнительных номеров нет (обычная SIM)

Слот 1: Мегафон — +7 999 111-11-11 (цвет: зелёный)
  ├── доп. номер "Рабочий" — +7 999 222-22-22, prefix "20" (цвет: оранжевый)
  └── доп. номер "Для регистраций" — +7 999 333-33-33, prefix "30" (цвет: серый)
```

Когда кто-то звонит на +7 999 222-22-22 (доп. номер с prefix "20"):
- Android видит caller ID `2079994445566` (prefix "20" + реальный номер звонящего)
- Ponte декодирует: prefix "20" → "Рабочий", номер звонящего +7 999 444-55-66
- На iOS: "Входящий на Рабочий +7 999 222-22-22 от +7 999 444-55-66"

Когда звонят на основной номер Мегафона — caller ID приходит без prefix,
обычный номер. Ponte определяет SIM по `subscriptionId`, показывает "Мегафон".

Когда звонят на Yota — то же самое, без prefix. Ponte показывает "Yota".

**Схема `sims` (физические SIM-карты):**

| Поле           | Тип         | Описание                                  |
| -------------- | ----------- | ----------------------------------------- |
| id             | uuid PK     |                                           |
| deviceId       | uuid FK     |                                           |
| slotIndex      | int         | Физический слот: 0, 1                     |
| iccId          | text        | Уникальный ID SIM (ICCID)                |
| carrierName    | text        | Оператор из Android (Yota, Мегафон)       |
| rawNumber      | text?       | Номер как его видит Android               |
| displayName    | text        | Пользовательское имя ("Yota", "Мегафон") |
| displayNumber  | text?       | Номер для UI (+7 999 111-11-11)           |
| color          | text        | HEX-цвет (#34C759)                       |
| isDefault      | boolean     | SIM по умолчанию для исходящих            |
| createdAt      | timestamptz |                                           |

**Схема `extra_numbers` (дополнительные номера оператора):**

| Поле           | Тип         | Описание                                         |
| -------------- | ----------- | ------------------------------------------------ |
| id             | uuid PK     |                                                  |
| simId          | uuid FK     | К какой физической SIM                           |
| prefix         | text        | Операторский prefix в caller ID: "10", "20", "30"|
| phoneNumber    | text        | Номер в E.164 (+79992222222)                     |
| displayName    | text        | Имя ("Рабочий", "Для регистраций")               |
| displayNumber  | text        | Номер для UI (+7 999 222-22-22)                  |
| color          | text        | HEX-цвет, отличный от основной SIM (#FF9500)    |
| sortOrder      | int         | Порядок в UI                                     |
| createdAt      | timestamptz |                                                  |

**Декодирование caller ID:**

```
Входящий caller ID: "2079994445566"

1. Android определяет физическую SIM по subscriptionId → slotIndex → Мегафон
2. Android проверяет: есть ли у этой SIM extra_numbers?
   → Да → берёт первые 2 символа caller ID → "20"
   → Ищет extra_number с prefix "20" → найден: "Рабочий"
   → Реальный номер звонящего: "79994445566" → нормализация → +7 999 444-55-66
3. Отправляет на бэкенд: { simId, extraNumberId, address: "+79994445566" }

Если prefix не найден или у SIM нет доп. номеров:
   → caller ID = обычный номер звонящего, без декодирования
   → Отправляет: { simId, extraNumberId: null, address: callerIdAsIs }
```

**Отдача на iOS:**

Каждый SMS/Call содержит:
- `sim` — всегда: `{ displayName: "Мегафон", color: "#34C759" }`
- `extraNumber` — только если определён: `{ displayName: "Рабочий", displayNumber: "+7 999 222-22-22", color: "#FF9500" }`
- `address` — реальный номер собеседника (декодированный, без prefix)

iOS показывает `extraNumber` если есть, иначе `sim`.

**Endpoints:**

| Method | Path                          | Описание                              |
| ------ | ----------------------------- | ------------------------------------- |
| GET    | /sims                         | Список SIM с вложенными доп. номерами |
| POST   | /sims/sync                    | Android пушит физические SIM-карты    |
| PUT    | /sims/:id                     | Обновить настройки SIM (имя, цвет)   |
| POST   | /sims/:simId/extra-numbers    | Добавить дополнительный номер         |
| PUT    | /extra-numbers/:id            | Обновить доп. номер                   |
| DELETE | /extra-numbers/:id            | Удалить доп. номер                    |

---

### 4.4 SMS

**Схема `messages`:**

| Поле           | Тип        | Описание                               |
| -------------- | ---------- | -------------------------------------- |
| id             | uuid PK    |                                        |
| deviceId       | uuid FK    |                                        |
| simId          | uuid FK    | Физическая SIM                         |
| extraNumberId  | uuid FK?   | Доп. номер (если SMS пришла через него)|
| direction      | enum       | 'incoming' / 'outgoing'               |
| address        | text       | Номер собеседника (E.164)              |
| contactId      | uuid FK?   | Привязка к контакту (если найден)      |
| body           | text       | Текст SMS                             |
| extractedCode  | text?      | OTP / код, извлечённый regex-ом        |
| androidMsgId   | text       | ID сообщения на Android (idempotency)  |
| status         | enum       | 'pending' / 'delivered' / 'failed'     |
| deliveredAt    | timestamptz|                                        |
| createdAt      | timestamptz|                                        |

**Гарантированная доставка (Android → Backend):**

1. Android отправляет SMS batch через WebSocket event `sms:push` с массивом сообщений.
2. Бэкенд сохраняет в БД (upsert по `androidMsgId`), публикует в BullMQ job.
3. Бэкенд отправляет `sms:ack` с массивом `androidMsgId`, которые сохранены.
4. Android удаляет из локальной outbox-очереди только после ack.
5. Если ack не получен за 10 сек — Android ретраит. Idempotency по `androidMsgId`.

**Гарантированная доставка (Backend → iOS):**

1. BullMQ consumer публикует `sms:new` через Socket.IO в комнату пользователя.
2. iOS клиент отправляет `sms:received` ack.
3. Если ack нет за 15 сек — BullMQ ретраит (expo backoff, max 10 attempts).
4. При reconnect iOS — бэкенд отправляет все unacknowledged сообщения.

**Извлечение кодов:**

При сохранении SMS — regex pipeline ищет OTP-коды:
- 4-8 цифр, окружённые нецифровыми символами
- Паттерны: "код: XXXX", "code: XXXX", "your code is XXXX", и т.д.
- Результат — `extractedCode`, отправляется отдельным полем на iOS для quick-copy.

**Endpoints (REST — для истории):**

| Method | Path                     | Описание                              |
| ------ | ------------------------ | ------------------------------------- |
| GET    | /sms                     | Список SMS, пагинация, фильтры       |
| GET    | /sms/conversations       | Группировка по собеседникам (threads)  |
| GET    | /sms/conversations/:addr | SMS одного собеседника                 |
| GET    | /sms/:id                 | Одно сообщение                         |

**WebSocket events:**

| Event         | Направление     | Payload                         |
| ------------- | --------------- | ------------------------------- |
| sms:push      | Android → Server| `{ messages: SmsDto[] }`        |
| sms:ack       | Server → Android| `{ ids: string[] }`             |
| sms:new       | Server → iOS    | `{ message: SmsDto }`           |
| sms:received  | iOS → Server    | `{ id: string }`                |
| sms:send      | iOS → Server    | `{ to, body, simId, extraNumberId? }` |
| sms:send:ack  | Server → iOS    | `{ tempId, status }`            |
| sms:outgoing  | Server → Android| `{ to, body, simId, extraNumberId? }` |

---

### 4.5 Calls

**Схема `calls`:**

| Поле           | Тип        | Описание                              |
| -------------- | ---------- | ------------------------------------- |
| id             | uuid PK    |                                       |
| deviceId       | uuid FK    |                                       |
| simId          | uuid FK    | Физическая SIM                        |
| extraNumberId  | uuid FK?   | Доп. номер (если вызов через него)    |
| direction      | enum       | 'incoming' / 'outgoing' / 'missed'   |
| address        | text       | Номер (E.164)                         |
| contactId      | uuid FK?   |                                       |
| duration       | int        | Секунды                               |
| startedAt      | timestamptz|                                       |
| endedAt        | timestamptz|                                       |
| androidCallId  | text       | Idempotency key                       |
| createdAt      | timestamptz|                                       |

**Live call flow (VoIP relay):**

Для возможности принимать/совершать вызовы с iOS, используем WebRTC через бэкенд как signaling server:

1. **Входящий вызов на Android:**
   - Android ловит `PHONE_STATE` broadcast, шлёт `call:incoming` на бэкенд.
   - Бэкенд пушит `call:incoming` на iOS (push notification через Web Push API + WebSocket).
   - Если iOS принимает → WebRTC signaling начинается: offer/answer/ICE через WebSocket.
   - Android стримит аудио с ongoing call через `AudioRecord` → WebRTC peer.
   - iOS получает аудио и воспроизводит. Микрофон iOS → WebRTC → Android → `AudioTrack` в ongoing call.

2. **Исходящий вызов с iOS:**
   - iOS шлёт `call:initiate { to, simId }`.
   - Бэкенд передаёт на Android → Android инициирует `ACTION_CALL`.
   - Далее — тот же WebRTC relay.

3. **Call log sync:**
   - Android периодически пушит call log batch → бэкенд сохраняет.
   - Тот же ack/retry паттерн как у SMS.

**Endpoints:**

| Method | Path              | Описание                     |
| ------ | ----------------- | ---------------------------- |
| GET    | /calls            | История вызовов, пагинация   |
| GET    | /calls/:id        | Детали вызова                |

**WebSocket events:**

| Event              | Направление       | Payload                           |
| ------------------ | ------------------ | --------------------------------- |
| call:log:push      | Android → Server   | `{ calls: CallDto[] }`            |
| call:log:ack       | Server → Android   | `{ ids: string[] }`               |
| call:incoming      | Android → Server   | `{ callId, from, simId, extraNumberId? }` |
| call:incoming      | Server → iOS       | `{ callId, from, sim, extraNumber?, contact }` |
| call:accept        | iOS → Server       | `{ callId }`                      |
| call:reject        | iOS → Server       | `{ callId }`                      |
| call:initiate      | iOS → Server       | `{ to, simId, extraNumberId? }`   |
| call:initiate      | Server → Android   | `{ to, simId, extraNumberId? }`   |
| call:signal        | Bidirectional      | WebRTC SDP/ICE                    |
| call:end           | Either → Server    | `{ callId }`                      |
| call:status        | Server → iOS       | `{ callId, status, duration }`    |

---

### 4.6 Notifications

**Схема `notifications`:**

| Поле            | Тип        | Описание                            |
| --------------- | ---------- | ----------------------------------- |
| id              | uuid PK    |                                     |
| deviceId        | uuid FK    |                                     |
| packageName     | text       | `com.whatsapp`, `com.telegram` и пр.|
| appName         | text       | Человекочитаемое имя приложения      |
| title           | text       |                                     |
| body            | text       |                                     |
| androidNotifId  | text       | Idempotency                         |
| postedAt        | timestamptz| Время на Android                    |
| createdAt       | timestamptz|                                     |

**Схема `notification_filters`:**

| Поле            | Тип        | Описание                            |
| --------------- | ---------- | ----------------------------------- |
| id              | uuid PK    |                                     |
| deviceId        | uuid FK    |                                     |
| packageName     | text       | Какое приложение                     |
| enabled         | boolean    | Пересылать ли                        |

**Flow:**

- Android `NotificationListenerService` перехватывает уведомления.
- Фильтрует по локальному whitelist (+ sync с бэкендом).
- Отправляет по WebSocket. Тот же ack/retry.

**Endpoints:**

| Method | Path                          | Описание                          |
| ------ | ----------------------------- | --------------------------------- |
| GET    | /notifications                | Список, пагинация                 |
| GET    | /notifications/filters        | Текущие фильтры приложений        |
| PUT    | /notifications/filters/:pkg   | Включить/выключить приложение     |
| GET    | /notifications/apps           | Список приложений на Android      |

---

### 4.7 Contacts

**Схема `contacts`:**

| Поле            | Тип        | Описание                            |
| --------------- | ---------- | ----------------------------------- |
| id              | uuid PK    |                                     |
| deviceId        | uuid FK    |                                     |
| name            | text       |                                     |
| phones          | jsonb      | `[{ number, type, label }]`        |
| photoUrl        | text?      | URL аватарки (хранится в S3/R2)    |
| androidId       | text       | Contact ID на Android               |
| updatedAt       | timestamptz|                                     |
| createdAt       | timestamptz|                                     |

**Sync:**

- Android пушит полный дамп контактов при pairing и delta-обновления при изменениях (`ContactsContract` observer).
- Бэкенд мерджит: по `androidId` — update, новые — insert, удалённые — soft delete.
- При отдаче SMS/Calls — бэкенд обогащает данные контактной информацией (join по номеру).

**Endpoints:**

| Method | Path               | Описание                    |
| ------ | ------------------ | --------------------------- |
| GET    | /contacts          | Список контактов, поиск     |
| GET    | /contacts/:id      | Детали контакта             |
| POST   | /contacts/sync     | Android пушит дамп/дельту   |

---

## 5. WebSocket протокол

### Подключение

```
wss://api.ponte.app/ws?token={accessToken}
```

Rooms:
- `user:{userId}` — все события пользователя.
- `device:{deviceId}` — события конкретного устройства.
- `pairing:{token}` — одноразовая комната для pairing.

### Ack Protocol

Каждое событие, требующее подтверждения, содержит `ackId: string`.
Получатель отвечает `{ event: 'ack', ackId }`.
Если ack не получен за N секунд — повтор через BullMQ с exponential backoff.

### Heartbeat

- Клиент шлёт `ping` каждые 25 сек.
- Сервер отвечает `pong`.
- Если 3 пинга пропущено — сервер считает клиента offline, ставит `lastSeenAt`.
- При reconnect — клиент отправляет `sync:request { lastEventId }`, сервер досылает пропущенные события.

---

## 6. Инфраструктура

### Деплой

- Docker Compose: PostgreSQL, Redis, backend (Deno).
- Переменные окружения через `.env` (никаких хардкодов).
- GitHub Actions CI: lint, test, build, deploy.

### Миграции

- Drizzle Kit — генерация и применение миграций.
- Seed-скрипт для dev-окружения.

### Логирование

- Structured JSON logging (pino).
- Request ID propagation через AsyncLocalStorage.

### Rate Limiting

- Per-device: 100 events/sec (WebSocket).
- Per-IP: стандартный throttle на REST endpoints.

---

## 7. Безопасность

- Все данные зашифрованы at-rest (PostgreSQL encryption) и in-transit (TLS).
- Device secret хранится как bcrypt hash.
- JWT RS256, ключи ротируются.
- Никаких SMS/звонков в логах — PII masking.
- CORS: только домен PWA.
- WebSocket: валидация JWT при handshake, реvalидация при token refresh.

---

## 8. API Versioning

- Все REST endpoints под `/v1/`.
- WebSocket events без версии (версионирование через payload schema).
- Breaking changes — новая версия endpoint, старая deprecated на 3 месяца.