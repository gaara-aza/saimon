const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(191),
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Имя игрока не может быть пустым'
            },
            len: {
                args: [1, 191],
                msg: 'Имя игрока должно содержать от 1 до 191 символа'
            }
        }
    },
    number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    },
    position: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    },
    birthDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
    },
    active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
}, {
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

module.exports = Player; 