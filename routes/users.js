const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Получение библиотеки пользователя
router.get('/library', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const libraryQuery = await pool.query(
            `SELECT b.id, b.title, b.subtitle, b.author, b.cover_image_url, 
                    b.genre, b.pages, b.rating, p.completed_at,
                    rs.current_page, rs.reading_progress, rs.last_read_at
             FROM purchases p
             JOIN books b ON p.book_id = b.id
             LEFT JOIN reading_sessions rs ON rs.user_id = p.user_id AND rs.book_id = p.book_id
             WHERE p.user_id = $1 AND p.status = 'completed'
             ORDER BY p.completed_at DESC
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countQuery = await pool.query(
            'SELECT COUNT(*) FROM purchases WHERE user_id = $1 AND status = $2',
            [userId, 'completed']
        );

        res.json({
            library: libraryQuery.rows.map(book => ({
                ...book,
                reading_progress: parseFloat(book.reading_progress) || 0,
                current_page: book.current_page || 1
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countQuery.rows[0].count),
                pages: Math.ceil(countQuery.rows[0].count / limit)
            }
        });

    } catch (error) {
        console.error('Get library error:', error);
        res.status(500).json({ error: 'Ошибка получения библиотеки' });
    }
});

// Получение/обновление сессии чтения
router.get('/reading-session/:bookId', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;

        // Проверяем, что пользователь купил книгу
        const purchaseQuery = await pool.query(
            'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
            [userId, bookId, 'completed']
        );

        if (purchaseQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ к книге запрещен' });
        }

        // Получаем сессию чтения
        const sessionQuery = await pool.query(
            'SELECT * FROM reading_sessions WHERE user_id = $1 AND book_id = $2',
            [userId, bookId]
        );

        let session;
        if (sessionQuery.rows.length === 0) {
            // Создаем новую сессию
            const newSession = await pool.query(
                `INSERT INTO reading_sessions (user_id, book_id, current_page, current_chapter, reading_progress)
                 VALUES ($1, $2, 1, 0, 0)
                 RETURNING *`,
                [userId, bookId]
            );
            session = newSession.rows[0];
        } else {
            session = sessionQuery.rows[0];
        }

        res.json({
            session: {
                current_page: session.current_page,
                current_chapter: session.current_chapter,
                reading_progress: parseFloat(session.reading_progress),
                reading_settings: session.reading_settings,
                last_read_at: session.last_read_at
            }
        });

    } catch (error) {
        console.error('Get reading session error:', error);
        res.status(500).json({ error: 'Ошибка получения сессии чтения' });
    }
});

// Обновление сессии чтения
router.put('/reading-session/:bookId', authenticateToken, [
    body('currentPage').optional().isInt({ min: 1 }),
    body('currentChapter').optional().isInt({ min: 0 }),
    body('readingProgress').optional().isFloat({ min: 0, max: 100 }),
    body('readingSettings').optional().isObject()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Ошибка валидации',
                details: errors.array()
            });
        }

        const { bookId } = req.params;
        const userId = req.user.id;
        const { currentPage, currentChapter, readingProgress, readingSettings } = req.body;

        // Проверяем доступ к книге
        const purchaseQuery = await pool.query(
            'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
            [userId, bookId, 'completed']
        );

        if (purchaseQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ к книге запрещен' });
        }

        // Обновляем сессию
        const updateQuery = await pool.query(
            `INSERT INTO reading_sessions (user_id, book_id, current_page, current_chapter, reading_progress, reading_settings, last_read_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             ON CONFLICT (user_id, book_id)
             DO UPDATE SET
                current_page = COALESCE($3, reading_sessions.current_page),
                current_chapter = COALESCE($4, reading_sessions.current_chapter),
                reading_progress = COALESCE($5, reading_sessions.reading_progress),
                reading_settings = COALESCE($6, reading_sessions.reading_settings),
                last_read_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [userId, bookId, currentPage, currentChapter, readingProgress, JSON.stringify(readingSettings)]
        );

        const session = updateQuery.rows[0];

        res.json({
            message: 'Сессия чтения обновлена',
            session: {
                current_page: session.current_page,
                current_chapter: session.current_chapter,
                reading_progress: parseFloat(session.reading_progress),
                reading_settings: session.reading_settings,
                last_read_at: session.last_read_at
            }
        });

    } catch (error) {
        console.error('Update reading session error:', error);
        res.status(500).json({ error: 'Ошибка обновления сессии чтения' });
    }
});

