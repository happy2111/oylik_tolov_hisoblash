# Oylik to‘lov hisoblash (Telegram WebApp)

Telegram WebApp калькулятор рассрочки. Сроки и коэффициенты берутся из ERP Integration API; токен хранится только на сервере.

## Быстрый старт

```bash
cp .env.example .env
# заполните INTEGRATION_TOKEN (и опционально TELEGRAM_BOT_TOKEN + WEBAPP_URL)

npm install
npm run dev
```

- UI (Vite): http://localhost:5173  
- API proxy: http://localhost:3080/api/installment-settings  

## Production (VPS / Express)

```bash
npm run build
npm start
```

Express раздаёт `dist/` и поднимает Telegram-бота (если задан `TELEGRAM_BOT_TOKEN`).

## Vercel

Vite отдаёт только статику — API живёт в serverless-функциях `api/*`.

В Vercel → Project → Settings → Environment Variables добавьте:

- `INTEGRATION_TOKEN` (обязательно)
- `ERP_API_URL` = `https://api.erp.applepark.uz`
- `CURRENCY_SYMBOL` = `$`
- `WEBAPP_URL` = `https://oylik-tolov-hisoblash.vercel.app` (для бота на отдельном хосте)

После push проверьте:

- https://oylik-tolov-hisoblash.vercel.app/api/health
- https://oylik-tolov-hisoblash.vercel.app/api/config
- https://oylik-tolov-hisoblash.vercel.app/api/installment-settings

> Telegram bot (`grammY` long polling) на Vercel не крутится — только WebApp + API. Бота держите на VPS или через webhook отдельно.

## Env

| Переменная | Описание |
|---|---|
| `PORT` | Порт Express (по умолчанию 3080) |
| `ERP_API_URL` | `https://api.erp.applepark.uz` |
| `INTEGRATION_TOKEN` | `erp_int_...` из ERP Settings → Integration API |
| `TELEGRAM_BOT_TOKEN` | Токен бота от @BotFather (только для Express/`npm start`) |
| `WEBAPP_URL` | Публичный HTTPS URL WebApp |
| `CURRENCY_SYMBOL` | Символ валюты в UI (`$`) |

## Формула

```
financed = price - initialPayment
markup = financed * (coefficient - 1)
monthly = round(financed * coefficient / months)
jami = financed * coefficient + initialPayment
```

## Telegram

1. Создайте бота в @BotFather  
2. Menu Button / команда `/start` открывает WebApp по `WEBAPP_URL`  
3. Укажите тот же URL в BotFather → Bot Settings → Menu Button  
