# Aktau City Lab — frontend

React 19 + TypeScript + Vite + MapLibre. API: `../city-lab-api/API.md`.

## Запуск

```bash
cp .env.example .env.local   # VITE_API_URL=http://localhost:8091/api
npm install
npm run dev                  # http://localhost:5173
```

Бэкенд (`city-lab-api`) должен быть поднят в Docker и засеян: `docker exec -u 1000 city-lab-php php artisan migrate:fresh --seed`. Его `FRONTEND_URL` должен совпадать с адресом фронта.

## Проверки

```bash
npm run test && npm run build && npm run lint
```

## Деплой (Vercel)

1. Import Project → `city-lab-front`, Framework: Vite.
2. Environment Variables: `VITE_API_URL=https://<railway-домен>/api`.
3. На бэкенде в Railway: `FRONTEND_URL=https://<vercel-домен>` (без `/` в конце) → redeploy.
4. Роутинг на `#/…`, поэтому rewrites не нужны.

## Демо за 4 минуты

1. Слой «Транспорт» → «Проблемы города» → 12 мкр.
2. Маршрут Б + Умные светофоры + Озеленение → SIMULATE → «До → После», автобусы.
3. City AI: «Уменьши пробки в 12 мкр и не забудь про жару, бюджет 100 млн» → «Сравнить все 3».
4. «Модель» → войти → изменить коэффициент → вернуться к сравнению.
