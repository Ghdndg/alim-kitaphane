# 🔐 Быстрая настройка SSL для alimkitaphane.ru

## ✅ Что уже сделано

1. ✅ Добавлен сервис `certbot` в `docker-compose.yml`
2. ✅ Обновлен `nginx.conf` с HTTPS конфигурацией
3. ✅ Созданы скрипты для получения сертификата

## 📋 Что нужно сделать на сервере

### Шаг 1: Загрузить файлы на сервер

Загрузите на сервер обновленные файлы:
- `docker-compose.yml`
- `nginx.conf`
- `init-letsencrypt.sh`

```bash
# На сервере
git pull
# или загрузите через scp/ftp
```

### Шаг 2: Отредактировать email

```bash
nano init-letsencrypt.sh
```

Замените:
```bash
email="your-email@example.com"
```
на ваш email:
```bash
email="admin@alimkitaphane.ru"
```

### Шаг 3: Запустить скрипт

```bash
# Сделать скрипт исполняемым
chmod +x init-letsencrypt.sh

# Запустить
./init-letsencrypt.sh
```

### Шаг 4: Запустить автообновление

После успешного получения сертификата:
```bash
docker compose up -d certbot
```

## 🎯 Готово!

Теперь сайт доступен по HTTPS:
- ✅ `https://alimkitaphane.ru`
- ✅ `https://www.alimkitaphane.ru`
- ✅ Автоматический редирект с HTTP на HTTPS
- ✅ Автоматическое обновление сертификата каждые 12 часов

## 🔍 Проверка

```bash
# Проверить сертификат
docker compose exec certbot certbot certificates

# Проверить HTTPS
curl -I https://alimkitaphane.ru

# Проверить редирект
curl -I http://alimkitaphane.ru
```

## ⚠️ Важные требования

Перед запуском убедитесь:
1. DNS записи `alimkitaphane.ru` и `www.alimkitaphane.ru` указывают на IP сервера
2. Порты 80 и 443 открыты в файрволе:
   ```bash
   sudo ufw allow 80
   sudo ufw allow 443
   ```
3. Nginx не запущен на хосте (только в Docker)

## 📊 Мониторинг

```bash
# Логи certbot
docker compose logs certbot

# Тест обновления (без реального обновления)
docker compose run --rm certbot renew --dry-run

# Посмотреть дату истечения сертификата
docker compose exec certbot certbot certificates
```

## 🔄 Ручное обновление

Если нужно обновить сертификат вручную:
```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

