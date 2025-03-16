const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Генерация JWT токена
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// Регистрация
const register = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Проверяем, существует ли пользователь
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ message: 'Пользователь уже существует' });
        }

        // Создаем нового пользователя
        const user = await User.create({
            username,
            password
        });

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 часа
        });

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
};

// Вход
const login = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Находим пользователя
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
        }

        // Проверяем пароль
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
        }

        // Обновляем время последнего входа
        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 часа
        });

        res.json({
            message: 'Успешный вход',
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка при входе:', error);
        res.status(500).json({ message: 'Ошибка сервера при входе' });
    }
};

// Выход
const logout = (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Успешный выход' });
};

// Получение информации о текущем пользователе
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'username', 'role', 'lastLogin']
        });
        res.json(user);
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser
}; 