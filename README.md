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
```
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
