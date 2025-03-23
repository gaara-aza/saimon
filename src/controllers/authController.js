const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const telegramBot = require('../services/telegramBot');

// Генерация случайного кода подтверждения
function generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Генерация JWT токена
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, phone: user.phone },
        process.env.JWT_SECRET || 'default-secret-key-for-development',
        { expiresIn: '30d' }
    );
};

// Запрос кода подтверждения
const requestVerificationCode = async (req, res) => {
    try {
        const { phone } = req.body;

        // Проверяем формат номера телефона
        if (!/^\+7[0-9]{10}$/.test(phone)) {
            return res.status(400).json({ 
                message: 'Неверный формат номера телефона. Используйте формат: +7XXXXXXXXXX' 
            });
        }

        // Находим или создаем пользователя
        let [user, created] = await User.findOrCreate({
            where: { phone },
            defaults: {
                verificationCode: generateVerificationCode(),
                isVerified: false
            }
        });

        if (!created) {
            // Если пользователь существует, обновляем код
            user.verificationCode = generateVerificationCode();
            await user.save();
        }

        // Пытаемся отправить код через Telegram, только если бот инициализирован
        let sentViaTelegram = false;
        if (telegramBot && telegramBot.bot) {
            try {
                sentViaTelegram = await telegramBot.sendVerificationCode(phone, user.verificationCode);
            } catch (botError) {
                console.warn('Ошибка отправки кода через Telegram:', botError.message);
                // Продолжаем работу, отправим код в ответе
            }
        } else {
            console.warn('Telegram бот не инициализирован, отправка кода невозможна');
        }

        // В режиме разработки или если отправка через Telegram не удалась,
        // возвращаем код в ответе
        if (process.env.NODE_ENV !== 'production' || !sentViaTelegram) {
            console.log(`Код подтверждения для ${phone}: ${user.verificationCode}`);
            res.json({ 
                message: 'Код подтверждения отправлен',
                code: user.verificationCode 
            });
        } else {
            res.json({ 
                message: 'Код подтверждения отправлен в Telegram'
            });
        }
    } catch (error) {
        console.error('Ошибка при отправке кода:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Подтверждение кода
const verifyCode = async (req, res) => {
    try {
        const { phone, code } = req.body;

        const user = await User.findOne({ where: { phone } });
        if (!user) {
            return res.status(404).json({ message: 'Пользователь не найден' });
        }

        if (user.verificationCode !== code) {
            return res.status(400).json({ message: 'Неверный код подтверждения' });
        }

        // Подтверждаем пользователя
        user.isVerified = true;
        user.verificationCode = null; // Очищаем код
        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
        });

        res.json({
            message: 'Успешная авторизация',
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Ошибка при проверке кода:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

// Обновление профиля
const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findByPk(req.user.id);

        user.name = name;
        await user.save();

        res.json({
            message: 'Профиль обновлен',
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
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
            attributes: ['id', 'phone', 'name', 'lastLogin', 'isVerified', 'telegramId']
        });
        res.json(user);
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
};

module.exports = {
    requestVerificationCode,
    verifyCode,
    updateProfile,
    logout,
    getCurrentUser
}; 