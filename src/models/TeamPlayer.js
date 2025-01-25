const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Team = require('./Team');
const Player = require('./Player');

const TeamPlayer = sequelize.define('TeamPlayer', {
    teamId: {
        type: DataTypes.INTEGER,
        references: {
            model: Team,
            key: 'id'
        }
    },
    playerId: {
        type: DataTypes.INTEGER,
        references: {
            model: Player,
            key: 'id'
        }
    }
});

// Устанавливаем связи
Team.belongsToMany(Player, { through: TeamPlayer });
Player.belongsToMany(Team, { through: TeamPlayer });
Team.belongsTo(Player, { as: 'captain', foreignKey: 'captainId' });

module.exports = TeamPlayer; 