const { query, db } = require('../config/database');
require('dotenv').config();

const initDatabase = async () => {
    try {
        console.log('🚀 Инициализация SQLite базы данных...');

        // Создание таблицы пользователей
        await query(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание таблицы книг
        await query(`
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                author VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10,2) NOT NULL,
                cover_image_url VARCHAR(500),
                content_file_url VARCHAR(500),
                content_preview TEXT,
                genre VARCHAR(100),
                language VARCHAR(50) DEFAULT 'Крымскотатарский',
                pages INTEGER DEFAULT 0,
                rating DECIMAL(3,2) DEFAULT 0,
                reviews_count INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание таблицы покупок
        await query(`
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                payment_id VARCHAR(255) UNIQUE,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'RUB',
                status VARCHAR(50) DEFAULT 'pending',
                yukassa_payment_id VARCHAR(255),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                UNIQUE(user_id, book_id)
            );
        `);

        // Создание таблицы сессий чтения
        await query(`
            CREATE TABLE IF NOT EXISTS reading_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                current_page INTEGER DEFAULT 1,
                current_chapter INTEGER DEFAULT 0,
                reading_progress DECIMAL(5,2) DEFAULT 0,
                last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reading_settings TEXT,
                UNIQUE(user_id, book_id)
            );
        `);

        // Создание таблицы закладок
        await query(`
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
                page_number INTEGER NOT NULL,
                chapter_number INTEGER,
                note TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Создание индексов для производительности
        await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_purchases_payment_id ON purchases(payment_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_reading_sessions_user_book ON reading_sessions(user_id, book_id)`);
        await query(`CREATE INDEX IF NOT EXISTS idx_bookmarks_user_book ON bookmarks(user_id, book_id)`);

        // Добавление тестовой книги
        const bookExists = await query('SELECT id FROM books WHERE title = ?', ['Алим Мидат']);
        
        if (bookExists.rows.length === 0) {
            await query(`
                INSERT INTO books (
                    title, subtitle, author, description, price, genre, pages, rating, reviews_count,
                    content_preview
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'Алим Мидат',
                'Хаджи Гирай (Тарихий роман)',
                'Исторический роман о крымскотатарском наследии',
                'Эпический роман, охватывающий несколько поколений крымскотатарской семьи. От золотого века Крымского ханства до современных дней. История о том, как сохранить свою идентичность в меняющемся мире.',
                299.00,
                'Исторический роман',
                520,
                4.8,
                234,
                'Къырым... Бу сёз къальбимде не къадар чешит дуйгулар уйандыра...'
            ]);
            console.log('📚 Добавлена тестовая книга');
        }

        console.log('✅ База данных успешно инициализирована!');
        console.log('📊 Созданы таблицы:');
        console.log('   - users (пользователи)');
        console.log('   - books (книги)');
        console.log('   - purchases (покупки)');
        console.log('   - reading_sessions (сессии чтения)');
        console.log('   - bookmarks (закладки)');

    } catch (error) {
        console.error('❌ Ошибка инициализации базы данных:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Ошибка закрытия базы данных:', err.message);
            } else {
                console.log('🔒 Соединение с SQLite закрыто');
            }
        });
        process.exit(0);
    }
};

// Запуск инициализации
initDatabase();
