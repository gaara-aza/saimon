const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    database: 'postgres',
    username: 'postgres',
    password: 'admin',  // ����������� ������
    host: 'localhost',
    port: 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: false
    }
});
// ������������ �����������
sequelize
    .authenticate()
    .then(() => {
        console.log('Database connection successful');
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = sequelize; 