const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: 'Требуется авторизация' });
    }

    try {
        // Используем переменную окружения или запасной ключ для разработки
        const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-for-development';
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Ошибка проверки токена:', error);
        res.status(401).json({ message: 'Недействительный токен' });
    }
};

module.exports = {
    authenticateToken
}; 