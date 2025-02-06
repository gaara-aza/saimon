const { Sequelize } = require('sequelize');

const config = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    },
    production: {
        use_env_variable: 'DATABASE_URL',
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        logging: false
    }
};

const env = process.env.NODE_ENV || 'development';
const sequelize = env === 'production' && process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, config[env])
    : new Sequelize(
        config[env].database,
        config[env].username,
        config[env].password,
        config[env]
    );

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