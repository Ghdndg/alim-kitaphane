const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ЮKassa API настройки
const YUKASSA_API_URL = 'https://api.yookassa.ru/v3';
const YUKASSA_SHOP_ID = process.env.YUKASSA_SHOP_ID;
const YUKASSA_SECRET_KEY = process.env.YUKASSA_SECRET_KEY;

// Создание заголовков для ЮKassa
const getYuKassaHeaders = () => {
    const auth = Buffer.from(`${YUKASSA_SHOP_ID}:${YUKASSA_SECRET_KEY}`).toString('base64');
    return {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Idempotence-Key': uuidv4()
    };
};

// Валидация создания платежа
const createPaymentValidation = [
    body('bookId')
        .isInt({ min: 1 })
        .withMessage('ID книги должен быть положительным числом'),
    body('returnUrl')
        .optional()
        .isURL()
        .withMessage('Некорректный URL возврата')
];

// Создание платежа
router.post('/create', authenticateToken, createPaymentValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Ошибка валидации',
                details: errors.array()
            });
        }

        const { bookId, returnUrl } = req.body;
        const userId = req.user.id;

        // Проверяем, что книга существует
        const bookQuery = await pool.query(
            'SELECT id, title, price FROM books WHERE id = $1 AND is_active = true',
            [bookId]
        );

        if (bookQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Книга не найдена' });
        }

        const book = bookQuery.rows[0];

        // Проверяем, не купил ли пользователь уже эту книгу
        const existingPurchase = await pool.query(
            'SELECT id FROM purchases WHERE user_id = $1 AND book_id = $2 AND status = $3',
            [userId, bookId, 'completed']
        );

        if (existingPurchase.rows.length > 0) {
            return res.status(409).json({ error: 'Книга уже куплена' });
        }

        // Создаем запись о покупке
        const paymentId = uuidv4();
        const amount = parseFloat(book.price);

        const purchaseQuery = await pool.query(
            `INSERT INTO purchases (user_id, book_id, payment_id, amount, status) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id`,
            [userId, bookId, paymentId, amount, 'pending']
        );

        // Создаем платеж в ЮKassa
        const yuKassaPayload = {
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            payment_method_data: {
                type: 'bank_card'
            },
            confirmation: {
                type: 'redirect',
                return_url: returnUrl || `${process.env.FRONTEND_URL}/payment-success`
            },
            capture: true,
            description: `Покупка книги: ${book.title}`,
            metadata: {
                user_id: userId.toString(),
                book_id: bookId.toString(),
                payment_id: paymentId
            }
        };

        const yuKassaResponse = await axios.post(
            `${YUKASSA_API_URL}/payments`,
            yuKassaPayload,
            { headers: getYuKassaHeaders() }
        );

        // Обновляем запись о покупке с ID от ЮKassa
        await pool.query(
            'UPDATE purchases SET yukassa_payment_id = $1 WHERE id = $2',
            [yuKassaResponse.data.id, purchaseQuery.rows[0].id]
        );

        res.status(201).json({
            payment_id: paymentId,
            yukassa_payment_id: yuKassaResponse.data.id,
            confirmation_url: yuKassaResponse.data.confirmation.confirmation_url,
            amount: amount,
            currency: 'RUB',
            status: 'pending'
        });

    } catch (error) {
        console.error('Create payment error:', error);
        
        if (error.response?.data) {
            console.error('ЮKassa error:', error.response.data);
            return res.status(400).json({ 
                error: 'Ошибка создания платежа',
                details: error.response.data 
            });
        }
        
        res.status(500).json({ error: 'Ошибка при создании платежа' });
    }
});

