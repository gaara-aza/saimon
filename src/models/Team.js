const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Team = sequelize.define('Team', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    captainId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Players',
            key: 'id'
        }
    }
});

module.exports = Team; 