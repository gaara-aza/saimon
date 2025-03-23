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
            }
        },
        logging: false
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

// Test connection
sequelize.authenticate()
    .then(() => {
        console.log('Database connection successful');
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = {
    sequelize
}; 