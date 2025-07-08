# Football Manager

Веб-приложение для управления футбольными командами. Позволяет создавать команды, добавлять игроков и управлять составами.

## Функционал

- Добавление игроков
- Распределение игроков по командам
- Автоматическое создание тестовых игроков
- Управление составами команд

## Технологии

- Backend: Node.js + Express
- Database: PostgreSQL
- ORM: Sequelize
- Frontend: HTML5, CSS3, JavaScript

## Установка

1. Клонируйте репозиторий
```bash
git clone https://github.com/gaara-aza/saimon.git
```

2. Установите зависимости
```bash
npm install
```

3. Создайте файл .env и настройте подключение к базе данных
```e
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=admin
DB_NAME=postgres
PORT=3000
```

4. Запустите сервер
```bash
npm start
```

5. Откройте в браузере
```
http://localhost:3000
```

## Деплой на Vercel

1. Создайте аккаунт на [Vercel](https://vercel.com)

2. Установите Vercel CLI:
```bash
npm i -g vercel
```

3. Войдите в аккаунт:
```bash
vercel login
```

4. Настройте переменные окружения в Vercel Dashboard:
- `NEON_DATABASE_URL` - URL вашей базы данных
- `NODE_ENV=production`

5. Выполните деплой:
```bash
vercel --prod
```
# trigger deploy
# saimon
# trigger deploy