// Проверка статуса платежа
router.get('/status/:paymentId', authenticateToken, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user.id;

        // Получаем информацию о платеже из БД
        const purchaseQuery = await pool.query(
            `SELECT p.*, b.title, b.author 
             FROM purchases p 
             JOIN books b ON p.book_id = b.id 
             WHERE p.payment_id = $1 AND p.user_id = $2`,
            [paymentId, userId]
        );

        if (purchaseQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Платеж не найден' });
        }

        const purchase = purchaseQuery.rows[0];

        // Если есть ЮKassa ID, проверяем статус в ЮKassa
        if (purchase.yukassa_payment_id) {
            try {
                const yuKassaResponse = await axios.get(
                    `${YUKASSA_API_URL}/payments/${purchase.yukassa_payment_id}`,
                    { headers: getYuKassaHeaders() }
                );

                const yuKassaStatus = yuKassaResponse.data.status;
                
                // Обновляем статус в БД если изменился
                if (yuKassaStatus === 'succeeded' && purchase.status !== 'completed') {
                    await pool.query(
                        'UPDATE purchases SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
                        ['completed', purchase.id]
                    );
                    purchase.status = 'completed';
                } else if (yuKassaStatus === 'canceled' && purchase.status !== 'failed') {
                    await pool.query(
                        'UPDATE purchases SET status = $1 WHERE id = $2',
                        ['failed', purchase.id]
                    );
                    purchase.status = 'failed';
                }
            } catch (yuKassaError) {
                console.error('ЮKassa status check error:', yuKassaError);
            }
        }

        res.json({
            payment_id: purchase.payment_id,
            status: purchase.status,
            amount: parseFloat(purchase.amount),
            currency: purchase.currency,
            book: {
                id: purchase.book_id,
                title: purchase.title,
                author: purchase.author
            },
            created_at: purchase.created_at,
            completed_at: purchase.completed_at
        });

    } catch (error) {
        console.error('Payment status error:', error);
        res.status(500).json({ error: 'Ошибка при проверке статуса платежа' });
    }
});

// Webhook от ЮKassa
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        // Проверяем подпись webhook (если настроена)
        const signature = req.headers['yookassa-webhook-signature'];
        
        // В продакшене здесь должна быть проверка подписи
        // if (!verifyWebhookSignature(req.body, signature)) {
        //     return res.status(400).json({ error: 'Invalid signature' });
        // }

        const event = JSON.parse(req.body);
        
        if (event.event === 'payment.succeeded') {
            const payment = event.object;
            
            // Находим платеж в БД
            const purchaseQuery = await pool.query(
                'SELECT id, user_id, book_id FROM purchases WHERE yukassa_payment_id = $1',
                [payment.id]
            );

            if (purchaseQuery.rows.length > 0) {
                const purchase = purchaseQuery.rows[0];
                
                // Обновляем статус
                await pool.query(
                    'UPDATE purchases SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
                    ['completed', purchase.id]
                );

                console.log(`✅ Платеж ${payment.id} успешно завершен`);
            }
        } else if (event.event === 'payment.canceled') {
            const payment = event.object;
            
            await pool.query(
                'UPDATE purchases SET status = $1 WHERE yukassa_payment_id = $2',
                ['failed', payment.id]
            );

            console.log(`❌ Платеж ${payment.id} отменен`);
        }

        res.status(200).json({ success: true });
        
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Webhook processing error' });
    }
});

// Получение истории платежей пользователя
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;
        
        const offset = (page - 1) * limit;

        const historyQuery = await pool.query(
            `SELECT p.payment_id, p.amount, p.currency, p.status, p.created_at, p.completed_at,
                    b.id as book_id, b.title, b.author, b.cover_image_url
             FROM purchases p 
             JOIN books b ON p.book_id = b.id 
             WHERE p.user_id = $1 
             ORDER BY p.created_at DESC 
             LIMIT $2 OFFSET $3`,
            [userId, limit, offset]
        );

        const countQuery = await pool.query(
            'SELECT COUNT(*) FROM purchases WHERE user_id = $1',
            [userId]
        );

        res.json({
            payments: historyQuery.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countQuery.rows[0].count),
                pages: Math.ceil(countQuery.rows[0].count / limit)
            }
        });

    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Ошибка получения истории платежей' });
    }
});

module.exports = router;
