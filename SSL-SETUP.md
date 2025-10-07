# 🔐 Настройка SSL сертификата для alimkitaphane.ru

## Подготовка

**ВАЖНО:** Перед началом убедитесь, что:
1. Домен `alimkitaphane.ru` и `www.alimkitaphane.ru` указывают на IP сервера (DNS A-запись)
2. Порты 80 и 443 открыты в файрволе
3. Docker и docker-compose установлены

## Шаг 1: Редактирование email в скрипте

Откройте файл `init-letsencrypt.sh` и замените:
```bash
email="your-email@example.com" # ЗАМЕНИТЕ НА СВОЙ EMAIL!
```

на ваш реальный email:
```bash
email="admin@alimkitaphane.ru"
```

## Шаг 2: Запуск скрипта получения сертификата

На сервере выполните:

```bash
# Сделайте скрипт исполняемым
chmod +x init-letsencrypt.sh

# Запустите скрипт
./init-letsencrypt.sh
```

Скрипт автоматически:
- Создаст временный сертификат
- Запустит nginx
- Получит настоящий сертификат от Let's Encrypt
- Перезагрузит nginx с новым сертификатом

## Шаг 3: Запуск автообновления

После успешного получения сертификата, запустите certbot контейнер:

```bash
docker compose up -d certbot
```

Certbot будет автоматически проверять и обновлять сертификат каждые 12 часов.

## Проверка

```bash
# Проверьте статус сертификата
docker compose exec certbot certbot certificates

# Проверьте HTTPS в браузере
curl -I https://alimkitaphane.ru

# Проверьте редирект с HTTP на HTTPS
curl -I http://alimkitaphane.ru
```

## Ручное обновление (если нужно)

```bash
# Обновить сертификат вручную
docker compose run --rm certbot renew

# Перезагрузить nginx после обновления
docker compose exec nginx nginx -s reload
```

## Тестовый режим

Если хотите протестировать без получения настоящего сертификата, в файле `init-letsencrypt.sh` установите:
```bash
staging=1
```

Это использует тестовый сервер Let's Encrypt (нет лимитов запросов).

## Лимиты Let's Encrypt

- **5 сертификатов** на один домен в неделю
- **50 сертификатов** с одного IP в неделю
- Сертификат действует **90 дней**

## Возможные проблемы

### Ошибка: "Connection refused"
- Проверьте, что порт 80 открыт: `sudo ufw allow 80`
- Проверьте, что nginx запущен: `docker compose ps`

### Ошибка: "Domain not found"
- Проверьте DNS: `nslookup alimkitaphane.ru`
- Подождите распространения DNS (до 24 часов)

### Сертификат не обновляется
- Проверьте логи: `docker compose logs certbot`
- Проверьте конфигурацию: `docker compose exec certbot certbot renew --dry-run`

