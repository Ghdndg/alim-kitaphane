const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ error: 'Токен доступа не предоставлен' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Проверяем, что пользователь существует и активен
        const userQuery = await pool.query(
            'SELECT id, name, email, is_active FROM users WHERE id = $1 AND is_active = true',
            [decoded.userId]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).json({ error: 'Пользователь не найден или неактивен' });
        }

        req.user = userQuery.rows[0];
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Токен истек' });
        }
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Ошибка авторизации' });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userQuery = await pool.query(
                'SELECT id, name, email, is_active FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );

            if (userQuery.rows.length > 0) {
                req.user = userQuery.rows[0];
            }
        }
        
        next();
    } catch (error) {
        // Игнорируем ошибки токена для опционального auth
        next();
    }
};

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    generateTokens
};
