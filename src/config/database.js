const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    console.log('Configuring database with Railway PostgreSQL URL');
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
        retry: {
            max: 3,
            timeout: 30000
        },
        logging: (msg) => console.log('Sequelize:', msg)
    });
} else {
    console.log('Using local database configuration');
    sequelize = new Sequelize('postgres', 'postgres', 'postgres', {
        host: 'localhost',
        dialect: 'postgres',
        logging: (msg) => console.log('Sequelize:', msg),
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    });
}

// Test connection with retries
async function testConnection(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await sequelize.authenticate();
            console.log('Database connection successful');
            console.log('Database URL:', process.env.DATABASE_URL ? 'Using Railway PostgreSQL' : 'Using Local Database');
            return true;
        } catch (err) {
            console.error(`Database connection attempt ${i + 1} failed:`, err.message);
            if (i < retries - 1) {
                console.log(`Retrying in 5 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }
    throw new Error('Failed to connect to database after multiple attempts');
}

// Initialize connection
testConnection()
    .catch(err => {
        console.error('Final database connection error:', err);
        if (process.env.NODE_ENV === 'production') {
            console.error('Critical database connection failure in production!');
        }
    });

module.exports = sequelize; 