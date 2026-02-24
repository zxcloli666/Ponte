# Ponte Backend

API-сервер на NestJS — серверная часть моста между Android и iOS.

## Стек

- **NestJS** с Express-адаптером
- **Drizzle ORM** + PostgreSQL
- **Redis** для кеша сессий и токенов сопряжения
- **BullMQ** для гарантированной доставки сообщений
- **Socket.IO** WebSocket-шлюз (неймспейс `/ws`)
- **JWT** аутентификация (access + refresh токены)
- **Pino** структурированное логирование

## Модули

| Модуль          | Описание                                                  |
|-----------------|-----------------------------------------------------------|
| `auth`          | QR-сопряжение, регистрация устройств, управление JWT      |
| `devices`       | CRUD сопряжённых устройств                                |
| `sims`          | SIM-карты и доп. номера (виртуальные линии)               |
| `sms`           | Пакетная обработка SMS, диалоги, доставка сообщений       |
| `calls`         | Синхронизация журнала звонков, relay состояния в реалтайме |
| `contacts`      | Синхронизация контактов (полная/дельта), поиск по номеру  |
| `notifications` | Пересылка Android-уведомлений, фильтрация по приложениям  |

## Установка

```bash
cp .env.example .env
# Отредактируй .env: DATABASE_URL, REDIS_URL, JWT-секреты

npm install
npm run db:migrate
npm run dev
```

## Переменные окружения

| Переменная           | Описание                          | По умолчанию            |
|----------------------|-----------------------------------|-------------------------|
| `DATABASE_URL`       | Строка подключения к PostgreSQL   | —                       |
| `REDIS_URL`          | Строка подключения к Redis        | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET`  | Секрет для access-токенов         | —                       |
| `JWT_REFRESH_SECRET` | Секрет для refresh-токенов        | —                       |
| `PORT`               | Порт HTTP-сервера                 | `3000`                  |
| `NODE_ENV`           | `development` / `production`      | `development`           |
| `LOG_LEVEL`          | Уровень логирования Pino          | `debug`                 |

## API

Все REST-ответы обёрнуты в `{ data, meta }` через `TransformInterceptor`.

WebSocket-события используют типизированные каналы: `sms:push`, `call:log:push`, `call:incoming`, `sms:ack` и т.д.

## База данных

14 таблиц под управлением Drizzle ORM. Запуск миграций:

```bash
npm run db:migrate
```
