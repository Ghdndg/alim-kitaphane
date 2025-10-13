# 💳 Настройка ЮKassa для реальных платежей

## 🚀 Быстрый старт

### 1. Регистрация в ЮKassa
1. Перейдите на https://yookassa.ru/
2. Зарегистрируйтесь как продавец
3. Пройдите верификацию
4. Создайте магазин

### 2. Получение ключей API
1. В личном кабинете ЮKassa перейдите в **"Настройки"** → **"API ключи"**
2. Скопируйте:
   - **Shop ID** (ID магазина)
   - **Секретный ключ**

### 3. Настройка проекта

#### Обновите .env файл:
```env
# ЮKassa настройки (РЕАЛЬНЫЕ ДАННЫЕ)
YUKASSA_SHOP_ID=your_real_shop_id
YUKASSA_SECRET_KEY=your_real_secret_key
YUKASSA_WEBHOOK_SECRET=your_webhook_secret

# Остальные настройки...
DB_HOST=localhost
DB_PORT=5432
DB_NAME=krym_chitalka
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your-jwt-secret
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

### 4. Настройка Webhook

#### В личном кабинете ЮKassa:
1. Перейдите в **"Настройки"** → **"Уведомления"**
2. Добавьте Webhook URL: `https://your-domain.com/api/payments/webhook`
3. Выберите события:
   - ✅ `payment.succeeded` (успешная оплата)
   - ✅ `payment.canceled` (отмена платежа)
4. Скопируйте **секретный ключ** webhook и добавьте в .env

## 🔧 Тестирование

### Тестовые данные ЮKassa:
```
Тестовая карта: 5555 5555 5555 4477
Срок действия: 12/30 (любая будущая дата)
CVC: 123 (любые 3 цифры)
Имя держателя: CARD HOLDER
```

### Другие тестовые карты:
- **Успешная оплата**: `4111 1111 1111 1111`
- **Отклонение**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0000 0000 3220`

## 🛡️ Безопасность

### Обязательные настройки:
1. **HTTPS** - обязательно для продакшена
2. **Webhook подпись** - проверка подлинности уведомлений
3. **Rate limiting** - ограничение запросов
4. **Логирование** - запись всех транзакций

### Код проверки webhook подписи:
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
    
    return signature === expectedSignature;
}
```

## 📊 Мониторинг платежей

### Логи транзакций:
```javascript
// В routes/payments.js
console.log('✅ Payment created:', {
    paymentId: payment.id,
    amount: payment.amount.value,
    userId: req.user.id,
    timestamp: new Date().toISOString()
});
```

### Проверка статуса:
```bash
# Проверка платежа через API
curl -X GET "https://api.yookassa.ru/v3/payments/{payment_id}" \
  -H "Authorization: Basic $(echo -n 'shop_id:secret_key' | base64)"
```

## 🚨 Возможные ошибки

### 1. "Invalid authentication credentials"
**Причина**: Неверные SHOP_ID или SECRET_KEY
**Решение**: Проверьте ключи в личном кабинете ЮKassa

### 2. "Webhook signature verification failed"
**Причина**: Неверный WEBHOOK_SECRET
**Решение**: Обновите секретный ключ webhook в .env

### 3. "Payment not found"
**Причина**: Платеж не существует или удален
**Решение**: Проверьте ID платежа и статус в ЮKassa

### 4. "Amount too small"
**Причина**: Минимальная сумма платежа 1 рубль
**Решение**: Установите минимальную сумму >= 1.00

## 🔄 Жизненный цикл платежа

```
1. Пользователь нажимает "Купить"
2. Frontend → Backend: POST /api/payments/create
3. Backend → ЮKassa: создание платежа
4. ЮKassa → Frontend: redirect на форму оплаты
5. Пользователь вводит данные карты
6. ЮKassa → Backend: webhook уведомление
7. Backend: обновление статуса в БД
8. Frontend: redirect на страницу результата
9. Frontend: проверка статуса и обновление UI
```

## 📈 Комиссии ЮKassa

- **Банковские карты**: 2.8% + 0₽
- **SBP (СБП)**: 0.7% + 0₽
- **Электронные кошельки**: 2.8% + 0₽
- **Интернет-банкинг**: 2.8% + 0₽

## 💡 Советы по оптимизации

1. **Кеширование**: Кешируйте статусы платежей
2. **Retry логика**: Повторяйте неудачные запросы
3. **Таймауты**: Устанавливайте разумные таймауты
4. **Мониторинг**: Отслеживайте успешность платежей

## 🎯 Продакшн чеклист

- [ ] ✅ Реальные ключи ЮKassa в .env
- [ ] ✅ HTTPS настроен
- [ ] ✅ Webhook URL настроен
- [ ] ✅ Секретный ключ webhook настроен
- [ ] ✅ База данных защищена
- [ ] ✅ Rate limiting включен
- [ ] ✅ Логирование настроено
- [ ] ✅ Мониторинг ошибок
- [ ] ✅ Backup базы данных
- [ ] ✅ Тестирование на staging

## 📞 Поддержка

- **Документация ЮKassa**: https://yookassa.ru/developers/
- **Техподдержка**: support@yoomoney.ru
- **Telegram**: @yookassa_support
