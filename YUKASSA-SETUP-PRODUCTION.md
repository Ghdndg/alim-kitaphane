# 🔐 Настройка ЮKassa для PRODUCTION

## ✅ Ваши данные от ЮKassa

- **Shop ID:** `1140593`
- **Secret Key:** `live_B289hcXcdYNXYHGuWuIukWeQCp2CCqAfhF_WMpyvHQQ`
- **Режим:** PRODUCTION (live)

---

## 📋 Шаг 1: Настройка на сервере

### 1.1. Подключитесь к серверу:
```bash
ssh root@5741777-jh90179
cd /opt/alim-kitabhane
```

### 1.2. Создайте или обновите файл `.env`:
```bash
nano .env
```

### 1.3. Добавьте/обновите следующие строки:
```env
# ЮKassa настройки (PRODUCTION)
YUKASSA_SHOP_ID=1140593
YUKASSA_SECRET_KEY=live_B289hcXcdYNXYHGuWuIukWeQCp2CCqAfhF_WMpyvHQQ

# JWT секретный ключ (создайте свой уникальный!)
JWT_SECRET=alim-kitaphane-super-secret-jwt-key-2024-production

# Настройки сервера
PORT=3000
NODE_ENV=production

# URL фронтенда для CORS
FRONTEND_URL=https://alimkitaphane.ru

# База данных SQLite
DB_TYPE=sqlite
DB_PATH=./database/krym_chitalka.db

# Настройки файлов
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

Сохраните: `Ctrl+X`, затем `Y`, затем `Enter`

### 1.4. Перезапустите приложение:
```bash
docker compose restart app
```

---

## 📋 Шаг 2: Настройка Webhook в личном кабинете ЮKassa

### 2.1. Войдите в личный кабинет ЮKassa:
https://yookassa.ru/my

### 2.2. Перейдите в раздел:
**Настройки магазина** → **HTTP-уведомления**

### 2.3. Настройте Webhook:

**URL для уведомлений:**
```
https://alimkitaphane.ru/api/payments/webhook
```

**События для отправки уведомлений:**
- ✅ `payment.succeeded` (Платеж успешно завершен)
- ✅ `payment.canceled` (Платеж отменен)

**Формат данных:** `JSON`

### 2.4. Нажмите "Сохранить"

---

## 📋 Шаг 3: Тестирование

### 3.1. Проверьте, что сервер работает:
```bash
docker compose ps
docker compose logs app --tail 50
```

### 3.2. Проверьте доступность API:
```bash
curl -I https://alimkitaphane.ru/api/payments/webhook
```

Должно вернуть: `405 Method Not Allowed` (это нормально для GET запроса)

### 3.3. Откройте сайт в браузере:
```
https://alimkitaphane.ru
```

### 3.4. Протестируйте покупку:
1. Зарегистрируйтесь на сайте
2. Нажмите "Купить и читать"
3. Согласитесь с условиями
4. Нажмите "Оплатить через ЮKassa"

Вы будете перенаправлены на страницу оплаты ЮKassa.

### 3.5. Тестовые карты для проверки (работают в live режиме):

**✅ Успешная оплата:**
- Номер карты: `5555 5555 5555 4477`
- Срок: любая будущая дата (например, `12/25`)
- CVC: любые 3 цифры (например, `123`)

**❌ Отклоненный платеж:**
- Номер карты: `5555 5555 5555 5599`
- Срок: любая будущая дата
- CVC: любые 3 цифры

---

## 📋 Шаг 4: Проверка работы

### 4.1. Проверьте логи после тестовой покупки:
```bash
docker compose logs app | grep -i payment
docker compose logs app | grep -i yukassa
```

### 4.2. Проверьте статус в личном кабинете ЮKassa:
https://yookassa.ru/my/payments

### 4.3. Проверьте, что книга появилась в личном кабинете:
- Войдите на сайт
- Откройте "Личный кабинет"
- Книга должна быть в разделе "Моя библиотека"

---

## ⚠️ ВАЖНАЯ ИНФОРМАЦИЯ

### Безопасность:
1. ❗ **НЕ коммитьте** файл `.env` в git
2. ❗ **НЕ делитесь** Secret Key с кем-либо
3. ✅ Файл `.env` уже добавлен в `.gitignore`

### Комиссия ЮKassa:
- Комиссия для самозанятых: **3.6% + 0₽** за операцию
- Деньги поступают на счет в течение 3 рабочих дней

### Лимиты:
- Минимальная сумма платежа: **10₽**
- Максимальная сумма платежа: **100,000₽**

---

## 🔧 Решение проблем

### Ошибка "Invalid credentials":
```bash
# Проверьте, что переменные окружения загружены:
docker compose exec app printenv | grep YUKASSA
```

### Webhook не работает:
1. Проверьте логи:
```bash
docker compose logs app | grep webhook
```

2. Убедитесь, что порт 443 открыт:
```bash
sudo ufw status | grep 443
```

3. Проверьте nginx:
```bash
docker compose logs nginx
```

### Платеж создается, но не завершается:
1. Проверьте webhook URL в личном кабинете ЮKassa
2. Убедитесь, что `payment.succeeded` включен в события
3. Проверьте логи webhook:
```bash
docker compose logs app | grep "payment.succeeded"
```

---

## 📞 Поддержка ЮKassa

- **Телефон:** 8 (800) 250-66-99
- **Email:** support@yookassa.ru
- **Документация:** https://yookassa.ru/developers

---

## ✅ Готово!

После настройки:
- ✅ Платежи работают в PRODUCTION режиме
- ✅ Деньги поступают на ваш счет
- ✅ Webhook уведомляет о завершении платежей
- ✅ Пользователи получают доступ к книгам после оплаты

**Начинайте принимать платежи! 🎉**
