const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Получение всех книг
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { page = 1, limit = 10, search, genre, sort = 'created_at' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, title, subtitle, author, description, price, cover_image_url,
                   genre, language, pages, rating, reviews_count, created_at
            FROM books 
            WHERE is_active = true
        `;
        const queryParams = [];
        let paramCount = 0;

        // Поиск
        if (search) {
            paramCount++;
            query += ` AND (title ILIKE $${paramCount} OR author ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        // Фильтр по жанру
        if (genre) {
            paramCount++;
            query += ` AND genre = $${paramCount}`;
            queryParams.push(genre);
        }

        // Сортировка
        const allowedSorts = ['created_at', 'title', 'author', 'price', 'rating'];
        const sortField = allowedSorts.includes(sort) ? sort : 'created_at';
        query += ` ORDER BY ${sortField} DESC`;

        // Пагинация
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        queryParams.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        queryParams.push(offset);

        const booksQuery = await pool.query(query, queryParams);

        // Подсчет общего количества
        let countQuery = 'SELECT COUNT(*) FROM books WHERE is_active = true';
        const countParams = [];
        let countParamCount = 0;

        if (search) {
            countParamCount++;
            countQuery += ` AND (title ILIKE $${countParamCount} OR author ILIKE $${countParamCount} OR description ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }

        if (genre) {
            countParamCount++;
            countQuery += ` AND genre = $${countParamCount}`;
            countParams.push(genre);
        }

        const countResult = await pool.query(countQuery, countParams);

        // Если пользователь авторизован, добавляем информацию о покупках
        let userPurchases = [];
        if (req.user) {
            const purchasesQuery = await pool.query(
                'SELECT book_id FROM purchases WHERE user_id = $1 AND status = $2',
                [req.user.id, 'completed']
            );
            userPurchases = purchasesQuery.rows.map(row => row.book_id);
        }

        const booksWithPurchaseInfo = booksQuery.rows.map(book => ({
            ...book,
            price: parseFloat(book.price),
            is_purchased: userPurchases.includes(book.id)
        }));

        res.json({
            books: booksWithPurchaseInfo,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(countResult.rows[0].count / limit)
            }
        });

    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Ошибка получения списка книг' });
    }
});

// Получение конкретной книги
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;

        const bookQuery = await pool.query(
            `SELECT id, title, subtitle, author, description, price, cover_image_url,
                    content_file_url, content_preview, genre, language, pages, 
                    rating, reviews_count, created_at, updated_at
             FROM books 
             WHERE id = $1 AND is_active = true`,
            [id]
        );

        if (bookQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }

        const book = bookQuery.rows[0];
        book.price = parseFloat(book.price);

        // Проверяем, купил ли пользователь эту книгу
        let isPurchased = false;
        if (req.user) {
            const purchaseQuery = await pool.query(
                'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
                [req.user.id, id, 'completed']
            );
            isPurchased = purchaseQuery.rows.length > 0;
        }

        book.is_purchased = isPurchased;

        res.json({ book });

    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ error: 'Ошибка получения информации о книге' });
    }
});

// Получение контента книги (только для купивших)
router.get('/:id/content', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Проверяем, купил ли пользователь книгу
        const purchaseQuery = await pool.query(
            'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
            [userId, id, 'completed']
        );

        if (purchaseQuery.rows.length === 0) {
            return res.status(403).json({ error: 'Доступ к содержимому книги запрещен' });
        }

        // Получаем контент книги
        const bookQuery = await pool.query(
            'SELECT title, content_file_url FROM books WHERE id = $1 AND is_active = true',
            [id]
        );

        if (bookQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }

        const book = bookQuery.rows[0];

        // В реальном приложении здесь бы возвращался файл или защищенная ссылка
        // Пока возвращаем заглушку с контентом
        const content = {
            title: book.title,
            chapters: [
                {
                    id: 0,
                    title: "Къириш",
                    content: `
                        <h2 class="chapter-title">Къириш</h2>
                        <div class="text-block">
                            <p>Алим Мидат къалемининъ асери - "Хаджи Гирай" тарихий романы, Къырым Хандырынынъ буюк шахсиетлеринден биси акъкъында...</p>
                        </div>
                    `
                },
                {
                    id: 1,
                    title: "1-чи Фасыл - Хандыр Сарайы",
                    content: `
                        <h3 class="section-title">1-чи Фасыл<br>Хандыр Сарайы</h3>
                        <div class="text-block">
                            <p>Бахчисарай сарайы гунь догъгъанда алтын нурларда ялтырай эди...</p>
                        </div>
                    `
                }
            ],
            total_pages: 520
        };

        res.json({ content });

    } catch (error) {
        console.error('Get book content error:', error);
        res.status(500).json({ error: 'Ошибка получения содержимого книги' });
    }
});

// Получение превью книги (бесплатно)
router.get('/:id/preview', async (req, res) => {
    try {
        const { id } = req.params;

        const bookQuery = await pool.query(
            'SELECT title, author, content_preview FROM books WHERE id = $1 AND is_active = true',
            [id]
        );

        if (bookQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }

        const book = bookQuery.rows[0];

        res.json({
            title: book.title,
            author: book.author,
            preview: book.content_preview || 'Превью недоступно для этой книги.'
        });

    } catch (error) {
        console.error('Get book preview error:', error);
        res.status(500).json({ error: 'Ошибка получения превью книги' });
    }
});

// Получение жанров
router.get('/meta/genres', async (req, res) => {
    try {
        const genresQuery = await pool.query(
            'SELECT DISTINCT genre, COUNT(*) as count FROM books WHERE is_active = true GROUP BY genre ORDER BY count DESC'
        );

        res.json({
            genres: genresQuery.rows
        });

    } catch (error) {
        console.error('Get genres error:', error);
        res.status(500).json({ error: 'Ошибка получения списка жанров' });
    }
});

// Поиск книг
router.get('/search/:query', optionalAuth, async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 20 } = req.query;

        const searchQuery = await pool.query(
            `SELECT id, title, subtitle, author, description, price, cover_image_url,
                    genre, rating, reviews_count
             FROM books 
             WHERE is_active = true 
             AND (
                 title ILIKE $1 OR 
                 author ILIKE $1 OR 
                 description ILIKE $1 OR
                 genre ILIKE $1
             )
             ORDER BY 
                 CASE 
                     WHEN title ILIKE $1 THEN 1
                     WHEN author ILIKE $1 THEN 2
                     WHEN genre ILIKE $1 THEN 3
                     ELSE 4
                 END,
                 rating DESC
             LIMIT $2`,
            [`%${query}%`, limit]
        );

        // Если пользователь авторизован, добавляем информацию о покупках
        let userPurchases = [];
        if (req.user) {
            const purchasesQuery = await pool.query(
                'SELECT book_id FROM purchases WHERE user_id = $1 AND status = $2',
                [req.user.id, 'completed']
            );
            userPurchases = purchasesQuery.rows.map(row => row.book_id);
        }

        const booksWithPurchaseInfo = searchQuery.rows.map(book => ({
            ...book,
            price: parseFloat(book.price),
            is_purchased: userPurchases.includes(book.id)
        }));

        res.json({
            query,
            results: booksWithPurchaseInfo,
            count: booksWithPurchaseInfo.length
        });

    } catch (error) {
        console.error('Search books error:', error);
        res.status(500).json({ error: 'Ошибка поиска книг' });
    }
});

module.exports = router;
