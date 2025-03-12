const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // Railway PostgreSQL connection
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: false
    });
} else {
    // Local connection
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

// Test connection
sequelize
    .authenticate()
    .then(() => {
        console.log('Database connection successful');
        console.log('Database URL:', process.env.DATABASE_URL ? 'Using Railway PostgreSQL' : 'Using Local Database');
    })
    .catch(err => {
        console.error('Database connection error:', err);
        console.error('Error details:', err.message);
    });

module.exports = sequelize; 