const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Путь к базе данных
const dbPath = process.env.DB_PATH || './database/krym_chitalka.db';
const dbDir = path.dirname(dbPath);

// Создаем папку для базы данных если её нет
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Создаем подключение к SQLite
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к SQLite:', err.message);
    } else {
        console.log('✅ Подключение к SQLite установлено');
        
        // Включаем внешние ключи
        db.run('PRAGMA foreign_keys = ON');
    }
});

// Функция для выполнения запросов (совместимость с PostgreSQL API)
const query = async (text, params = []) => {
    const start = Date.now();
    
    return new Promise((resolve, reject) => {
        // Преобразуем PostgreSQL синтаксис в SQLite
        let sqliteQuery = text
            .replace(/\$(\d+)/g, '?')  // $1, $2 -> ?
            .replace(/SERIAL/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
            .replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME')
            .replace(/TIMESTAMP/gi, 'DATETIME')
            .replace(/BOOLEAN/gi, 'INTEGER')
            .replace(/TEXT\[\]/gi, 'TEXT')  // Массивы в JSON
            .replace(/CURRENT_DATETIME/gi, 'CURRENT_TIMESTAMP');

        // Обработка INSERT с RETURNING для SQLite
        const hasReturning = /RETURNING\s+(.+)$/i.test(text);
        const isInsert = /INSERT\s+INTO/i.test(text);
        
        if (isInsert && hasReturning) {
            // Извлекаем поля из RETURNING
            const returningMatch = text.match(/RETURNING\s+(.+)$/i);
            const returningFields = returningMatch ? returningMatch[1].trim() : '*';
            
            // Убираем RETURNING из запроса
            sqliteQuery = sqliteQuery.replace(/\s+RETURNING\s+.+$/i, '');
            
            // Выполняем INSERT
            db.run(sqliteQuery, params, function(err) {
                const duration = Date.now() - start;
                if (err) {
                    console.error('❌ SQLite Error:', { text: sqliteQuery, duration, error: err.message });
                    reject(err);
                } else {
                    // Получаем вставленную запись
                    const insertedId = this.lastID;
                    const selectQuery = `SELECT ${returningFields} FROM ${text.match(/INSERT\s+INTO\s+(\w+)/i)[1]} WHERE id = ?`;
                    
                    db.all(selectQuery, [insertedId], (selectErr, rows) => {
                        if (selectErr) {
                            console.error('❌ SQLite Error:', { text: selectQuery, duration, error: selectErr.message });
                            reject(selectErr);
                        } else {
                            console.log('🔍 SQLite Query:', { text: sqliteQuery, duration, rows: rows.length });
                            resolve({ rows, rowCount: rows.length });
                        }
                    });
                }
            });
            return;
        }

        if (text.toLowerCase().includes('select')) {
            db.all(sqliteQuery, params, (err, rows) => {
                const duration = Date.now() - start;
                if (err) {
                    console.error('❌ SQLite Error:', { text: sqliteQuery, duration, error: err.message });
                    reject(err);
                } else {
                    console.log('🔍 SQLite Query:', { text: sqliteQuery, duration, rows: rows.length });
                    resolve({ rows, rowCount: rows.length });
                }
            });
        } else {
            db.run(sqliteQuery, params, function(err) {
                const duration = Date.now() - start;
                if (err) {
                    console.error('❌ SQLite Error:', { text: sqliteQuery, duration, error: err.message });
                    reject(err);
                } else {
                    console.log('🔍 SQLite Query:', { text: sqliteQuery, duration, changes: this.changes });
                    resolve({ 
                        rows: [], 
                        rowCount: this.changes,
                        insertId: this.lastID
                    });
                }
            });
        }
    });
};

// Создаем объект pool для совместимости с PostgreSQL API
const pool = {
    query: query
};

module.exports = {
    db,
    query,
    pool
};
