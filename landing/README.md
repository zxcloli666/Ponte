# Ponte Landing

Маркетинговый лендинг для Ponte. Направляет пользователей на установку PWA веб-приложения.

## Стек

- **React 19** + TypeScript
- **Vite** сборщик
- **Firebase Hosting**

## Особенность

`manifest.webmanifest` лендинга имеет `start_url`, указывающий на домен **веб-приложения** (`app.ponte.work.gd`), а не на сам лендинг. Когда пользователь нажимает «На экран Домой» с лендинга — устанавливается настоящее PWA.

Скрипт редиректа в standalone-режиме обеспечивает фоллбек для iOS.

## Установка

```bash
cp .env.example .env
# Отредактируй: VITE_APP_URL

npm install
npm run dev
```

## Переменные окружения

| Переменная     | Описание                        | По умолчанию                  |
|----------------|---------------------------------|-------------------------------|
| `VITE_APP_URL` | URL PWA веб-приложения          | `https://app.ponte.work.gd`  |

## Сборка и деплой

```bash
npm run build                    # выходная папка dist/
npx firebase deploy --only hosting
```

## Иконки

SVG-исходник: `public/icons/icon.svg` (две точки + градиентная дуга = мост).

PNG в `public/icons/`: 192x192, 512x512, apple-touch-icon (180x180).
