// Globalnoe hranilische igrokov i komand
let players = [];
let selectedPlayers = [];
let teams = {
    team1: [],
    team2: [],
    team3: []
};

// ���������� ��������� ���������
let teamCaptains = {
    team1: null,
    team2: null,
    team3: null
};

// Конфигурация API URL
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001'
    : 'https://saimon-production.up.railway.app';

console.log('Using API URL:', API_BASE_URL);

// Загрузка игроков при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayers();
});

// Функция загрузки списка игроков
async function loadPlayers() {
    try {
        console.log('Загрузка игроков с:', `${API_BASE_URL}/api/players`);
        const response = await fetch(`${API_BASE_URL}/api/players`);
        const players = await response.json();
        
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';
        
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.innerHTML = `
                <span>${player.name}</span>
                <button onclick="deletePlayer(${player.id})">Удалить</button>
            `;
            playersList.appendChild(playerElement);
        });
        
        // Показываем секцию со списком игроков
        document.querySelector('.available-players-section').style.display = 'block';
        
    } catch (error) {
        console.error('Ошибка при загрузке игроков:', error);
    }
}

// Обработка формы добавления игрока
document.getElementById('addPlayerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('playerName');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Пожалуйста, введите имя игрока');
        return;
    }

    try {
        console.log('Отправка запроса на:', `${API_BASE_URL}/api/players`);
        
        const response = await fetch(`${API_BASE_URL}/api/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const player = await response.json();
        console.log('Игрок добавлен:', player);
        
        // Очищаем поле ввода
        nameInput.value = '';
        
        // Обновляем список игроков
        await loadPlayers();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении игрока');
    }
});

// Функция удаления игрока
async function deletePlayer(playerId) {
    try {
        console.log('Удаление игрока:', `${API_BASE_URL}/api/players/${playerId}`);
        const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Обновляем список игроков после удаления
        await loadPlayers();
        
    } catch (error) {
        console.error('Ошибка при удалении игрока:', error);
        alert('Ошибка при удалении игрока');
    }
}

//    
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

//    
document.getElementById('confirmSelection').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#allPlayersList input[type="checkbox"]:checked');
    selectedPlayers = Array.from(checkboxes).map(cb => {
        return players.find(p => p.id === parseInt(cb.value));
    });

    if (selectedPlayers.length < 6) {
        alert('Please select at least 6 players');
        return;
    }

    //     
    document.querySelector('.team-controls').style.display = 'block';
    document.querySelector('.available-players-section').style.display = 'block';
    document.querySelector('.teams-section').style.display = 'block';

    //   
    document.querySelector('.player-selection-section').style.display = 'none';

    //  
    teams.team1 = [];
    teams.team2 = [];
    teams.team3 = [];

    renderPlayers();
    renderTeams();
});

//     
function renderPlayers() {
    const playersList = document.getElementById('playersList');
    playersList.innerHTML = '';

    //    ,    
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
    //     ,  
    if (teamCaptains[teamName] === playerId) {
        teamCaptains[teamName] = null;
    }
    
    teams[teamName] = teams[teamName].filter(player => player.id !== playerId);
    renderPlayers();
    renderTeams();
}

//    
function renderTeams() {
    Object.keys(teams).forEach(teamName => {
        const teamDiv = document.getElementById(teamName);
        const teamPlayers = teamDiv.querySelector('.team-players');
        const captainSelect = teamDiv.querySelector('.captain-select');
        
        //     
        captainSelect.innerHTML = '<option value="">Select Captain</option>';
        teams[teamName].forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            option.selected = teamCaptains[teamName] === player.id;
            captainSelect.appendChild(option);
        });

        //    
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

// ��������� ����������� ��� ������ ��������
document.querySelectorAll('.captain-select').forEach(select => {
    select.addEventListener('change', async (e) => {
        const teamId = e.target.dataset.team;
        const teamName = `team${teamId}`;
        const playerId = parseInt(e.target.value);
        
        teamCaptains[teamName] = playerId || null;
        
        try {
            // ���������� ���������� � �������� �� ������
            const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/captain`, {
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
                // ���������� ��������� ��� ������
                teamCaptains[teamName] = null;
                renderTeams();
            }
        } catch (error) {
            console.error('Error:', error);
            // ���������� ��������� ��� ������
            teamCaptains[teamName] = null;
            renderTeams();
        }
    });
});

// ��������� ���������� ���������� �������������
document.getElementById('randomizeTeams').addEventListener('click', async () => {
    if (selectedPlayers.length < 6) {
        alert('Not enough players selected');
        return;
    }

    // ���������� ��������� ��� ����� �������������
    teamCaptains = {
        team1: null,
        team2: null,
        team3: null
    };

    // ��������� ��� ������������� �������� ��� ���������
    const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const playersPerTeam = Math.floor(shuffledPlayers.length / 3);

    teams.team1 = shuffledPlayers.slice(0, playersPerTeam);
    teams.team2 = shuffledPlayers.slice(playersPerTeam, playersPerTeam * 2);
    teams.team3 = shuffledPlayers.slice(playersPerTeam * 2);

    renderPlayers();
    renderTeams();
});

// ������� ���������� 
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

// Генерация случайных команд
async function generateTeams() {
    try {
        console.log('Генерация команд:', `${API_BASE_URL}/api/teams/random`);
        const response = await fetch(`${API_BASE_URL}/api/teams/random`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const teams = await response.json();
        displayTeams(teams);
        
    } catch (error) {
        console.error('Ошибка при генерации команд:', error);
        alert('Ошибка при генерации команд');
    }
}

// Отображение команд
function displayTeams(teams) {
    teams.forEach((team, index) => {
        const teamDiv = document.getElementById(`team${index + 1}`);
        if (teamDiv) {
            const teamPlayers = teamDiv.querySelector('.team-players');
            teamPlayers.innerHTML = '';
            
            team.Players.forEach(player => {
                const playerDiv = document.createElement('div');
                playerDiv.className = 'team-player';
                playerDiv.innerHTML = `<span>${player.name}</span>`;
                teamPlayers.appendChild(playerDiv);
            });
        }
    });
    
    // Показываем секцию с командами
    document.querySelector('.teams-section').style.display = 'block';
}

// Загружаем игроков при загрузке страницы
document.addEventListener('DOMContentLoaded', loadPlayers); 