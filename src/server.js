require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { sequelize } = require('./config/database');
const telegramBot = require('./services/telegramBot');

// Импортируем функцию миграции
const { migratePlayersToUser } = require('./scripts/add-user-id-to-players');

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
    // Проверяем наличие токена в cookies
    const token = req.cookies.token;
    
    if (!token) {
        // Если токена нет, перенаправляем на страницу входа
        return res.redirect('/login');
    }
    
    // Если токен есть, отправляем главную страницу
    res.sendFile(path.join(__dirname, '../public/index.html'));
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

        // Тестируем соединение с базой данных
        const { testConnection } = require('./config/database');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            console.warn('Невозможно установить соединение с базой данных. Работа приложения может быть нестабильной.');
            
            if (process.env.NODE_ENV !== 'production') {
                console.error('В режиме разработки завершаем процесс из-за отсутствия соединения с базой данных.');
                process.exit(1);
            }
        }
        
        // Синхронизация базы данных только если соединение установлено
        if (dbConnected) {
            try {
                // В режиме разработки пересоздаем таблицы для соответствия моделям
                const syncOptions = process.env.NODE_ENV === 'development' 
                    ? { force: true } // Пересоздаем таблицы (удаляет данные!)
                    : {};
                    
                await sequelize.sync(syncOptions);
                console.log('База данных синхронизирована');
                
                // Запускаем миграцию (только в production)
                if (process.env.NODE_ENV === 'production') {
                    try {
                        console.log('Запуск миграции для добавления userId игрокам...');
                        await migratePlayersToUser();
                        console.log('Миграция завершена успешно');
                    } catch (migrationError) {
                        console.error('Ошибка при выполнении миграции:', migrationError);
                        // Продолжаем работу даже при ошибке миграции
                    }
                }
            } catch (syncError) {
                console.error('Ошибка при синхронизации базы данных:', syncError.message);
                // Продолжаем работу даже при ошибке синхронизации
            }
        }

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
