const { sequelize } = require('../config/database');
const User = require('../models/User');
const { QueryTypes } = require('sequelize');

async function migratePlayersToUser() {
    console.log('Подключение к базе данных...');
    
    try {
        // Проверяем, какой тип базы данных используется
        const dialectInfo = sequelize.getDialect();
        console.log(`Используемый диалект базы данных: ${dialectInfo}`);
        
        // Разные запросы для разных баз данных
        let checkColumnQuery;
        if (dialectInfo === 'sqlite') {
            checkColumnQuery = `
                SELECT COUNT(*) AS column_exists
                FROM pragma_table_info('Players')
                WHERE name = 'userId';
            `;
        } else if (dialectInfo === 'postgres') {
            checkColumnQuery = `
                SELECT COUNT(*) AS column_exists
                FROM information_schema.columns
                WHERE table_name = 'Players'
                AND column_name = 'userId';
            `;
        } else {
            throw new Error(`Неподдерживаемый диалект базы данных: ${dialectInfo}`);
        }
        
        // Проверяем существование колонки userId в таблице Players
        const columnExists = await sequelize.query(checkColumnQuery, { type: QueryTypes.SELECT });
        
        // Проверяем, существует ли колонка
        if (parseInt(columnExists[0].column_exists) > 0) {
            console.log('Колонка userId уже существует в таблице Players');
            return;
        }

        // Создаем транзакцию
        const transaction = await sequelize.transaction();

        try {
            console.log('Начало миграции...');
            
            // Добавляем колонку userId в таблицу Players
            await sequelize.query(`
                ALTER TABLE "Players"
                ADD COLUMN "userId" INTEGER;
            `, { transaction });
            
            console.log('Колонка userId добавлена');

            // Получаем всех пользователей
            const users = await User.findAll({ transaction });
            console.log(`Найдено ${users.length} пользователей`);

            if (users.length === 0) {
                // Создаем пользователя по умолчанию если нет пользователей
                const defaultUser = await User.create({
                    phone: '+71234567890',
                    name: 'Администратор',
                    verificationCode: '1234',
                    isVerified: true
                }, { transaction });
                
                console.log('Создан пользователь по умолчанию с ID:', defaultUser.id);
                
                // Назначаем всех игроков этому пользователю
                await sequelize.query(`
                    UPDATE "Players"
                    SET "userId" = ${defaultUser.id}
                    WHERE "userId" IS NULL;
                `, { transaction });
            } else {
                // Равномерно распределяем игроков между существующими пользователями
                const allPlayers = await sequelize.query(
                    `SELECT id FROM "Players" ORDER BY id`,
                    { type: QueryTypes.SELECT, transaction }
                );
                console.log(`Найдено ${allPlayers.length} игроков для распределения`);
                
                if (allPlayers.length > 0) {
                    for (let i = 0; i < allPlayers.length; i++) {
                        // Выбираем пользователя по порядковому номеру игрока (с циклическим повторением)
                        const userIndex = i % users.length;
                        const userId = users[userIndex].id;
                        
                        await sequelize.query(`
                            UPDATE "Players"
                            SET "userId" = ${userId}
                            WHERE id = ${allPlayers[i].id};
                        `, { transaction });
                    }
                    console.log('Игроки распределены между существующими пользователями');
                } else {
                    console.log('Игроков для распределения не найдено');
                }
            }

            // Устанавливаем NOT NULL ограничение для колонки userId
            // Разные запросы для разных баз данных
            if (dialectInfo === 'sqlite') {
                await sequelize.query(`
                    CREATE TABLE "Players_new" (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(191) NOT NULL,
                        "userId" INTEGER NOT NULL,
                        "createdAt" DATETIME NOT NULL,
                        "updatedAt" DATETIME NOT NULL,
                        FOREIGN KEY ("userId") REFERENCES "Users"(id)
                    );
                    
                    INSERT INTO "Players_new"
                    SELECT id, name, "userId", "createdAt", "updatedAt"
                    FROM "Players";
                    
                    DROP TABLE "Players";
                    
                    ALTER TABLE "Players_new" RENAME TO "Players";
                `, { transaction });
            } else if (dialectInfo === 'postgres') {
                await sequelize.query(`
                    ALTER TABLE "Players" 
                    ALTER COLUMN "userId" SET NOT NULL;
                `, { transaction });
                
                // Создаем внешний ключ
                await sequelize.query(`
                    ALTER TABLE "Players"
                    ADD CONSTRAINT "FK_Players_userId"
                    FOREIGN KEY ("userId") REFERENCES "Users" (id);
                `, { transaction });
            }
            
            console.log('Установлено ограничение NOT NULL для колонки userId');

            // Завершаем транзакцию
            await transaction.commit();
            console.log('Миграция успешно завершена');
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await transaction.rollback();
            console.error('Ошибка в транзакции, выполнен откат:', error);
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при миграции:', error);
        throw error;
    }
}

// Экспортируем функцию для использования в других модулях
module.exports = {
    migratePlayersToUser
};

// Если скрипт запущен напрямую (не через require), выполняем миграцию
if (require.main === module) {
    migratePlayersToUser()
        .then(() => {
            console.log('Миграция завершена успешно');
            process.exit(0);
        })
        .catch(error => {
            console.error('Ошибка при выполнении миграции:', error);
            process.exit(1);
        });
} 