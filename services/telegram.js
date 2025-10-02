const axios = require('axios');

class TelegramService {
    constructor() {
        // Переменные читаются динамически при каждом вызове
    }

    getToken() {
        return process.env.TELEGRAM_BOT_TOKEN;
    }

    getChatId() {
        return process.env.TELEGRAM_CHAT_ID;
    }

    getBaseUrl() {
        return `https://api.telegram.org/bot${this.getToken()}`;
    }

    async sendMessage(text) {
        try {
            const token = this.getToken();
            const chatId = this.getChatId();

            if (!token || !chatId) {
                console.log('Telegram not configured, skipping notification');
                return;
            }

            const response = await axios.post(`${this.getBaseUrl()}/sendMessage`, {
                chat_id: chatId,
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
            const token = this.getToken();
            const chatId = this.getChatId();

            if (!token || !chatId) {
                console.log('Telegram not configured, skipping backup');
                return;
            }

            const FormData = require('form-data');
            const fs = require('fs');
            const form = new FormData();
            
            form.append('chat_id', chatId);
            form.append('document', fs.createReadStream(filePath));
            if (caption) {
                form.append('caption', caption);
            }

            const response = await axios.post(`${this.getBaseUrl()}/sendDocument`, form, {
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

