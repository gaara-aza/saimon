const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

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
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    }
}, {
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

// Установка ассоциации с моделью User
Player.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Player, { foreignKey: 'userId' });

module.exports = Player; 