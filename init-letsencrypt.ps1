# PowerShell скрипт для первоначального получения SSL сертификата Let's Encrypt
# Для Windows

$domains = @("alimkitaphane.ru", "www.alimkitaphane.ru")
$rsa_key_size = 4096
$data_path = "./certbot"
$email = "your-email@example.com"  # ЗАМЕНИТЕ НА СВОЙ EMAIL!
$staging = 0  # Установите в 1 для тестирования

Write-Host "### Настройка SSL сертификата для $($domains -join ', ') ###" -ForegroundColor Green

# Проверка существующих данных
if (Test-Path $data_path) {
    $decision = Read-Host "Найдены существующие данные. Продолжить и заменить сертификат? (y/N)"
    if ($decision -ne "Y" -and $decision -ne "y") {
        exit
    }
}

# Создание директорий
New-Item -ItemType Directory -Force -Path "$data_path/conf" | Out-Null
New-Item -ItemType Directory -Force -Path "$data_path/www" | Out-Null

# Скачивание рекомендуемых TLS параметров
if (!(Test-Path "$data_path/conf/options-ssl-nginx.conf") -or !(Test-Path "$data_path/conf/ssl-dhparams.pem")) {
    Write-Host "### Downloading recommended TLS parameters ..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf" -OutFile "$data_path/conf/options-ssl-nginx.conf"
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem" -OutFile "$data_path/conf/ssl-dhparams.pem"
}

# Создание временного сертификата
Write-Host "### Creating dummy certificate for $($domains[0]) ..." -ForegroundColor Yellow
$path = "/etc/letsencrypt/live/$($domains[0])"
New-Item -ItemType Directory -Force -Path "$data_path/conf/live/$($domains[0])" | Out-Null

docker compose run --rm --entrypoint "openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 -keyout '$path/privkey.pem' -out '$path/fullchain.pem' -subj '/CN=localhost'" certbot

# Запуск nginx
Write-Host "### Starting nginx ..." -ForegroundColor Yellow
docker compose up --force-recreate -d nginx

# Удаление временного сертификата
Write-Host "### Deleting dummy certificate ..." -ForegroundColor Yellow
docker compose run --rm --entrypoint "rm -Rf /etc/letsencrypt/live/$($domains[0]) && rm -Rf /etc/letsencrypt/archive/$($domains[0]) && rm -Rf /etc/letsencrypt/renewal/$($domains[0]).conf" certbot

# Получение настоящего сертификата
Write-Host "### Requesting Let's Encrypt certificate ..." -ForegroundColor Yellow

$domain_args = ""
foreach ($domain in $domains) {
    $domain_args += " -d $domain"
}

$email_arg = if ($email -eq "") { "--register-unsafely-without-email" } else { "--email $email" }
$staging_arg = if ($staging -ne 0) { "--staging" } else { "" }

docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot $staging_arg $email_arg $domain_args --rsa-key-size $rsa_key_size --agree-tos --force-renewal" certbot

# Перезагрузка nginx
Write-Host "### Reloading nginx ..." -ForegroundColor Yellow
docker compose exec nginx nginx -s reload

Write-Host ""
Write-Host "### SSL сертификат успешно установлен! ###" -ForegroundColor Green
Write-Host "Теперь запустите автообновление: docker compose up -d certbot" -ForegroundColor Cyan

