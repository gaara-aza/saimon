const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isSelected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    // Statistics fields
    gamesPlayed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    gamesWon: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    points: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

module.exports = Player; 