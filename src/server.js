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

// �������� ��� ������ � ��������
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

// ������� ��� ��������������� �������� ������
app.post('/api/teams/auto', async (req, res) => {
    try {
        const { numberOfTeams } = req.body;
        if (![2, 4].includes(numberOfTeams)) {
            return res.status(400).json({ error: '���������� ������ ������ ���� 2 ��� 4' });
        }

        // �������� ���� ��������� �������
        const players = await Player.findAll({ where: { isSelected: false } });
        if (players.length < numberOfTeams) {
            return res.status(400).json({ error: '������������ ������� ��� �������� ������' });
        }

        // ������������ ������� ��������� �������
        const shuffledPlayers = players.sort(() => Math.random() - 0.5);
        const playersPerTeam = Math.floor(players.length / numberOfTeams);

        const teams = [];
        for (let i = 0; i < numberOfTeams; i++) {
            const team = await Team.create({ name: `������� ${i + 1}` });
            const teamPlayers = shuffledPlayers.slice(i * playersPerTeam, (i + 1) * playersPerTeam);
            await team.addPlayers(teamPlayers);
            teams.push(team);
        }

        res.json(teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ��������� ���� ������ � ��������
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

// ������������� � ����� ������
sequelize.sync({ force: true })
    .then(() => {
        console.log('���� ������ ����������������');
        app.listen(PORT, () => {
            console.log(`������ ������� �� ����� ${PORT}`);
        });
    })
    .catch(err => {
        console.error('������ ��� ������������� � ����� ������:', err);
    }); 