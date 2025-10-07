# 🌐 Как добавить www поддомен к SSL сертификату

## ⏰ Когда можно добавить www

Из-за лимита Let's Encrypt (5 неудачных попыток в час), добавить `www.alimkitaphane.ru` можно будет **через 1 час после последней попытки**.

Следующая попытка доступна после: **16:02 по Москве (13:02 UTC)**

---

## 📋 Шаги для добавления www

### 1. Обновите DNS (если еще не сделали)

В панели Timeweb Cloud → Домены и DNS:
- Добавьте A-запись: `www.alimkitaphane.ru` → `5.129.247.160`

### 2. Подождите обновления DNS (5-10 минут)

```bash
# Проверьте DNS
nslookup www.alimkitaphane.ru 8.8.8.8
```

Должен вернуть: `5.129.247.160`

### 3. Расширьте сертификат (добавьте www)

```bash
# На сервере выполните
docker compose run --rm --entrypoint certbot certbot certonly --webroot \
    --webroot-path /var/www/certbot \
    --email alimkitaphane@gmail.com \
    --agree-tos \
    --no-eff-email \
    --expand \
    -d alimkitaphane.ru \
    -d www.alimkitaphane.ru
```

Флаг `--expand` расширит существующий сертификат, добавив www.

### 4. Обновите nginx.conf

Измените `server_name` в обоих блоках (HTTP и HTTPS):

```nginx
server_name alimkitaphane.ru www.alimkitaphane.ru;
```

### 5. Перезапустите nginx

```bash
docker compose restart nginx
```

### 6. Проверьте

```bash
# Проверьте основной домен
curl -I https://alimkitaphane.ru

# Проверьте www
curl -I https://www.alimkitaphane.ru

# Проверьте редирект
curl -I http://www.alimkitaphane.ru
```

---

## 🔄 Обновите репозиторий

После добавления www, обновите nginx.conf в git:

```bash
git add nginx.conf
git commit -m "Add www subdomain to SSL certificate"
git push
```

---

## ✅ Готово!

После этого оба адреса будут работать:
- ✅ `https://alimkitaphane.ru`
- ✅ `https://www.alimkitaphane.ru`
- ✅ Автоматический редирект с HTTP на HTTPS
- ✅ Автоматическое обновление сертификата

