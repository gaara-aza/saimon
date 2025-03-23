const { Sequelize } = require('sequelize');

let sequelize;

// При деплое в Railway используем переменную окружения DATABASE_URL, если она доступна
if (process.env.DATABASE_URL) {
    console.log('Using DATABASE_URL from environment');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Необходимо для Railway PostgreSQL
            },
            charset: 'utf8mb4', // Поддержка полного Unicode, включая эмодзи и различные алфавиты
            collate: 'utf8mb4_unicode_ci'
        },
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci'
        },
        logging: console.log, // Включаем логирование SQL-запросов для отладки
        pool: {
            max: 5, // Максимальное количество соединений в пуле
            min: 0, // Минимальное количество соединений в пуле
            acquire: 30000, // Максимальное время (в миллисекундах), которое пул будет пытаться получить соединение до возникновения ошибки
            idle: 10000 // Максимальное время (в миллисекундах), в течение которого соединение может быть неактивным, прежде чем оно будет закрыто
        },
        retry: {
            match: [
                /SequelizeConnectionError/,
                /SequelizeConnectionRefusedError/,
                /SequelizeHostNotFoundError/,
                /SequelizeHostNotReachableError/,
                /SequelizeInvalidConnectionError/,
                /SequelizeConnectionTimedOutError/
            ],
            max: 3 // Максимальное количество повторных попыток подключения
        }
    });
} else {
    console.log('Using SQLite database');
    // Локальная разработка с SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });
}

// Более подробный тест соединения с обработкой ошибок
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        console.error('Connection error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        
        // В продакшене не завершаем процесс, чтобы Railway мог перезапустить приложение
        if (process.env.NODE_ENV !== 'production') {
            console.error('Terminating application due to database connection failure.');
            process.exit(1);
        }
        
        return false;
    }
}

// Выполняем тест соединения
testConnection();

module.exports = {
    sequelize,
    testConnection
}; 