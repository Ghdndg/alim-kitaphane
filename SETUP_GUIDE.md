# 🚀 Руководство по запуску полного проекта

## 📋 Предварительные требования

### Установите необходимое ПО:
1. **Node.js** (v16+): https://nodejs.org/
2. **Git**: https://git-scm.com/

## 🗄️ База данных SQLite

✅ **Готово из коробки!** SQLite не требует отдельной установки.
- База данных создается автоматически
- Файл: `./database/krym_chitalka.db`
- Простота развертывания и резервного копирования

## ⚙️ Настройка проекта

### 1. Установите зависимости:
```bash
npm install
```

### 2. Настройте переменные окружения:
```bash
# Скопируйте файл примера
cp env.example .env

# Отредактируйте .env файл
nano .env
```

### 3. Заполните .env файл:
```env
# База данных SQLite
DB_TYPE=sqlite
DB_PATH=./database/krym_chitalka.db

# JWT секрет (сгенерируйте случайную строку)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# ЮKassa (получите в личном кабинете ЮKassa)
YUKASSA_SHOP_ID=your_shop_id
YUKASSA_SECRET_KEY=your_secret_key

# Настройки сервера
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 4. Инициализируйте базу данных:
```bash
npm run init-db
```

## 🚀 Запуск проекта

### Режим разработки:
```bash
npm run dev
```

### Продакшн режим:
```bash
npm start
```

Сайт будет доступен по адресу: http://localhost:3000

## 🔧 ЮKassa настройка

### 1. Зарегистрируйтесь в ЮKassa:
- Перейдите на https://yookassa.ru/
- Создайте аккаунт и магазин
- Получите `SHOP_ID` и `SECRET_KEY`

### 2. Настройте webhook (для продакшена):
- URL: `https://your-domain.com/api/payments/webhook`
- События: `payment.succeeded`, `payment.canceled`

### 3. Тестовые данные для разработки:
```
Тестовая карта: 5555 5555 5555 4477
Срок действия: любая будущая дата
CVC: любые 3 цифры
```

## 📁 Структура проекта

```
читалка/
├── config/
│   └── database.js         # Настройки БД
├── middleware/
│   └── auth.js            # Middleware авторизации
├── routes/
│   ├── auth.js            # Авторизация
│   ├── books.js           # Книги
│   ├── payments.js        # Платежи
│   └── users.js           # Пользователи
├── scripts/
│   └── init-database.js   # Инициализация БД
├── js/
│   └── api.js             # API клиент
├── server.js              # Основной сервер
├── package.json           # Зависимости
└── env.example            # Пример настроек
```

## 🔒 Безопасность в продакшене

### 1. HTTPS:
```bash
# Используйте Let's Encrypt для SSL
sudo certbot --nginx -d your-domain.com
```

### 2. Переменные окружения:
```env
NODE_ENV=production
JWT_SECRET=very-long-random-string-min-64-chars
DB_PASSWORD=very-secure-password
```

### 3. Nginx конфигурация:
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🧪 Тестирование

### API endpoints:
```bash
# Регистрация
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Тест","email":"test@example.com","password":"password123"}'

# Получение книг
curl http://localhost:3000/api/books

# Создание платежа (требует авторизации)
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":1}'
```

## 🔄 Обновление фронтенда

### Добавьте API клиент в HTML:
```html
<!-- В index.html и reader.html перед script.js -->
<script src="js/api.js"></script>
```

### Замените localStorage на API вызовы в script.js:
```javascript
// Вместо localStorage.setItem('registeredUsers', ...)
const response = await api.register(userData);

// Вместо localStorage.getItem('currentUser')
const user = await api.getCurrentUser();
```

## 📊 Мониторинг

### Логи:
```bash
# Просмотр логов
tail -f logs/app.log

# Логи PostgreSQL
tail -f /var/log/postgresql/postgresql-13-main.log
```

### Метрики производительности:
- Используйте PM2 для управления процессами
- Настройте мониторинг с Prometheus + Grafana
- Используйте New Relic или Sentry для отслеживания ошибок

## 🚨 Устранение проблем

### База данных не подключается:
```bash
# Проверьте статус PostgreSQL
sudo systemctl status postgresql

# Проверьте подключение
psql -h localhost -U postgres -d krym_chitalka
```

### ЮKassa ошибки:
- Проверьте правильность SHOP_ID и SECRET_KEY
- Убедитесь, что магазин активирован
- Проверьте лимиты и ограничения

### Ошибки авторизации:
- Проверьте JWT_SECRET в .env
- Убедитесь, что токены не истекли
- Проверьте CORS настройки

## 🎉 Готово!

Теперь у вас есть полноценный backend с:
- ✅ Безопасной авторизацией
- ✅ Реальными платежами через ЮKassa
- ✅ PostgreSQL базой данных
- ✅ REST API
- ✅ HTTPS поддержкой

Сайт готов к продакшену! 🚀
