require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { sequelize } = require('./config/database');
const telegramBot = require('./services/telegramBot');

// Маршруты
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const teamRoutes = require('./routes/teams');

// Инициализация приложения
const app = express();

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'development' 
        ? '*' 
        : ['https://footmanager-production.up.railway.app', 'https://saimon-production.up.railway.app', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Статические файлы
app.use(express.static(path.join(__dirname, '../public')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        port: process.env.PORT,
        version: '1.0.0'
    });
});

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);

// Маршрут для страницы входа
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Начальная страница
app.get('/', (req, res) => {
    // Для демонстрации перенаправляем на страницу входа
    res.redirect('/login');
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ message: 'Что-то пошло не так!', error: process.env.NODE_ENV === 'production' ? {} : err.message });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`PORT: ${PORT}`);
        console.log(`TELEGRAM_BOT_TOKEN exists: ${!!process.env.TELEGRAM_BOT_TOKEN}`);
        console.log(`JWT_SECRET exists: ${!!process.env.JWT_SECRET}`);
        console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

        // Синхронизация базы данных
        await sequelize.authenticate();
        console.log('База данных подключена успешно');
        
        await sequelize.sync();
        console.log('База данных синхронизирована');

        // Запуск Telegram бота (только если установлен токен)
        if (process.env.TELEGRAM_BOT_TOKEN) {
            try {
                telegramBot.launch();
                console.log('Telegram бот запущен');
            } catch (botError) {
                console.warn('Ошибка запуска бота:', botError.message);
            }
        } else {
            console.warn('TELEGRAM_BOT_TOKEN не установлен. Бот не будет запущен.');
            // Это нормально, продолжаем работу без бота
        }

        // Запуск сервера
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    } catch (error) {
        console.error('Ошибка при запуске сервера:', error.message);
        console.error(error.stack);
        // Don't exit in production, let the process restart
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

startServer();
