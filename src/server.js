require('dotenv').config();
const express = require('express');
const sequelize = require('./config/database');
const Player = require('./models/Player');
const Team = require('./models/Team');
const TeamPlayer = require('./models/TeamPlayer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Маршруты для работы с игроками
app.post('/api/players', async (req, res) => {
    try {
        const { name } = req.body;
        const player = await Player.create({ name });
        res.status(201).json(player);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.findAll();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Маршрут для автоматического создания команд
app.post('/api/teams/auto', async (req, res) => {
    try {
        const { numberOfTeams } = req.body;
        if (![2, 4].includes(numberOfTeams)) {
            return res.status(400).json({ error: 'Количество команд должно быть 2 или 4' });
        }

        // Получаем всех доступных игроков
        const players = await Player.findAll({ where: { isSelected: false } });
        if (players.length < numberOfTeams) {
            return res.status(400).json({ error: 'Недостаточно игроков для создания команд' });
        }

        // Перемешиваем игроков случайным образом
        const shuffledPlayers = players.sort(() => Math.random() - 0.5);
        const playersPerTeam = Math.floor(players.length / numberOfTeams);

        const teams = [];
        for (let i = 0; i < numberOfTeams; i++) {
            const team = await Team.create({ name: `Команда ${i + 1}` });
            const teamPlayers = shuffledPlayers.slice(i * playersPerTeam, (i + 1) * playersPerTeam);
            await team.addPlayers(teamPlayers);
            teams.push(team);
        }

        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Получение всех команд с игроками
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.findAll({
            include: [
                { model: Player, as: 'Players' },
                { model: Player, as: 'captain' }
            ]
        });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

// Синхронизация с базой данных
sequelize.sync({ force: true })
    .then(() => {
        console.log('База данных синхронизирована');
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Ошибка при синхронизации с базой данных:', err);
    }); 