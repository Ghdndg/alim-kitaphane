# 🚀 Инструкция по деплою

## 📦 Текущее состояние проекта

### ✅ Готово к демонстрации:
Фронтенд полностью функционален и готов для демо-версии.

### 🔧 Структура файлов:
```
читалка/
├── index.html          # Главная страница
├── reader.html         # Читалка
├── styles.css          # Стили главной
├── reader.css          # Стили читалки  
├── script.js           # JS главной
├── reader.js           # JS читалки
├── Mockup.jpg          # Фоновое изображение
└── README.md           # Документация
```

## 🌐 Быстрый деплой (демо-версия)

### 1. Статический хостинг:
```bash
# GitHub Pages
1. Загрузить в GitHub репозиторий
2. Settings > Pages > Deploy from branch
3. Выбрать main branch

# Netlify
1. Перетащить папку на netlify.com
2. Автоматический деплой

# Vercel
1. Импортировать из GitHub
2. Автоматический деплой
```

### 2. Локальный сервер:
```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

## 🏗️ Продакшен деплой

### Backend варианты:

#### 1. Node.js + Express:
```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.static('.'));
app.use(express.json());

// API роуты
app.post('/api/register', (req, res) => {
    // Регистрация пользователя
});

app.post('/api/login', (req, res) => {
    // Авторизация
});

app.post('/api/purchase', (req, res) => {
    // Обработка платежа через ЮKassa
});

app.listen(3000);
```

#### 2. Python + Flask:
```python
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/api/register', methods=['POST'])
def register():
    # Регистрация пользователя
    pass

@app.route('/api/purchase', methods=['POST'])  
def purchase():
    # Интеграция с ЮKassa
    pass

if __name__ == '__main__':
    app.run()
```

### Интеграция ЮKassa:

```javascript
// Замена функции processYuKassaPayment
async function processYuKassaPayment() {
    try {
        const response = await fetch('/api/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
                amount: bookData.price,
                currency: 'RUB',
                description: `Покупка книги: ${bookData.title}`
            })
        });

        const { payment_url } = await response.json();
        window.location.href = payment_url;
    } catch (error) {
        showNotification('Ошибка при создании платежа', 'error');
    }
}
```

## 📋 Рекомендации

### Для быстрого запуска (1-2 дня):
1. **Netlify/Vercel** - деплой текущей версии
2. **Supabase** - бэкенд как сервис
3. **ЮKassa тестовый** - режим песочницы

### Для полноценного продакта (1-2 недели):
1. **VPS сервер** (DigitalOcean/Hetzner)
2. **PostgreSQL** база данных
3. **Node.js/Python** бэкенд
4. **Docker** контейнеризация
5. **Nginx** веб-сервер
6. **SSL сертификат** (Let's Encrypt)

## 🎯 Итог

**Сайт готов к демонстрации**, но для полноценного продакшена нужен бэкенд и настоящая интеграция с платежами.

**Рекомендуемый план:**
1. **Сейчас**: Деплой на Netlify для демо
2. **Через неделю**: Добавить бэкенд
3. **Через месяц**: Полный продакшен
