# Используем Debian-based образ для лучшей совместимости с sqlite3
FROM node:18-bullseye-slim

# системные зависимости для нативных модулей sqlite3
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ sqlite3 libsqlite3-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ставим зависимости внутри контейнера (без локального node_modules)
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund --build-from-source=sqlite3 \
 && npm cache clean --force

# остальной код
COPY . .

# uploads и пользователь
RUN mkdir -p uploads database \
 && useradd -m -u 1001 nodejs \
 && chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000
CMD ["npm", "start"]
