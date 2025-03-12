// Глобальное хранилище игроков и команд
let players = [];
let selectedPlayers = [];
let teams = {
    team1: [],
    team2: [],
    team3: []
};

// Капитаны команд
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
        if (!response.ok) {
            throw new Error('Ошибка при загрузке игроков');
        }
        const data = await response.json();
        players = data;
        renderAllPlayers();
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
async function handleDeletePlayer(playerId) {
    try {
        console.log('Удаление игрока:', `${API_BASE_URL}/api/players/${playerId}`);
        const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log('Игрок успешно удален');
            
            // Удаляем игрока из локального массива
            players = players.filter(p => p.id !== playerId);
            
            // Обновляем отображение
            renderAllPlayers();
            
            // Также обновляем другие списки
            selectedPlayers = selectedPlayers.filter(p => p.id !== playerId);
            Object.keys(teams).forEach(teamName => {
                teams[teamName] = teams[teamName].filter(p => p.id !== playerId);
            });
            
            renderTeams();
        } else {
            console.error('Ошибка при удалении игрока:', response.status);
            const errorText = await response.text();
            console.error('Текст ошибки:', errorText);
            alert('Ошибка при удалении игрока');
        }
    } catch (error) {
        console.error('Исключение при удалении игрока:', error);
        alert('Ошибка при удалении игрока');
    }
}

// Отображение всех игроков со статистикой
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
        checkbox.checked = selectedPlayers.some(p => p.id === player.id);
        
        const label = document.createElement('label');
        label.htmlFor = `player${player.id}`;
        label.textContent = player.name;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-player';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => handleDeletePlayer(player.id);
        
        playerDiv.appendChild(checkbox);
        playerDiv.appendChild(label);
        playerDiv.appendChild(deleteButton);
        
        allPlayersList.appendChild(playerDiv);
    });
}

// Подтверждение выбора игроков
document.getElementById('confirmSelection').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#allPlayersList input[type="checkbox"]:checked');
    selectedPlayers = Array.from(checkboxes).map(cb => {
        return players.find(p => p.id === parseInt(cb.value));
    });

    // Показываем нужные секции
    document.querySelector('.team-controls').style.display = 'block';
    document.querySelector('.teams-section').style.display = 'block';

    // Очищаем команды
    teams.team1 = [];
    teams.team2 = [];
    teams.team3 = [];

    renderTeams();
});

// Отображение команд
function renderTeams() {
    Object.keys(teams).forEach(teamName => {
        const teamDiv = document.getElementById(teamName);
        if (!teamDiv) return;

        const teamPlayers = teamDiv.querySelector('.team-players');
        teamPlayers.innerHTML = '';
        
        teams[teamName].forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'team-player';
            playerDiv.innerHTML = `
                <span>${player.name}</span>
                <button onclick="removeFromTeam(${player.id}, '${teamName}')">Remove</button>
            `;
            teamPlayers.appendChild(playerDiv);
        });
    });
}

// Генерация случайных команд
document.getElementById('randomizeTeams').addEventListener('click', async () => {
    try {
        console.log('Генерация команд:', `${API_BASE_URL}/api/teams/random`);
        const response = await fetch(`${API_BASE_URL}/api/teams/random`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const teamsData = await response.json();
        teams = {
            team1: teamsData[0].Players || [],
            team2: teamsData[1].Players || [],
            team3: teamsData[2].Players || []
        };
        
        renderTeams();
        document.querySelector('.teams-section').style.display = 'block';
        
    } catch (error) {
        console.error('Ошибка при генерации команд:', error);
        alert('Ошибка при генерации команд');
    }
});

// Добавление игрока в команду
function addToTeam(playerId, teamName) {
    const player = players.find(p => p.id === playerId);
    if (player) {
        teams[teamName].push(player);
        renderTeams();
    }
}

// Удаление игрока из команды
function removeFromTeam(playerId, teamName) {
    if (teamCaptains[teamName] === playerId) {
        teamCaptains[teamName] = null;
    }
    teams[teamName] = teams[teamName].filter(player => player.id !== playerId);
    renderTeams();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', loadPlayers); 