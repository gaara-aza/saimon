require('dotenv').config();
const express = require('express');
const path = require('path');
const sequelize = require('./config/database');
const checkRequiredEnvVars = require('./config/checkEnv');
const Player = require('./models/Player');
const Team = require('./models/Team');
const TeamPlayer = require('./models/TeamPlayer');

// Check environment variables
checkRequiredEnvVars();

const app = express();

// Middleware
app.use(express.json());

// Настройка статических файлов
app.use(express.static(path.join(__dirname, '../public')));

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// CORS middleware
app.use((req, res, next) => {
    const allowedOrigins = [
        'https://footmanager-production.up.railway.app',
        'https://saimon-production.up.railway.app',
        'http://localhost:3001',
        'http://localhost:3000'
    ];
    
    const origin = req.headers.origin;
    
    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
        res.header('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    // Разрешаем все необходимые заголовки
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Preflight request
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        port: process.env.PORT
    });
});

// API маршруты - все API маршруты должны быть определены ДО маршрута для главной страницы
app.get('/api/players', async (req, res) => {
    try {
        const players = await Player.findAll();
        res.json(players);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/players', async (req, res) => {
    try {
        const player = await Player.create(req.body);
        res.json(player);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/players/:id', async (req, res) => {
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

app.post('/api/teams/random', async (req, res) => {
    try {
        const players = await Player.findAll();
        const shuffledPlayers = players.sort(() => Math.random() - 0.5);
        const playersPerTeam = Math.floor(players.length / 3);

        await TeamPlayer.destroy({ where: {} });

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

app.post('/api/teams/match-result', async (req, res) => {
    try {
        const { winningTeamId } = req.body;
        
        const winningTeam = await Team.findByPk(winningTeamId, {
            include: [{ model: Player, through: TeamPlayer }]
        });

        if (!winningTeam) {
            return res.status(404).json({ error: 'Team not found' });
        }

        for (const player of winningTeam.Players) {
            await player.increment('gamesPlayed');
            await player.increment('gamesWon');
            await player.increment('points', { by: 3 });
        }

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

app.put('/api/teams/:teamId/captain', async (req, res) => {
    try {
        const { teamId } = req.params;
        const { captainId } = req.body;

        const team = await Team.findByPk(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        team.captainId = captainId || null;
        await team.save();

        res.json({ message: 'Team captain updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Маршрут для главной страницы должен быть ПОСЛЕДНИМ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API error handler middleware
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    console.error('Stack trace:', err.stack);
    console.error('Request details:', {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query
    });
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
        requestId: req.id
    });
});

// Start server
function validatePort(port) {
    const parsedPort = parseInt(port, 10);
    if (isNaN(parsedPort) || parsedPort < 0 || parsedPort > 65535) {
        throw new Error(`Invalid PORT: ${port}. Port must be an integer between 0 and 65535`);
    }
    return parsedPort;
}

const PORT = validatePort(process.env.PORT || '3001');

async function startServer() {
    try {
        console.log('=== Server Starting ===');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Raw PORT value:', process.env.PORT);
        console.log('Validated PORT:', PORT);
        console.log('Database URL exists:', !!process.env.DATABASE_URL);
        console.log('Current working directory:', process.cwd());
        console.log('Node version:', process.version);

        // Test database connection
        await sequelize.authenticate();
        console.log('Database connection successful');

        // Sync database
        await sequelize.sync();
        console.log('Database synchronized');

        // Start server
        const server = app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Health check endpoint: http://0.0.0.0:${PORT}/health`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('HTTP server closed');
                sequelize.close().then(() => {
                    console.log('Database connection closed');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('=== Server Startup Error ===');
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        console.error('Environment details:', {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            DATABASE_URL: !!process.env.DATABASE_URL,
            PWD: process.cwd()
        });
        
        if (process.env.NODE_ENV !== 'production') {
            process.exit(1);
        }
    }
}

// Start server
startServer();
