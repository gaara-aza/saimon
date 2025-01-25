const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    database: 'postgres',
    username: 'postgres',
    password: 'admin',  // стандартный пароль
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: false
    }
});
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