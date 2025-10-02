const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

class TelegramService {
    constructor() {
        this.baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
    }

    async sendMessage(text) {
        try {
            if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
                console.log('Telegram not configured, skipping notification');
                return;
            }

            const response = await axios.post(`${this.baseUrl}/sendMessage`, {
                chat_id: TELEGRAM_CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            });

            return response.data;
        } catch (error) {
            console.error('Ошибка отправки Telegram сообщения:', error.message);
        }
    }

    async sendDocument(filePath, caption = '') {
        try {
            if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
                console.log('Telegram not configured, skipping backup');
                return;
            }

            const FormData = require('form-data');
            const fs = require('fs');
            const form = new FormData();
            
            form.append('chat_id', TELEGRAM_CHAT_ID);
            form.append('document', fs.createReadStream(filePath));
            if (caption) {
                form.append('caption', caption);
            }

            const response = await axios.post(`${this.baseUrl}/sendDocument`, form, {
                headers: form.getHeaders()
            });

            return response.data;
        } catch (error) {
            console.error('Ошибка отправки файла в Telegram:', error.message);
        }
    }

    async notifyNewRegistration(user) {
        const message = `
🆕 <b>Новая регистрация!</b>

👤 Имя: ${user.name || 'Не указано'}
📧 Email: ${user.email}
📅 Дата: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
        `;
        
        return this.sendMessage(message);
    }

    async notifyNewPurchase(purchase) {
        const message = `
💰 <b>Новая покупка!</b>

👤 Пользователь: ${purchase.userName || 'Не указано'}
📧 Email: ${purchase.userEmail}
📚 Книга: ${purchase.bookTitle}
💵 Сумма: ${purchase.amount} ₽
📅 Дата: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
🆔 ID платежа: ${purchase.paymentId}
        `;
        
        return this.sendMessage(message);
    }

    async notifyBackupComplete(fileName) {
        const message = `
✅ <b>Бэкап базы данных создан</b>

📦 Файл: ${fileName}
📅 Дата: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
        `;
        
        return this.sendMessage(message);
    }
}

module.exports = new TelegramService();

