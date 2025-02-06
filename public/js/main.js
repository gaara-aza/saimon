// Globalnoe hranilische igrokov i komand
let players = [];
let selectedPlayers = [];
let teams = {
    team1: [],
    team2: [],
    team3: []
};

// Глобальное хранилище капитанов
let teamCaptains = {
    team1: null,
    team2: null,
    team3: null
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
    renderAllPlayers();
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

// Отображение всех игроков с чекбоксами
function renderAllPlayers() {
    const allPlayersList = document.getElementById('allPlayersList');
    allPlayersList.innerHTML = '';

    players.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-checkbox-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `player${player.id}`;
        checkbox.value = player.id;
        
        const label = document.createElement('label');
        label.htmlFor = `player${player.id}`;
        label.textContent = `${player.name} (Games: ${player.gamesPlayed}, Wins: ${player.gamesWon})`;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-player';
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', () => handleDeletePlayer(player.id));
        
        playerDiv.appendChild(checkbox);
        playerDiv.appendChild(label);
        playerDiv.appendChild(deleteButton);
        
        allPlayersList.appendChild(playerDiv);
    });
}

// Обработчик удаления игрока
async function handleDeletePlayer(playerId) {
    try {
        const response = await fetch(`/api/players/${playerId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Удаляем игрока из локального массива
            players = players.filter(p => p.id !== playerId);
            // Удаляем из выбранных игроков
            selectedPlayers = selectedPlayers.filter(p => p.id !== playerId);
            // Удаляем из команд
            Object.keys(teams).forEach(teamName => {
                teams[teamName] = teams[teamName].filter(p => p.id !== playerId);
            });
            
            // Обновляем отображение
            renderAllPlayers();
            renderPlayers();
            renderTeams();
            renderStatistics();
        } else {
            console.error('Error deleting player:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Обработчик кнопки подтверждения выбора
document.getElementById('confirmSelection').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#allPlayersList input[type="checkbox"]:checked');
    selectedPlayers = Array.from(checkboxes).map(cb => {
        return players.find(p => p.id === parseInt(cb.value));
    });

    if (selectedPlayers.length < 6) {
        alert('Please select at least 6 players');
        return;
    }

    // Показываем секции для распределения игроков
    document.querySelector('.team-controls').style.display = 'block';
    document.querySelector('.available-players-section').style.display = 'block';
    document.querySelector('.teams-section').style.display = 'block';

    // Скрываем секцию выбора
    document.querySelector('.player-selection-section').style.display = 'none';

    // Очищаем команды
    teams.team1 = [];
    teams.team2 = [];
    teams.team3 = [];

    renderPlayers();
    renderTeams();
});

// Обновляем функцию отображения доступных игроков
function renderPlayers() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    // Фильтруем только выбранных игроков, которые еще не в командах
    const availablePlayers = selectedPlayers.filter(player => 
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
    // Если удаляемый игрок был капитаном, снимаем капитанство
    if (teamCaptains[teamName] === playerId) {
        teamCaptains[teamName] = null;
    }
    
    teams[teamName] = teams[teamName].filter(player => player.id !== playerId);
    renderPlayers();
    renderTeams();
}

// Обновляем функцию отображения команд
function renderTeams() {
    Object.keys(teams).forEach(teamName => {
        const teamDiv = document.getElementById(teamName);
        const teamPlayers = teamDiv.querySelector('.team-players');
        const captainSelect = teamDiv.querySelector('.captain-select');
        
        // Обновляем список игроков в селекте капитана
        captainSelect.innerHTML = '<option value="">Select Captain</option>';
        teams[teamName].forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            option.selected = teamCaptains[teamName] === player.id;
            captainSelect.appendChild(option);
        });

        // Обновляем список игроков команды
        teamPlayers.innerHTML = '';
        teams[teamName].forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = `team-player ${teamCaptains[teamName] === player.id ? 'captain' : ''}`;
            
            const playerContent = `
                <span>${player.name} ${teamCaptains[teamName] === player.id ? '<span class="captain-badge">C</span>' : ''}</span>
                <button class="remove-player" onclick="removeFromTeam(${player.id}, '${teamName}')">X</button>
            `;
            
            playerDiv.innerHTML = playerContent;
            teamPlayers.appendChild(playerDiv);
        });
    });
}

// Добавляем обработчики для выбора капитана
document.querySelectorAll('.captain-select').forEach(select => {
    select.addEventListener('change', async (e) => {
        const teamId = e.target.dataset.team;
        const teamName = `team${teamId}`;
        const playerId = parseInt(e.target.value);
        
        teamCaptains[teamName] = playerId || null;
        
        try {
            // Отправляем информацию о капитане на сервер
            const response = await fetch(`/api/teams/${teamId}/captain`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ captainId: playerId })
            });

            if (response.ok) {
                renderTeams();
            } else {
                console.error('Error updating team captain');
                // Откатываем изменения при ошибке
                teamCaptains[teamName] = null;
                renderTeams();
            }
        } catch (error) {
            console.error('Error:', error);
            // Откатываем изменения при ошибке
            teamCaptains[teamName] = null;
            renderTeams();
        }
    });
});

// Обновляем обработчик случайного распределения
document.getElementById('randomizeTeams').addEventListener('click', async () => {
    if (selectedPlayers.length < 6) {
        alert('Not enough players selected');
        return;
    }

    // Сбрасываем капитанов при новом распределении
    teamCaptains = {
        team1: null,
        team2: null,
        team3: null
    };

    // Остальной код распределения остается без изменений
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const playersPerTeam = Math.floor(shuffledPlayers.length / 3);

    teams.team1 = shuffledPlayers.slice(0, playersPerTeam);
    teams.team2 = shuffledPlayers.slice(playersPerTeam, playersPerTeam * 2);
    teams.team3 = shuffledPlayers.slice(playersPerTeam * 2);

    renderPlayers();
    renderTeams();
});

// Функция обновления результата матча
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
            // Перезагружаем все данные
            await loadPlayers();
            
            // Получаем актуальные данные команд
            const teamsResponse = await fetch('/api/teams');
            const teamsData = await teamsResponse.json();
            
            // Обновляем состояние команд
            teams.team1 = [];
            teams.team2 = [];
            teams.team3 = [];
            
            teamsData.forEach(team => {
                teams[`team${team.id}`] = team.Players;
            });

            // Обновляем отображение
            renderPlayers();
            renderTeams();
            renderStatistics();
            
            // Показываем сообщение об успехе
            alert(`Team ${winningTeamId} won! Statistics updated.`);
        }
    } catch (error) {
        console.error('Error updating match result:', error);
        alert('Error updating match result');
    }
}

// Функция отображения статистики
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