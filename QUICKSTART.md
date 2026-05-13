# 🚀 Quick Start Guide

## За 5 минут до первого запроса

### 1. Установка (1 мин)
```bash
cd finance-tracker-backend
npm install
cp .env.example .env
```

### 2. Запуск БД (30 сек)
```bash
docker-compose up -d
```

### 3. Настройка Prisma (1 мин)
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 4. Запуск сервера (30 сек)
```bash
npm run dev
```

✅ Сервер запущен на `http://localhost:3001`

---

## Тестирование без OAuth (для разработки)

Пока не настроены Google/Yandex OAuth, можно тестировать API напрямую.

### Вариант 1: Создать тестового пользователя в БД

```bash
# Откройте Prisma Studio
npm run prisma:studio
```

1. Перейдите в таблицу `users`
2. Создайте пользователя:
```json
{
  "email": "test@example.com",
  "name": "Test User",
  "provider": "manual",
  "providerId": "manual_test123"
}
```
3. Скопируйте `id` пользователя

### Вариант 2: Создать JWT токен вручную

Создайте файл `generate-token.js`:

```javascript
const jwt = require('jsonwebtoken');

const payload = {
  userId: 'USER_ID_FROM_PRISMA',  // Замените на реальный ID
  email: 'test@example.com'
};

const token = jwt.sign(payload, 'your-super-secret-jwt-key-change-this', { 
  expiresIn: '7d' 
});

console.log('JWT Token:', token);
```

Запустите:
```bash
node generate-token.js
```

### Использование токена

```bash
# Создать транзакцию
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": -42.50,
    "date": "2024-05-12",
    "merchant": "Mercadona"
  }'

# Получить категории
curl http://localhost:3001/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Настройка OAuth (опционально)

### Google OAuth (5 мин)

1. **Google Cloud Console**: https://console.cloud.google.com
2. Создайте проект → APIs & Services → Credentials
3. Create Credentials → OAuth 2.0 Client ID
4. Authorized redirect URIs:
   ```
   http://localhost:3001/api/auth/google/callback
   ```
5. Скопируйте Client ID и Secret в `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-secret
   ```

### Yandex OAuth (5 мин)

1. **Yandex OAuth**: https://oauth.yandex.ru/client/new
2. Platform → Веб-сервисы
3. Redirect URI:
   ```
   http://localhost:3001/api/auth/yandex/callback
   ```
4. Права доступа:
   - ✅ Доступ к email адресу
   - ✅ Доступ к имени, фамилии и полу
   - ✅ Доступ к аватару
5. Скопируйте ID и Пароль в `.env`:
   ```env
   YANDEX_CLIENT_ID=your-id
   YANDEX_CLIENT_SECRET=your-secret
   ```

### Тестирование OAuth

```bash
# Откройте в браузере
http://localhost:3001/api/auth/google

# После авторизации вас перенаправит на:
http://localhost:5173/auth/callback?token=eyJhbGc...

# Используйте этот токен для API запросов
```

---

## Структура проекта

```
src/
├── routes/           # API endpoints
│   ├── auth.routes.ts
│   ├── transaction.routes.ts
│   ├── category.routes.ts
│   └── user.routes.ts
├── controllers/      # Бизнес-логика
├── middleware/       # Auth & errors
├── services/         # JWT & Passport
└── types/           # TypeScript types

prisma/
├── schema.prisma    # Модели БД
└── seed.ts          # Начальные данные
```

---

## Полезные команды

```bash
# Разработка
npm run dev              # Запуск с hot-reload

# База данных
npm run prisma:studio    # UI для БД (localhost:5555)
npm run prisma:migrate   # Применить миграции
npm run prisma:seed      # Заполнить категориями

# Production
npm run build            # Сборка TypeScript
npm start                # Запуск production версии

# Docker
docker-compose up -d     # Запустить БД
docker-compose down      # Остановить БД
docker-compose logs -f   # Посмотреть логи
```

---

## Частые проблемы

**Port 5432 already in use**
```bash
# Остановите другой PostgreSQL
sudo service postgresql stop
# или
docker ps  # найдите контейнер
docker stop <container_id>
```

**Prisma не видит таблицы**
```bash
npm run prisma:generate
npm run prisma:migrate
```

**OAuth редиректит на localhost:5173**
```bash
# Измените FRONTEND_URL в .env
FRONTEND_URL=http://localhost:3000  # или ваш порт
```

---

## Что дальше?

1. ✅ **Импортируйте Postman коллекцию** (`postman_collection.json`)
2. ✅ **Настройте OAuth** (Google/Yandex)
3. ✅ **Создайте первую транзакцию**
4. 🚀 **Начните разрабатывать Frontend**

Полная документация в [README.md](./README.md)
