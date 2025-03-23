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

// Define relationships
Team.belongsToMany(Player, { through: TeamPlayer });
Player.belongsToMany(Team, { through: TeamPlayer });
Team.belongsTo(Player, { as: 'captain', foreignKey: 'captainId' });

module.exports = TeamPlayer; 