// Получение закладок
router.get('/bookmarks/:bookId', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;

        // Проверяем доступ к книге
        const purchaseQuery = await pool.query(
            'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
            [userId, bookId, 'completed']
        );

        if (purchaseQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ к книге запрещен' });
        }

        const bookmarksQuery = await pool.query(
            'SELECT * FROM bookmarks WHERE user_id = $1 AND book_id = $2 ORDER BY page_number ASC',
            [userId, bookId]
        );

        res.json({
            bookmarks: bookmarksQuery.rows
        });

    } catch (error) {
        console.error('Get bookmarks error:', error);
        res.status(500).json({ error: 'Ошибка получения закладок' });
    }
});

// Добавление закладки
router.post('/bookmarks/:bookId', authenticateToken, [
    body('pageNumber').isInt({ min: 1 }),
    body('chapterNumber').optional().isInt({ min: 0 }),
    body('note').optional().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Ошибка валидации',
                details: errors.array()
            });
        }

        const { bookId } = req.params;
        const userId = req.user.id;
        const { pageNumber, chapterNumber, note } = req.body;

        // Проверяем доступ к книге
        const purchaseQuery = await pool.query(
            'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
            [userId, bookId, 'completed']
        );

        if (purchaseQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ к книге запрещен' });
        }

        // Проверяем, нет ли уже закладки на этой странице
        const existingBookmark = await pool.query(
            'SELECT id FROM bookmarks WHERE user_id = $1 AND book_id = $2 AND page_number = $3',
            [userId, bookId, pageNumber]
        );

        if (existingBookmark.rows.length > 0) {
            return res.status(409).json({ error: 'Закладка на этой странице уже существует' });
        }

        // Добавляем закладку
        const newBookmark = await pool.query(
            `INSERT INTO bookmarks (user_id, book_id, page_number, chapter_number, note)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, bookId, pageNumber, chapterNumber, note]
        );

        res.status(201).json({
            message: 'Закладка добавлена',
            bookmark: newBookmark.rows[0]
        });

    } catch (error) {
        console.error('Add bookmark error:', error);
        res.status(500).json({ error: 'Ошибка добавления закладки' });
    }
});

// Удаление закладки
router.delete('/bookmarks/:bookmarkId', authenticateToken, async (req, res) => {
    try {
        const { bookmarkId } = req.params;
        const userId = req.user.id;

        const deleteResult = await pool.query(
            'DELETE FROM bookmarks WHERE id = $1 AND user_id = $2 RETURNING id',
            [bookmarkId, userId]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Закладка не найдена' });
        }

        res.json({ message: 'Закладка удалена' });

    } catch (error) {
        console.error('Delete bookmark error:', error);
        res.status(500).json({ error: 'Ошибка удаления закладки' });
    }
});

// Получение статистики чтения
router.get('/reading-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Общая статистика
        const statsQuery = await pool.query(`
            SELECT 
                COUNT(DISTINCT p.book_id) as books_purchased,
                COUNT(DISTINCT rs.book_id) as books_started,
                COALESCE(AVG(rs.reading_progress), 0) as avg_progress,
                COUNT(DISTINCT b.id) as total_bookmarks
            FROM purchases p
            LEFT JOIN reading_sessions rs ON p.user_id = rs.user_id AND p.book_id = rs.book_id
            LEFT JOIN bookmarks b ON p.user_id = b.user_id AND p.book_id = b.book_id
            WHERE p.user_id = $1 AND p.status = 'completed'
        `, [userId]);

        // Последние прочитанные книги
        const recentQuery = await pool.query(`
            SELECT b.title, b.author, rs.reading_progress, rs.last_read_at
            FROM reading_sessions rs
            JOIN books b ON rs.book_id = b.id
            WHERE rs.user_id = $1
            ORDER BY rs.last_read_at DESC
            LIMIT 5
        `, [userId]);

        const stats = statsQuery.rows[0];

        res.json({
            stats: {
                books_purchased: parseInt(stats.books_purchased),
                books_started: parseInt(stats.books_started),
                avg_progress: parseFloat(stats.avg_progress).toFixed(1),
                total_bookmarks: parseInt(stats.total_bookmarks)
            },
            recent_books: recentQuery.rows.map(book => ({
                ...book,
                reading_progress: parseFloat(book.reading_progress)
            }))
        });

    } catch (error) {
        console.error('Get reading stats error:', error);
        res.status(500).json({ error: 'Ошибка получения статистики чтения' });
    }
});

module.exports = router;
