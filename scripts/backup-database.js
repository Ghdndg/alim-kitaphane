require('dotenv').config();
const fs = require('fs');
const path = require('path');
const telegramService = require('../services/telegram');

async function backupDatabase() {
    try {
        const dbPath = process.env.DB_PATH || './database/krym_chitalka.db';
        const backupDir = path.join(__dirname, '../backups');
        
        // Создаём папку для бэкапов, если её нет
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        // Проверяем, существует ли база данных
        if (!fs.existsSync(dbPath)) {
            console.error('База данных не найдена:', dbPath);
            return;
        }
        
        // Создаём имя файла с датой и временем
        const date = new Date();
        const dateStr = date.toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupFileName = `backup_${dateStr}.db`;
        const backupPath = path.join(backupDir, backupFileName);
        
        // Копируем базу данных
        fs.copyFileSync(dbPath, backupPath);
        
        console.log('✅ Бэкап создан:', backupFileName);
        console.log('📂 Путь:', backupPath);
        
        // Отправляем бэкап в Telegram
        await telegramService.sendDocument(
            backupPath,
            `📦 Бэкап базы данных\n📅 ${date.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
        );
        
        console.log('✅ Бэкап отправлен в Telegram');
        
        // Удаляем старые бэкапы (оставляем последние 7 дней)
        cleanOldBackups(backupDir, 7);
        
    } catch (error) {
        console.error('❌ Ошибка создания бэкапа:', error);
        
        // Отправляем уведомление об ошибке
        await telegramService.sendMessage(
            `❌ <b>Ошибка создания бэкапа!</b>\n\n${error.message}`
        );
    }
}

function cleanOldBackups(backupDir, daysToKeep) {
    try {
        const files = fs.readdirSync(backupDir);
        const now = Date.now();
        const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // дни в миллисекунды
        
        files.forEach(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            const age = now - stats.mtimeMs;
            
            if (age > maxAge) {
                fs.unlinkSync(filePath);
                console.log('🗑️  Удалён старый бэкап:', file);
            }
        });
    } catch (error) {
        console.error('Ошибка очистки старых бэкапов:', error);
    }
}

// Запускаем бэкап
backupDatabase();

