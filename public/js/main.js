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
// Убираем дублирующийся слушатель
// document.addEventListener('DOMContentLoaded', async () => {
//     await loadPlayers();
// });

// Функция загрузки списка игроков
async function loadPlayers() {
    try {
        console.log('Загрузка игроков с:', `${API_BASE_URL}/api/players`);
        const response = await fetch(`${API_BASE_URL}/api/players`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Важно для отправки cookies с JWT токеном
        });
        
        if (response.status === 401) {
            // Если не авторизован, перенаправляем на страницу входа
            window.location.href = '/login';
            return;
        }
        
        if (!response.ok) {
            throw new Error('Ошибка при загрузке игроков');
        }
        
        const data = await response.json();
        players = data;
        renderAllPlayers();
    } catch (error) {
        console.error('Ошибка при загрузке игроков:', error);
        if (error.message.includes('401')) {
            window.location.href = '/login';
        }
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
            credentials: 'include', // Важно для отправки cookies с JWT токеном
            body: JSON.stringify({ name })
        });

        if (response.status === 401) {
            // Если не авторизован, перенаправляем на страницу входа
            window.location.href = '/login';
            return;
        }

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
        
        if (error.message.includes('401')) {
            window.location.href = '/login';
        }
    }
});

// Функция удаления игрока
async function handleDeletePlayer(playerId) {
    try {
        console.log('Удаление игрока:', `${API_BASE_URL}/api/players/${playerId}`);
        const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
            method: 'DELETE',
            credentials: 'include' // Важно для отправки cookies с JWT токеном
        });

        if (response.status === 401) {
            // Если не авторизован, перенаправляем на страницу входа
            window.location.href = '/login';
            return;
        }

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
        
        if (error.message.includes('401')) {
            window.location.href = '/login';
        }
    }
}

// Отображение всех игроков со статистикой
function renderAllPlayers() {
    const allPlayersList = document.getElementById('allPlayersList');
    allPlayersList.innerHTML = '';

    players.forEach(player => {
        // Проверяем, не находится ли игрок уже в какой-либо команде
        const isInAnyTeam = Object.values(teams).some(team => 
            team.some(p => p.id === player.id)
        );

        // Если игрок уже в команде, не показываем его в списке
        if (!isInAnyTeam) {
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
        }
    });
}

// Подтверждение выбора игроков
document.getElementById('confirmSelection').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#allPlayersList input[type="checkbox"]:checked');
    
    if (checkboxes.length === 0) {
        alert('Пожалуйста, выберите игроков');
        return;
    }

    selectedPlayers = Array.from(checkboxes).map(cb => {
        return players.find(p => p.id === parseInt(cb.value));
    });

    // Скрываем секцию выбора игроков
    document.querySelector('.player-selection-section').style.display = 'none';
    document.querySelector('.add-player-section').style.display = 'none';

    // Показываем секцию команд
    document.querySelector('.teams-section').style.display = 'block';

    // Очищаем команды
    teams.team1 = [];
    teams.team2 = [];
    teams.team3 = [];

    // Создаем новый контейнер для выбранных игроков
    const selectedPlayersContainer = document.createElement('div');
    selectedPlayersContainer.className = 'selected-players-container';
    selectedPlayersContainer.style.marginBottom = '20px';

    // Добавляем заголовок
    const header = document.createElement('h2');
    header.textContent = 'Распределение игроков по командам';
    header.style.marginBottom = '20px';
    selectedPlayersContainer.appendChild(header);

    // Создаем список выбранных игроков
    const playersList = document.createElement('div');
    playersList.className = 'selected-players-list';
    
    selectedPlayers.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-checkbox-item';
        
        const playerName = document.createElement('span');
        playerName.textContent = player.name;
        playerName.style.marginRight = '10px';
        
        const teamButtons = document.createElement('div');
        teamButtons.className = 'team-buttons';
        teamButtons.innerHTML = `
            <button onclick="добавитьВКоманду(${player.id}, 'team1')">Команда 1</button>
            <button onclick="добавитьВКоманду(${player.id}, 'team2')">Команда 2</button>
            <button onclick="добавитьВКоманду(${player.id}, 'team3')">Команда 3</button>
        `;
        
        playerDiv.appendChild(playerName);
        playerDiv.appendChild(teamButtons);
        playersList.appendChild(playerDiv);
    });

    selectedPlayersContainer.appendChild(playersList);

    // Добавляем кнопку "Назад"
    const backButton = document.createElement('button');
    backButton.textContent = 'Вернуться к выбору игроков';
    backButton.style.marginTop = '20px';
    backButton.onclick = () => {
        document.querySelector('.player-selection-section').style.display = 'block';
        document.querySelector('.add-player-section').style.display = 'block';
        document.querySelector('.teams-section').style.display = 'none';
        selectedPlayersContainer.remove();
        teams.team1 = [];
        teams.team2 = [];
        teams.team3 = [];
        renderTeams();
    };
    selectedPlayersContainer.appendChild(backButton);

    // Вставляем контейнер перед секцией команд
    const teamsSection = document.querySelector('.teams-section');
    teamsSection.parentNode.insertBefore(selectedPlayersContainer, teamsSection);

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
                <button onclick="удалитьИзКоманды(${player.id}, '${teamName}')">Удалить</button>
            `;
            teamPlayers.appendChild(playerDiv);
        });
    });
}

// Добавление игрока в команду
function добавитьВКоманду(playerId, teamName) {
    const player = players.find(p => p.id === playerId);
    if (player) {
        // Проверяем, не находится ли игрок уже в какой-либо команде
        const isInAnyTeam = Object.values(teams).some(team => 
            team.some(p => p.id === playerId)
        );

        if (isInAnyTeam) {
            alert('Этот игрок уже находится в команде');
            return;
        }

        // Добавляем игрока в команду
        teams[teamName].push(player);
        
        // Скрываем игрока из списка выбранных игроков
        const playerElements = document.querySelectorAll('.selected-players-list .player-checkbox-item');
        playerElements.forEach(element => {
            const nameSpan = element.querySelector('span');
            if (nameSpan && nameSpan.textContent === player.name) {
                element.style.display = 'none';
            }
        });
        
        // Обновляем отображение команд
        renderTeams();
    }
}

// Удаление игрока из команды
function удалитьИзКоманды(playerId, teamName) {
    const player = players.find(p => p.id === playerId);
    teams[teamName] = teams[teamName].filter(p => p.id !== playerId);
    
    // Показываем игрока обратно в списке выбранных игроков
    if (player) {
        const playerElements = document.querySelectorAll('.selected-players-list .player-checkbox-item');
        playerElements.forEach(element => {
            const nameSpan = element.querySelector('span');
            if (nameSpan && nameSpan.textContent === player.name) {
                element.style.display = 'flex';
            }
        });
    }
    
    renderTeams();
}

// Инициализация при загрузке страницы
// Убираем дублирующийся слушатель
// document.addEventListener('DOMContentLoaded', loadPlayers);

// Добавим кнопку выхода в главное меню
document.addEventListener('DOMContentLoaded', async () => {
    // Добавляем кнопку выхода
    const container = document.querySelector('.container');
    const logoutButton = document.createElement('button');
    logoutButton.textContent = 'Выйти';
    logoutButton.className = 'logout-button';
    logoutButton.style.marginLeft = 'auto';
    logoutButton.style.display = 'block';
    logoutButton.style.marginBottom = '20px';
    
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (response.ok) {
                // Перенаправляем на страницу входа
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Ошибка при выходе:', error);
        }
    });
    
    container.prepend(logoutButton);
    
    // Загружаем игроков
    await loadPlayers();
}); 