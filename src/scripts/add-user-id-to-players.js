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

            // Получаем первого пользователя или создаем его
            let user = await User.findOne({ transaction });
            if (!user) {
                user = await User.create({
                    phone: '+71234567890',
                    name: 'Администратор',
                    verificationCode: '1234',
                    isVerified: true
                }, { transaction });
                console.log('Создан пользователь по умолчанию с ID:', user.id);
            } else {
                console.log('Найден существующий пользователь с ID:', user.id);
            }

            // Назначаем всех существующих игроков этому пользователю
            await sequelize.query(`
                UPDATE "Players"
                SET "userId" = ${user.id}
                WHERE "userId" IS NULL;
            `, { transaction });
            
            console.log('Всем игрокам назначен пользователь с ID:', user.id);

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

// Выполняем миграцию при запуске скрипта
migratePlayersToUser()
    .then(() => {
        console.log('Миграция завершена успешно');
        process.exit(0);
    })
    .catch(error => {
        console.error('Ошибка при выполнении миграции:', error);
        process.exit(1);
    }); 