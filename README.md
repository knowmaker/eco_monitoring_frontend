# Eco Monitoring Frontend (React + MapLibre)

## Что реализовано

- React приложение на Vite.
- Карта на `maplibre-gl` загружается сразу при открытии.
- Верхний navbar с кнопками:
  - `Вход`
  - `Регистрация`
- По нажатию открывается модальное окно.
- На карте отображаются маркеры-иконки "вышек" из данных API:
  - `GET /api/v1/devices`
  - координаты берутся из `latitude` и `longitude`.


## Запуск

```powershell
cd eco_monitoring_frontend
npm install
npm run dev
```

Открыть:
- `http://127.0.0.1:5173`
