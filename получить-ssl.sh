#!/bin/bash

# Скрипт для получения SSL сертификата (упрощенная версия)

echo "### Шаг 1: Переключаемся на временную конфигурацию nginx без SSL ###"
cp nginx.conf nginx.conf.backup
cp nginx-temp.conf nginx.conf

echo "### Шаг 2: Перезапускаем nginx ###"
docker compose restart nginx

echo "### Шаг 3: Ждем 5 секунд для стабилизации ###"
sleep 5

echo "### Шаг 4: Получаем сертификат ###"
docker compose run --rm certbot certonly --webroot \
    --webroot-path /var/www/certbot \
    --email alim@alimkitaphane.ru \
    --agree-tos \
    --no-eff-email \
    -d alimkitaphane.ru \
    -d www.alimkitaphane.ru

if [ $? -eq 0 ]; then
    echo "### Шаг 5: Сертификат получен! Возвращаем полную конфигурацию ###"
    cp nginx.conf.backup nginx.conf
    
    echo "### Шаг 6: Перезапускаем nginx с SSL ###"
    docker compose restart nginx
    
    echo "### Шаг 7: Запускаем автообновление сертификата ###"
    docker compose up -d certbot
    
    echo ""
    echo "✅ SSL сертификат успешно установлен!"
    echo "🌐 Сайт доступен по HTTPS: https://alimkitaphane.ru"
else
    echo "❌ Ошибка получения сертификата!"
    echo "Возвращаем исходную конфигурацию..."
    cp nginx.conf.backup nginx.conf
    docker compose restart nginx
    exit 1
fi

