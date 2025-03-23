require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { sequelize } = require('./config/database');
const telegramBot = require('./services/telegramBot');
const session = require('express-session');
const { Telegraf } = require('telegraf');

// Инициализация приложения
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Инициализация бота
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Хранилище кодов подтверждения (в реальном приложении использовать Redis)
const verificationCodes = new Map();

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Middleware для проверки аутентификации
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login.html');
    }
    next();
}

// Применяем middleware к защищенным маршрутам
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API маршруты для аутентификации
app.post('/api/auth/request-code', async (req, res) => {
    const { phone } = req.body;

    // Проверка формата номера телефона
    if (!/^\+7[0-9]{10}$/.test(phone)) {
        return res.status(400).json({ message: 'Неверный формат номера телефона' });
    }

    // Генерация кода
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Сохранение кода
    verificationCodes.set(phone, {
        code,
        timestamp: Date.now(),
        attempts: 0
    });

    try {
        // Отправка кода через Telegram бота
        // В реальном приложении здесь будет логика поиска Telegram ID по номеру телефона
        // и отправка сообщения конкретному пользователю
        
        // Для демонстрации просто возвращаем код
        // В продакшене этого делать не нужно!
        res.json({ message: 'Код отправлен', code });
    } catch (error) {
        console.error('Ошибка отправки кода:', error);
        res.status(500).json({ message: 'Ошибка отправки кода' });
    }
});

app.post('/api/auth/verify-code', (req, res) => {
    const { phone, code } = req.body;

    // Проверка наличия кода
    const verification = verificationCodes.get(phone);
    if (!verification) {
        return res.status(400).json({ message: 'Код подтверждения не найден или устарел' });
    }

    // Проверка количества попыток
    if (verification.attempts >= 3) {
        verificationCodes.delete(phone);
        return res.status(400).json({ message: 'Превышено количество попыток' });
    }

    // Проверка времени действия кода (5 минут)
    if (Date.now() - verification.timestamp > 5 * 60 * 1000) {
        verificationCodes.delete(phone);
        return res.status(400).json({ message: 'Код подтверждения устарел' });
    }

    // Проверка кода
    if (verification.code !== code) {
        verification.attempts++;
        return res.status(400).json({ message: 'Неверный код' });
    }

    // Успешная верификация
    verificationCodes.delete(phone);
    
    // Создание сессии
    req.session.user = {
        phone,
        authenticated: true
    };

    res.json({ message: 'Успешная аутентификация' });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Выход выполнен успешно' });
});

// Защищаем API маршруты
app.use('/api/players', requireAuth);
app.use('/api/matches', requireAuth);

// Маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/players', require('./routes/players'));
app.use('/api/matches', require('./routes/matches'));

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Что-то пошло не так!' });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Проверяем наличие необходимых переменных окружения
        if (!process.env.TELEGRAM_BOT_TOKEN) {
            throw new Error('TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
        }

        // Синхронизация базы данных
        await sequelize.sync();
        console.log('База данных синхронизирована');

        // Запуск Telegram бота
        telegramBot.launch();
        console.log('Telegram бот запущен');

        // Запуск сервера
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    } catch (error) {
        console.error('Ошибка при запуске сервера:', error);
        process.exit(1);
    }
}

startServer(); 