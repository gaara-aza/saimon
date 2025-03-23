const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Team = require('./Team');
const Player = require('./Player');

const TeamPlayer = sequelize.define('TeamPlayer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    joinDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    leaveDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    timestamps: true
});

// Установим отношения, только если они еще не установлены
try {
    // Define relationships
    Team.belongsToMany(Player, { through: TeamPlayer });
    Player.belongsToMany(Team, { through: TeamPlayer });
    
    // Make sure the captain relationship is set correctly
    if (!Team.associations.captain) {
        Team.belongsTo(Player, { as: 'captain', foreignKey: 'captainId' });
    }
} catch (error) {
    console.warn('Error setting up relationships:', error.message);
}

module.exports = TeamPlayer; 