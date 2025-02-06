require('dotenv').config();
const express = require('express');
const sequelize = require('./config/database');
const Player = require('./models/Player');
const Team = require('./models/Team');
const TeamPlayer = require('./models/TeamPlayer');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.post('/api/players', async (req, res) => {
    try {
        const player = await Player.create(req.body);
        res.json(player);
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

// Случайное распределение игроков по командам
app.post('/api/teams/random', async (req, res) => {
    try {
        const players = await Player.findAll();
        const shuffledPlayers = players.sort(() => Math.random() - 0.5);
        const playersPerTeam = Math.floor(players.length / 3);

        // Очищаем текущие команды
        await TeamPlayer.destroy({ where: {} });

        // Создаем три команды
        for (let i = 0; i < 3; i++) {
            const team = await Team.findOrCreate({
                where: { id: i + 1 },
                defaults: { name: `Team ${i + 1}` }
            });

            const teamPlayers = shuffledPlayers.slice(
                i * playersPerTeam,
                i === 2 ? players.length : (i + 1) * playersPerTeam
            );

            await team[0].setPlayers(teamPlayers);
        }

        const teams = await Team.findAll({
            include: [{ model: Player, through: TeamPlayer }]
        });

        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновление статистики после матча
app.post('/api/teams/match-result', async (req, res) => {
    try {
        const { winningTeamId } = req.body;
        
        // Получаем команду-победителя и её игроков
        const winningTeam = await Team.findByPk(winningTeamId, {
            include: [{ model: Player, through: TeamPlayer }]
        });

        if (!winningTeam) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Обновляем статистику игроков
        for (const player of winningTeam.Players) {
            await player.increment('gamesPlayed');
            await player.increment('gamesWon');
            await player.increment('points', { by: 3 }); // 3 очка за победу
        }

        // Обновляем статистику проигравших команд
        const losingTeams = await Team.findAll({
            where: { id: { [sequelize.Op.ne]: winningTeamId } },
            include: [{ model: Player, through: TeamPlayer }]
        });

        for (const team of losingTeams) {
            for (const player of team.Players) {
                await player.increment('gamesPlayed');
            }
        }

        res.json({ message: 'Match statistics updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.findAll({
            include: [
                { model: Player, through: TeamPlayer },
                { model: Player, as: 'captain' }
            ]
        });
        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Обновление капитана команды
app.put('/api/teams/:teamId/captain', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { captainId } = req.body;

        const team = await Team.findByPk(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Если captainId null, то убираем капитана
        team.captainId = captainId || null;
        await team.save();

        res.json({ message: 'Team captain updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;

sequelize.sync({ force: true })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database sync error:', err);
    }); 