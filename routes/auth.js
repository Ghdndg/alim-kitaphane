const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { generateTokens, authenticateToken } = require('../middleware/auth');
const telegramService = require('../services/telegram');

const router = express.Router();

// Валидация регистрации
const registerValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Имя должно быть от 2 до 100 символов'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Некорректный email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Пароль должен быть минимум 6 символов')
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
        .withMessage('Пароль должен содержать буквы и цифры')
];

// Валидация входа
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Некорректный email'),
    body('password')
        .notEmpty()
        .withMessage('Пароль обязателен')
];

// Регистрация
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Ошибка валидации',
                details: errors.array()
            });
        }

        const { name, email, password } = req.body;

        // Проверяем, существует ли пользователь
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Пользователь с таким email уже существует'
            });
        }

        // Хешируем пароль
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Создаем пользователя
        const newUser = await pool.query(
            `INSERT INTO users (name, email, password_hash) 
             VALUES ($1, $2, $3) 
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        const user = newUser.rows[0];

        // Генерируем токены
        const { accessToken, refreshToken } = generateTokens(user.id);

        // Устанавливаем refresh token в HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
        });

        // Отправляем уведомление в Telegram
        telegramService.notifyNewRegistration({
            name: user.name,
            email: user.email
        }).catch(err => console.error('Ошибка отправки уведомления:', err));

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                library: []
            },
            accessToken
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Ошибка при регистрации' });
    }
});

// Вход
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Ошибка валидации',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Находим пользователя
        const userQuery = await pool.query(
            'SELECT id, name, email, password_hash, is_active FROM users WHERE email = $1',
            [email]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        const user = userQuery.rows[0];

        if (!user.is_active) {
            return res.status(401).json({ error: 'Аккаунт заблокирован' });
        }

        // Проверяем пароль
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }

        // Получаем библиотеку пользователя
        const libraryQuery = await pool.query(
            `SELECT b.id, b.title, b.subtitle, b.author 
             FROM purchases p 
             JOIN books b ON p.book_id = b.id 
             WHERE p.user_id = $1 AND p.status = 'completed'`,
            [user.id]
        );

        // Генерируем токены
        const { accessToken, refreshToken } = generateTokens(user.id);

        // Устанавливаем refresh token в cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Успешная авторизация',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                library: libraryQuery.rows.map(book => book.id)
            },
            accessToken
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка при входе' });
    }
});

// Выход
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Очищаем refresh token cookie
        res.clearCookie('refreshToken');
        
        res.json({ message: 'Успешный выход из системы' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Ошибка при выходе' });
    }
});

// Получение текущего пользователя
router.get('/me', authenticateToken, async (req, res) => {
    try {
        // Получаем библиотеку пользователя
        const libraryQuery = await pool.query(
            `SELECT b.id, b.title, b.subtitle, b.author 
             FROM purchases p 
             JOIN books b ON p.book_id = b.id 
             WHERE p.user_id = $1 AND p.status = 'completed'`,
            [req.user.id]
        );

        res.json({
            user: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                library: libraryQuery.rows.map(book => book.id)
            }
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка получения данных пользователя' });
    }
});

// Обновление токена
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.cookies;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token не предоставлен' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        
        if (decoded.type !== 'refresh') {
            return res.status(403).json({ error: 'Недействительный refresh token' });
        }

        // Генерируем новые токены
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        res.json({ accessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(403).json({ error: 'Недействительный refresh token' });
    }
});

module.exports = router;
