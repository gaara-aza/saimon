const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Player = require('../models/Player');
const TeamPlayer = require('../models/TeamPlayer');

// Получение всех игроков текущего пользователя
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Получаем id пользователя из токена аутентификации
        const userId = req.user.id;
        console.log(`Получение игроков для пользователя ID: ${userId}`);
        
        // Получаем только игроков, принадлежащих данному пользователю
        const players = await Player.findAll({
            where: { userId }
        });
        
        console.log(`Найдено ${players.length} игроков`);
        res.json(players);
    } catch (error) {
        console.error('Ошибка при получении игроков:', error);
        res.status(500).json({ error: error.message });
    }
});

// Создание нового игрока
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('---------- СОЗДАНИЕ НОВОГО ИГРОКА ----------');
        console.log('Получены данные для создания игрока:', JSON.stringify(req.body));
        
        // Получаем id пользователя из токена аутентификации
        const userId = req.user.id;
        console.log(`Создание игрока для пользователя ID: ${userId}`);
        
        // Проверяем, что есть имя игрока
        if (!req.body.name || req.body.name.trim() === '') {
            console.log('Ошибка: имя игрока отсутствует или пустое');
            return res.status(400).json({ error: 'Имя игрока обязательно' });
        }
        
        // Очищаем имя игрока от лишних пробелов и экранируем специальные символы
        const sanitizedName = req.body.name.trim()
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
            
        console.log('Очищенное имя игрока:', sanitizedName);
        
        // Создаем объект с данными игрока с добавлением userId
        const playerData = {
            name: sanitizedName,
            userId: userId // Привязываем игрока к текущему пользователю
        };
        
        console.log('Подготовленные данные для создания игрока:', JSON.stringify(playerData));
        
        try {
            const player = await Player.create(playerData);
            console.log('Игрок успешно создан, ID:', player.id);
            res.json(player);
        } catch (dbError) {
            console.error('Ошибка создания в базе данных:', dbError);
            console.error('Сообщение ошибки:', dbError.message);
            
            if (dbError.name === 'SequelizeConnectionError') {
                console.error('Ошибка соединения с базой данных');
                return res.status(500).json({ 
                    error: 'Проблема с соединением с базой данных',
                    details: dbError.message
                });
            }
            
            if (dbError.name === 'SequelizeValidationError') {
                console.error('Детали ошибки валидации:', dbError.errors.map(e => e.message).join(', '));
                return res.status(400).json({ 
                    error: 'Ошибка валидации данных',
                    details: dbError.errors.map(e => e.message) 
                });
            }
            
            if (dbError.name === 'SequelizeUniqueConstraintError') {
                console.error('Ошибка уникальности:', dbError.errors.map(e => e.message).join(', '));
                return res.status(409).json({ 
                    error: 'Игрок с таким именем уже существует',
                    details: dbError.errors.map(e => e.message)
                });
            }
            
            res.status(400).json({ 
                error: 'Ошибка при создании игрока в базе данных',
                message: dbError.message
            });
        }
    } catch (error) {
        console.error('Общая ошибка при создании игрока:', error);
        console.error('Стек ошибки:', error.stack);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера',
            message: error.message
        });
    }
});

// Удаление игрока
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        console.log(`Получен запрос на удаление игрока с ID: ${id} от пользователя ID: ${userId}`);
        
        // Ищем игрока с проверкой, что он принадлежит текущему пользователю
        const player = await Player.findOne({
            where: {
                id: id,
                userId: userId
            }
        });
        
        if (!player) {
            console.log(`Игрок с ID ${id} не найден или не принадлежит пользователю ${userId}`);
            return res.status(404).json({ error: 'Игрок не найден' });
        }

        // Сначала удаляем связи с командами
        await TeamPlayer.destroy({ where: { playerId: id } });
        
        // Затем удаляем самого игрока
        await player.destroy();
        
        console.log(`Игрок с ID ${id} успешно удален`);
        res.json({ message: 'Игрок успешно удален' });
    } catch (error) {
        console.error(`Ошибка при удалении игрока: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 