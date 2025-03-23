const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Player = require('../models/Player');
const TeamPlayer = require('../models/TeamPlayer');

// Получение всех игроков
router.get('/', authenticateToken, async (req, res) => {
    try {
        const players = await Player.findAll();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Создание нового игрока
router.post('/', authenticateToken, async (req, res) => {
    try {
        console.log('Получены данные для создания игрока:', req.body);
        
        // Проверяем, что есть имя игрока
        if (!req.body.name || req.body.name.trim() === '') {
            return res.status(400).json({ error: 'Имя игрока обязательно' });
        }
        
        // Создаем объект с данными игрока
        const playerData = {
            name: req.body.name.trim(),
            // Добавляем значения по умолчанию для других полей, если они не предоставлены
            number: req.body.number || null,
            position: req.body.position || null,
            birthDate: req.body.birthDate || null,
            active: req.body.hasOwnProperty('active') ? req.body.active : true,
            isSelected: req.body.hasOwnProperty('isSelected') ? req.body.isSelected : false,
            gamesPlayed: req.body.gamesPlayed || 0,
            gamesWon: req.body.gamesWon || 0,
            points: req.body.points || 0
        };
        
        console.log('Подготовленные данные для создания игрока:', playerData);
        
        const player = await Player.create(playerData);
        console.log('Игрок успешно создан:', player.id);
        res.json(player);
    } catch (error) {
        console.error('Ошибка при создании игрока:', error);
        res.status(400).json({ error: error.message });
    }
});

// Удаление игрока
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Получен запрос на удаление игрока с ID: ${id}`);
        
        const player = await Player.findByPk(id);
        
        if (!player) {
            console.log(`Игрок с ID ${id} не найден`);
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