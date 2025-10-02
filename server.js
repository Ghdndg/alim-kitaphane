const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const paymentsRoutes = require('./routes/payments');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

// Доверяем прокси (nginx) - указываем количество прокси
app.set('trust proxy', 1);

// Middleware безопасности
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // лимит 100 запросов с IP за 15 минут
    message: {
        error: 'Слишком много запросов с этого IP, попробуйте позже.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Используем X-Forwarded-For из nginx
    skipFailedRequests: false,
    skipSuccessfulRequests: false
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // лимит 5 попыток входа за 15 минут
    message: {
        error: 'Слишком много попыток входа, попробуйте позже.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: false
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS настройки
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Парсинг JSON и cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Статические файлы
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// API маршруты
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/users', usersRoutes);

// Обработка 404 для API
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint не найден' });
});

// Обслуживание фронтенда
app.get('*', (req, res) => {
    if (req.path.includes('.')) {
        return res.status(404).send('Файл не найден');
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({ error: 'Ошибка валидации данных' });
    }
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Недействительный токен' });
    }
    
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📱 Фронтенд: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log(`🗄️ Среда: ${process.env.NODE_ENV || 'development'}`);
});
