require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { sequelize } = require('./config/database');
const telegramBot = require('./services/telegramBot');
const { QueryTypes } = require('sequelize');

// Импортируем функцию миграции
const { migratePlayersToUser } = require('./scripts/add-user-id-to-players');
const { fixPlayerAssignment } = require('./scripts/fix-player-assignment');

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

// Диагностический эндпоинт для проверки базы данных
app.get('/api/public/diagnostic', async (req, res) => {
    try {
        // Получаем диалект базы данных
        const dialectInfo = sequelize.getDialect();
        
        // Проверяем подключение к базе данных
        const { testConnection } = require('./config/database');
        const dbConnected = await testConnection();
        
        // Проверяем наличие таблицы Players
        let tableExists = false;
        try {
            if (dialectInfo === 'postgres') {
                const tableCheck = await sequelize.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'Players'
                    );
                `, { type: QueryTypes.SELECT });
                tableExists = tableCheck[0].exists;
            } else if (dialectInfo === 'sqlite') {
                const tableCheck = await sequelize.query(`
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='Players';
                `, { type: QueryTypes.SELECT });
                tableExists = tableCheck.length > 0;
            }
        } catch (err) {
            console.error('Ошибка при проверке таблицы:', err);
        }
        
        // Проверяем количество пользователей
        let usersCount = 0;
        try {
            const users = await sequelize.query(`SELECT COUNT(*) as count FROM "Users"`, { type: QueryTypes.SELECT });
            usersCount = users[0].count;
        } catch (err) {
            console.error('Ошибка при подсчете пользователей:', err);
        }
        
        res.json({
            status: 'ok',
            databaseConnected: dbConnected,
            dialect: dialectInfo,
            playersTableExists: tableExists,
            usersCount: usersCount,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка в диагностическом эндпоинте:', error);
        res.status(500).json({ 
            status: 'error',
            error: error.message,
            serverTime: new Date().toISOString()
        });
    }
});

// Диагностический эндпоинт для проверки распределения игроков
app.get('/api/public/player-distribution', async (req, res) => {
    try {
        // Проверяем распределение игроков по пользователям
        const distribution = await sequelize.query(`
            SELECT "userId", COUNT(*) as count 
            FROM "Players" 
            GROUP BY "userId"
            ORDER BY count DESC
        `, { type: QueryTypes.SELECT });
        
        // Получаем информацию о пользователях
        const users = await sequelize.query(`
            SELECT id, phone, name, "isVerified"
            FROM "Users"
            ORDER BY id
        `, { type: QueryTypes.SELECT });
        
        // Получаем некоторые примеры игроков для каждого пользователя
        const playerExamples = [];
        for (const user of users) {
            const players = await sequelize.query(`
                SELECT id, name, "userId"
                FROM "Players"
                WHERE "userId" = :userId
                LIMIT 5
            `, { 
                replacements: { userId: user.id },
                type: QueryTypes.SELECT 
            });
            
            playerExamples.push({
                userId: user.id,
                playerCount: players.length,
                players: players
            });
        }
        
        // Получаем общее количество игроков
        const totalPlayers = await sequelize.query(`
            SELECT COUNT(*) as total FROM "Players"
        `, { type: QueryTypes.SELECT });
        
        // Получаем количество игроков без userId
        const nullUserIdPlayers = await sequelize.query(`
            SELECT COUNT(*) as count FROM "Players" WHERE "userId" IS NULL
        `, { type: QueryTypes.SELECT });
        
        res.json({
            status: 'ok',
            totalPlayers: totalPlayers[0].total,
            nullUserIdPlayers: nullUserIdPlayers[0].count,
            distribution: distribution,
            users: users,
            playerExamples: playerExamples,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        console.error('Ошибка при получении распределения игроков:', error);
        res.status(500).json({ 
            status: 'error',
            error: error.message,
            serverTime: new Date().toISOString()
        });
    }
});

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);

// Временный эндпоинт для проверки структуры таблицы Players
app.get('/debug/table-structure', async (req, res) => {
    try {
        // Получаем диалект базы данных
        const dialectInfo = sequelize.getDialect();
        console.log(`Диалект базы данных: ${dialectInfo}`);
        
        let tableStructureQuery;
        if (dialectInfo === 'sqlite') {
            tableStructureQuery = `PRAGMA table_info(Players);`;
        } else if (dialectInfo === 'postgres') {
            tableStructureQuery = `
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'Players'
                ORDER BY ordinal_position;
            `;
        } else {
            return res.status(400).json({ error: `Неподдерживаемый диалект: ${dialectInfo}` });
        }
        
        const tableInfo = await sequelize.query(tableStructureQuery, { type: QueryTypes.SELECT });
        
        // Проверяем количество записей в таблице Players
        const countQuery = `SELECT COUNT(*) as count FROM "Players"`;
        const countResult = await sequelize.query(countQuery, { type: QueryTypes.SELECT });
        
        // Выборка первых 10 игроков для проверки
        const playersQuery = `SELECT * FROM "Players" LIMIT 10`;
        const playersSample = await sequelize.query(playersQuery, { type: QueryTypes.SELECT });
        
        res.json({
            dialect: dialectInfo,
            tableStructure: tableInfo,
            recordCount: countResult[0].count,
            playersSample
        });
    } catch (error) {
        console.error('Ошибка при получении структуры таблицы:', error);
        res.status(500).json({ error: error.message });
    }
});

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
                        
                        console.log('Запуск скрипта распределения игроков...');
                        await fixPlayerAssignment();
                        console.log('Распределение игроков завершено');
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
