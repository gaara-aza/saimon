const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Валидация для регистрации и входа
const validateAuth = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage('Имя пользователя должно быть от 3 до 30 символов'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Пароль должен быть не менее 6 символов')
];

// Маршруты
router.post('/register', validateAuth, authController.register);
router.post('/login', validateAuth, authController.login);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getCurrentUser);

module.exports = router; 