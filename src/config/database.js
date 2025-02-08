const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // Production конфигурация (Render.com)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    });
} else {
    // Локальная разработка
    sequelize = new Sequelize('postgres', 'postgres', 'postgres', {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    });
}

// Тестирование подключения
sequelize
    .authenticate()
    .then(() => {
        console.log('Database connection successful');
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = sequelize; 