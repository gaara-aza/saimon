const { sequelize } = require('../config/database');
const User = require('../models/User');
const { QueryTypes } = require('sequelize');

async function fixPlayerAssignment() {
    console.log('Запуск скрипта для исправления распределения игроков...');
    
    try {
        // Получаем диалект базы данных
        const dialectInfo = sequelize.getDialect();
        console.log(`Используемый диалект базы данных: ${dialectInfo}`);
        
        // Проверяем количество пользователей
        const users = await User.findAll();
        console.log(`Найдено ${users.length} пользователей`);
        
        if (users.length === 0) {
            console.log('Пользователей не найдено. Создаем пользователя по умолчанию...');
            const defaultUser = await User.create({
                phone: '+71234567890',
                name: 'Администратор',
                verificationCode: '1234',
                isVerified: true
            });
            console.log(`Создан пользователь по умолчанию с ID: ${defaultUser.id}`);
            users.push(defaultUser);
        }
        
        // Получаем количество игроков
        const playersCount = await sequelize.query(
            `SELECT COUNT(*) as count FROM "Players"`, 
            { type: QueryTypes.SELECT }
        );
        console.log(`Общее количество игроков: ${playersCount[0].count}`);
        
        // Начинаем транзакцию
        const transaction = await sequelize.transaction();
        
        try {
            // Распределяем игроков между пользователями
            // Каждый пользователь получает часть игроков примерно поровну
            // или всех игроков, если пользователь только один
            if (users.length === 1) {
                // Если пользователь только один, все игроки принадлежат ему
                await sequelize.query(
                    `UPDATE "Players" SET "userId" = :userId`,
                    { 
                        replacements: { userId: users[0].id },
                        type: QueryTypes.UPDATE,
                        transaction
                    }
                );
                console.log(`Все игроки назначены пользователю с ID: ${users[0].id}`);
            } else {
                // Если пользователей несколько, распределяем игроков
                // Сначала получаем всех игроков
                const players = await sequelize.query(
                    `SELECT id FROM "Players" ORDER BY id`,
                    { type: QueryTypes.SELECT, transaction }
                );
                
                // Затем распределяем их между пользователями
                for (let i = 0; i < players.length; i++) {
                    const userIndex = i % users.length;
                    const userId = users[userIndex].id;
                    
                    await sequelize.query(
                        `UPDATE "Players" SET "userId" = :userId WHERE id = :playerId`,
                        { 
                            replacements: { 
                                userId: userId,
                                playerId: players[i].id
                            },
                            type: QueryTypes.UPDATE,
                            transaction
                        }
                    );
                }
                console.log(`${players.length} игроков распределены между ${users.length} пользователями`);
            }
            
            // Фиксируем транзакцию
            await transaction.commit();
            console.log('Транзакция успешно завершена');
            
            // Проверяем распределение
            const distribution = await sequelize.query(
                `SELECT "userId", COUNT(*) as count FROM "Players" GROUP BY "userId"`,
                { type: QueryTypes.SELECT }
            );
            
            console.log('Итоговое распределение игроков по пользователям:');
            distribution.forEach(item => {
                console.log(`Пользователь ID ${item.userId}: ${item.count} игроков`);
            });
            
            return true;
        } catch (error) {
            // Откатываем транзакцию в случае ошибки
            await transaction.rollback();
            console.error('Ошибка при распределении игроков:', error);
            throw error;
        }
    } catch (error) {
        console.error('Ошибка при выполнении скрипта:', error);
        throw error;
    }
}

// Экспортируем функцию для использования в других модулях
module.exports = {
    fixPlayerAssignment
};

// Если скрипт запущен напрямую, выполняем функцию
if (require.main === module) {
    fixPlayerAssignment()
        .then(success => {
            if (success) {
                console.log('Скрипт успешно выполнен');
                process.exit(0);
            } else {
                console.error('Скрипт завершился с ошибкой');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('Ошибка при выполнении скрипта:', error);
            process.exit(1);
        });
} 