// Globalnoe hranilische igrokov i komand
let players = [];
let teams = {
    team1: [],
    team2: [],
    team3: []
};

// Testovye igroki
const testPlayers = [
    "Alexander Petrov",
    "Dmitry Ivanov",
    "Maxim Sidorov",
    "Artem Kozlov",
    "Sergey Volkov",
    "Andrey Morozov",
    "Igor Sokolov",
    "Nikolay Popov",
    "Vladimir Lebedev",
    "Mikhail Komarov",
    "Pavel Novikov",
    "Evgeny Soloviev",
    "Roman Vasiliev",
    "Viktor Zaytsev",
    "Denis Orlov",
    "Konstantin Belov",
    "Grigory Medvedev",
    "Anton Ershov"
];

// Zagruzka igrokov pri zagruzke stranicy
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayers();
    
    // Esli igrokov net, dobavlyaem testovyh
    if (players.length === 0) {
        await addTestPlayers();
    }
});

// Dobavlenie testovyh igrokov
async function addTestPlayers() {
    for (const name of testPlayers) {
        try {
            await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });
        } catch (error) {
            console.error('Error adding test player:', error);
        }
    }
    await loadPlayers();
}

// Obrabotka formy dobavleniya igroka
document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();

    if (name) {
        try {
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (response.ok) {
                nameInput.value = '';
                loadPlayers();
            } else {
                console.error('Error adding player');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});

// Zagruzka spiska igrokov
async function loadPlayers() {
    try {
        const response = await fetch('/api/players');
        const data = await response.json();
        players = data;
        renderPlayers();
        renderTeams();
        renderStatistics();
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

// Otobrazhenie spiska dostupnyh igrokov
function renderPlayers() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    // Filtruem igrokov, kotorye esche ne v komandah
    const availablePlayers = players.filter(player => 
        !Object.values(teams).flat().find(teamPlayer => teamPlayer.id === player.id)
    );

    availablePlayers.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-item';
        playerDiv.innerHTML = `
            <span class="player-name">${player.name}</span>
            <div class="team-buttons">
                <button class="team-button" onclick="addToTeam(${player.id}, 'team1')">1</button>
                <button class="team-button" onclick="addToTeam(${player.id}, 'team2')">2</button>
                <button class="team-button" onclick="addToTeam(${player.id}, 'team3')">3</button>
            </div>
        `;
        playersList.appendChild(playerDiv);
    });
}

// Dobavlenie igroka v komandu
function addToTeam(playerId, teamName) {
    const player = players.find(p => p.id === playerId);
    if (player) {
        teams[teamName].push(player);
        renderPlayers();
        renderTeams();
    }
}

// Udalenie igroka iz komandy
function removeFromTeam(playerId, teamName) {
    teams[teamName] = teams[teamName].filter(player => player.id !== playerId);
    renderPlayers();
    renderTeams();
}

// Otobrazhenie komand
function renderTeams() {
    Object.keys(teams).forEach(teamName => {
        const teamDiv = document.getElementById(teamName);
        const teamPlayers = teamDiv.querySelector('.team-players');
        teamPlayers.innerHTML = '';

        teams[teamName].forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'team-player';
            playerDiv.innerHTML = `
                <span>${player.name}</span>
                <button class="remove-player" onclick="removeFromTeam(${player.id}, '${teamName}')">X</button>
            `;
            teamPlayers.appendChild(playerDiv);
        });
    });
}

// ��������� ���������� ��� ������ ���������� �������������
document.getElementById('randomizeTeams').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/teams/random', {
            method: 'POST'
        });

        if (response.ok) {
            const teamsData = await response.json();
            // ������� ������� �������
            teams.team1 = [];
            teams.team2 = [];
            teams.team3 = [];
            
            // ��������� ��������� ��������� ������
            teamsData.forEach(team => {
                teams[`team${team.id}`] = team.Players;
            });
            
            await loadPlayers();
            renderPlayers();
            renderTeams();
            renderStatistics();
        }
    } catch (error) {
        console.error('Error randomizing teams:', error);
    }
});

// ������� ���������� ���������� �����
async function updateMatchResult(winningTeamId) {
    try {
        const response = await fetch('/api/teams/match-result', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ winningTeamId })
        });

        if (response.ok) {
            // ������������� ��� ������
            await loadPlayers();
            
            // �������� ���������� ������ ������
            const teamsResponse = await fetch('/api/teams');
            const teamsData = await teamsResponse.json();
            
            // ��������� ��������� ������
            teams.team1 = [];
            teams.team2 = [];
            teams.team3 = [];
            
            teamsData.forEach(team => {
                teams[`team${team.id}`] = team.Players;
            });

            // ��������� �����������
            renderPlayers();
            renderTeams();
            renderStatistics();
            
            // ���������� ��������� �� ������
            alert(`Team ${winningTeamId} won! Statistics updated.`);
        }
    } catch (error) {
        console.error('Error updating match result:', error);
        alert('Error updating match result');
    }
}

// ������� ����������� ����������
function renderStatistics() {
    const statsContainer = document.getElementById('playerStats');
    statsContainer.innerHTML = '';

    players.forEach(player => {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'player-stats';
        statsDiv.innerHTML = `
            <h4>${player.name}</h4>
            <div class="stats-info">
                <span>Games Played:</span>
                <span>${player.gamesPlayed}</span>
                <span>Games Won:</span>
                <span>${player.gamesWon}</span>
                <span>Points:</span>
                <span>${player.points}</span>
                <span>Win Rate:</span>
                <span>${player.gamesPlayed ? Math.round(player.gamesWon / player.gamesPlayed * 100) : 0}%</span>
            </div>
        `;
        statsContainer.appendChild(statsDiv);
    });
} 