const { Sequelize } = require('sequelize');

let sequelize;

// Проверяем наличие URL базы данных
if (process.env.DATABASE_URL || process.env.NEON_DATABASE_URL) {
    const databaseUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    sequelize = new Sequelize(databaseUrl, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: false
    });
} else {
    // ��������� ����������
    sequelize = new Sequelize('postgres', 'postgres', 'postgres', {
        host: 'localhost',
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
}

// ������������ �����������
sequelize
    .authenticate()
    .then(() => {
        console.log('Database connection successful');
        console.log('Using Database URL:', process.env.DATABASE_URL ? 'Railway' : (process.env.NEON_DATABASE_URL ? 'Neon' : 'Local'));
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = sequelize; 