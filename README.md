# Eco Monitoring Frontend

Frontend-приложение информационной системы экологического мониторинга. Интерфейс показывает посты мониторинга на карте, позволяет просматривать доступные устройства станции, графики показаний, последние агрегированные значения, сырые MQTT-пакеты для администратора и экспортировать агрегаты в Excel.

Приложение работает как клиент для `eco_monitoring_fastapi_service` и не обращается к БД напрямую.

## Как Работает

Основной сценарий работы:

1. При открытии приложения загружается карта на базе MapLibre.
2. Frontend запрашивает подтверждённые посты мониторинга через FastAPI.
3. Посты с координатами отображаются на карте маркерами.
4. При выборе поста приложение запрашивает доступные устройства и открывает карточку станции.
5. Пользователь может смотреть последние hourly-показания и графики за день или месяц.
6. Авторизованный пользователь может открыть профиль и экспортировать агрегированные данные.
7. Администратор получает доступ к управлению постами и просмотру сырых MQTT-пакетов.

Основные технологии:

- React 18.
- Vite.
- MapLibre GL для карты.
- ECharts для графиков.
- Lucide React для иконок.

## Структура

- `src/main.jsx` - точка входа React-приложения.
- `src/App.jsx` - основной экран, карта, панели, выбор станции и состояние авторизации.
- `src/lib/api.js` - клиент FastAPI-сервиса.
- `src/components` - модальные окна, карточки станции, графики, экспорт и просмотр raw-пакетов.
- `src/styles.css` - стили приложения.
- `public` - статические файлы.

## Требования

- Node.js и npm.
- Запущенный FastAPI backend или доступный удалённый API.

Зависимости указаны в `package.json`.

## Настройка

Установите зависимости:

```powershell
cd eco_monitoring_frontend
npm install
```

По умолчанию frontend использует относительные URL вида `/api/v1/...`. Это удобно, если frontend и backend обслуживаются через один домен или reverse proxy.

Для локальной разработки с backend на отдельном адресе создайте `.env` в директории frontend-приложения:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Если переменная не задана, запросы будут отправляться на тот же origin, с которого открыт frontend.

## Запуск

Локальный dev-сервер:

```powershell
cd eco_monitoring_frontend
npm run dev
```

Открыть приложение:

```text
http://127.0.0.1:5173
```

Production-сборка:

```powershell
npm run build
```

Локальный просмотр production-сборки:

```powershell
npm run preview
```

## Связь С Backend API

Frontend использует FastAPI-сервис с базовым префиксом:

```text
/api/v1
```

Основные группы запросов:

```http
GET /api/v1/monitoring-posts
GET /api/v1/device-state/available
GET /api/v1/station-readings/latest-hourly
GET /api/v1/gas-sensors/hourly
GET /api/v1/gas-sensors/monthly
GET /api/v1/dust-state/hourly
GET /api/v1/dust-state/monthly
GET /api/v1/meteo-state/hourly
GET /api/v1/meteo-state/monthly
GET /api/v1/ivtm-state/hourly
GET /api/v1/ivtm-state/monthly
GET /api/v1/profile-state/hourly
GET /api/v1/profile-state/monthly
POST /api/v1/export/aggregates
```

Авторизация и профиль:

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me
PATCH /api/v1/auth/me
```

Административные запросы:

```http
GET /api/v1/monitoring-posts/admin
PATCH /api/v1/monitoring-posts/{monitoring_post_id}
GET /api/v1/raw-mqtt-payload/admin
```

JWT-токен хранится в `localStorage` и передаётся в backend через заголовок `Authorization: Bearer <token>`.

## Основные Возможности

- Карта постов мониторинга с автообновлением списка станций.
- Карточка выбранной станции с координатами, типом поста и доступными устройствами.
- Последние hourly-показания по станции.
- Графики по газовым датчикам, пыли, метео, ИВТМ и температурному профилю.
- Переключение графиков между дневным и месячным режимами.
- Регистрация, вход, выход и редактирование профиля.
- Admin-панель для подтверждения и редактирования постов.
- Просмотр сырых MQTT-пакетов для администратора.
- Экспорт агрегированных данных в XLSX для авторизованного пользователя.

## Проверка После Изменений

Проверка production-сборки:

```powershell
cd eco_monitoring_frontend
npm run build
```

Если сборка прошла успешно, приложение корректно компилируется. Для проверки реальной работы интерфейса нужен доступный FastAPI backend и данные в БД.
