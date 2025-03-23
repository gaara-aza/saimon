const { sequelize } = require('../config/database');
const User = require('../models/User');
const { QueryTypes } = require('sequelize');

async function migratePlayersToUser() {
    // Проверяем существование колонки userId в таблице Players
    const checkColumnQuery = `
        SELECT COUNT(*) AS column_exists
        FROM pragma_table_info('Players')
        WHERE name = 'userId';
    `;
    const columnExists = await sequelize.query(checkColumnQuery, { type: QueryTypes.SELECT });
    
    // Проверяем, существует ли колонка
    if (parseInt(columnExists[0].column_exists) > 0) {
        console.log('Колонка userId уже существует в таблице Players');
        return;
    }

    try {
        // Создаем транзакцию
        const transaction = await sequelize.transaction();

        try {
            // Добавляем колонку userId в таблицу Players
            await sequelize.query(`
                ALTER TABLE Players
                ADD COLUMN userId INTEGER;
            `, { transaction });

            // Получаем первого пользователя или создаем его
            let user = await User.findOne({ transaction });
            if (!user) {
                user = await User.create({
                    phone: '+71234567890',
                    name: 'Администратор',
                    verificationCode: '1234',
                    isVerified: true
                }, { transaction });
                console.log('Создан пользователь по умолчанию');
            }

            // Назначаем всех существующих игроков этому пользователю
            await sequelize.query(`
                UPDATE Players
                SET userId = ${user.id}
                WHERE userId IS NULL;
            `, { transaction });

            // Устанавливаем NOT NULL ограничение для колонки userId
            await sequelize.query(`
                CREATE TABLE Players_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(191) NOT NULL,
                    userId INTEGER NOT NULL,
                    createdAt DATETIME NOT NULL,
                    updatedAt DATETIME NOT NULL,
                    FOREIGN KEY (userId) REFERENCES Users(id)
                );
                
                INSERT INTO Players_new
                SELECT id, name, userId, createdAt, updatedAt
                FROM Players;
                
                DROP TABLE Players;
                
                ALTER TABLE Players_new RENAME TO Players;
            `, { transaction });

            // Завершаем транзакцию
            await transaction.commit();
            console.log('Миграция успешно завершена');
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await transaction.rollback();
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при миграции:', error);
    }
}

// Выполняем миграцию при запуске скрипта
migratePlayersToUser()
    .then(() => {
        console.log('Миграция завершена');
        process.exit(0);
    })
    .catch(error => {
        console.error('Ошибка при выполнении миграции:', error);
        process.exit(1);
    }); 