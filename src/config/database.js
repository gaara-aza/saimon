const { Sequelize } = require('sequelize');

let sequelize;

// ��������� ������� URL ���� ������ ��� Vercel
if (process.env.POSTGRES_URL) {
    sequelize = new Sequelize(process.env.POSTGRES_URL, {
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
    // ��������� ����������
    sequelize = new Sequelize('postgres', 'postgres', 'postgres', {
        host: 'localhost',
        dialect: 'postgres',
        logging: false
    });
}

// ������������ �����������
sequelize
    .authenticate()
    .then(() => {
        console.log('Database connection successful');
        console.log('Database URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });

module.exports = sequelize; 