# Finance Tracker Backend 💰

Backend API для мобильного приложения управления личными финансами с OAuth авторизацией и AI-распознаванием транзакций.

## 🚀 Технологии

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **OAuth 2.0** (Google + Yandex)
- **JWT** для авторизации
- **Docker** для локальной БД

## 📋 Функционал

### Авторизация
- ✅ OAuth через Google
- ✅ OAuth через Yandex
- ✅ JWT токены
- ✅ Protected routes

### API Endpoints
- ✅ Транзакции (CRUD)
- ✅ Категории с автоподбором
- ✅ Статистика по расходам/доходам
- ✅ Профиль пользователя

## 🛠️ Установка и запуск

### 1. Установите зависимости

```bash
cd finance-tracker-backend
npm install
```

### 2. Настройте окружение

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

Заполните обязательные переменные:

```env
# Database (оставьте как есть для локальной разработки)
DATABASE_URL="postgresql://postgres:password@localhost:5432/finance_tracker?schema=public"

# JWT (замените на свой секретный ключ)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Google OAuth (получите на https://console.cloud.google.com)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Yandex OAuth (получите на https://oauth.yandex.ru)
YANDEX_CLIENT_ID=your-yandex-client-id
YANDEX_CLIENT_SECRET=your-yandex-client-secret
```

### 3. Запустите PostgreSQL

```bash
docker-compose up -d
```

Проверьте что БД запустилась:
```bash
docker ps
```

### 4. Настройте базу данных

```bash
# Сгенерировать Prisma Client
npm run prisma:generate

# Применить миграции
npm run prisma:migrate

# Заполнить категории
npm run prisma:seed
```

### 5. Запустите сервер

```bash
npm run dev
```

Сервер запустится на `http://localhost:3001`

## 🔐 Настройка OAuth

### Google OAuth

1. Перейдите на [Google Cloud Console](https://console.cloud.google.com)
2. Создайте новый проект
3. Включите **Google+ API**
4. Создайте OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3001/api/auth/google/callback`
5. Скопируйте Client ID и Client Secret в `.env`

### Yandex OAuth

1. Перейдите на [Yandex OAuth](https://oauth.yandex.ru)
2. Зарегистрируйте новое приложение
3. Укажите Callback URL: `http://localhost:3001/api/auth/yandex/callback`
4. Выберите права доступа:
   - **login:email**
   - **login:info**
   - **login:avatar**
5. Скопируйте ID и Пароль приложения в `.env`

## 📡 API Endpoints

### Авторизация

```bash
GET  /api/auth/google          # Начать OAuth через Google
GET  /api/auth/google/callback # Callback от Google
GET  /api/auth/yandex          # Начать OAuth через Yandex
GET  /api/auth/yandex/callback # Callback от Yandex
GET  /api/auth/verify          # Проверить токен
```

### Транзакции (требуется авторизация)

```bash
GET    /api/transactions              # Получить список транзакций
GET    /api/transactions/:id          # Получить одну транзакцию
POST   /api/transactions              # Создать транзакцию
PATCH  /api/transactions/:id          # Обновить транзакцию
DELETE /api/transactions/:id          # Удалить транзакцию
GET    /api/transactions/statistics   # Статистика
```

### Категории (требуется авторизация)

```bash
GET  /api/categories           # Получить все категории
GET  /api/categories/:id       # Получить одну категорию
POST /api/categories/suggest   # Предложить категорию по названию магазина
```

### Пользователи (требуется авторизация)

```bash
GET   /api/users/profile        # Получить профиль
PATCH /api/users/preferences    # Обновить настройки
```

## 🧪 Тестирование API

### Примеры с curl

**1. Авторизация через Google:**
```bash
# Откройте в браузере:
http://localhost:3001/api/auth/google
# После авторизации вы получите токен в URL
```

**2. Создать транзакцию:**
```bash
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": -42.50,
    "date": "2024-05-12",
    "merchant": "Mercadona",
    "categoryId": "CATEGORY_ID",
    "confidence": 95
  }'
```

**3. Получить транзакции:**
```bash
curl -X GET http://localhost:3001/api/transactions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**4. Предложить категорию:**
```bash
curl -X POST http://localhost:3001/api/categories/suggest \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"merchant": "Mercadona"}'
```

## 🗄️ База данных

### Prisma Studio (UI для БД)

```bash
npm run prisma:studio
```

Откроется на `http://localhost:5555`

### Миграции

```bash
# Создать новую миграцию
npm run prisma:migrate

# Применить миграции в продакшене
npx prisma migrate deploy
```

## 📊 Структура проекта

```
finance-tracker-backend/
├── prisma/
│   ├── schema.prisma          # Модели БД
│   └── seed.ts                # Начальные данные
├── src/
│   ├── controllers/           # Бизнес-логика
│   ├── middleware/            # Auth, error handling
│   ├── routes/                # API endpoints
│   ├── services/              # JWT, Passport
│   ├── types/                 # TypeScript типы
│   └── index.ts               # Точка входа
├── docker-compose.yml         # PostgreSQL
├── .env.example               # Пример переменных
└── package.json
```

## 🔥 Готовые фичи

### Категории (предзаполнены)

**Расходы:**
- 🛒 Продукты (Mercadona, Carrefour, Lidl...)
- 🚌 Транспорт (Metro, Taxi, Uber...)
- ☕ Кафе и рестораны
- 🎬 Развлечения (Netflix, Spotify...)
- 💊 Здоровье (Аптека, врач...)
- 👕 Покупки (Zara, Amazon...)
- ⚡ Коммунальные услуги
- 📌 Прочие расходы

**Доходы:**
- 💰 Зарплата
- 💼 Фриланс
- ➕ Прочие доходы

### Автоматическая категоризация

Система автоматически предлагает категорию на основе ключевых слов:
- "Mercadona" → Продукты (95% confidence)
- "Metro Madrid" → Транспорт (98% confidence)
- "Starbucks" → Кафе и рестораны

## 🚀 Деплой

### Railway.app (рекомендуется)

1. Создайте аккаунт на [Railway](https://railway.app)
2. Установите Railway CLI:
```bash
npm install -g @railway/cli
```

3. Залогиньтесь и задеплойте:
```bash
railway login
railway init
railway up
```

4. Добавьте PostgreSQL:
```bash
railway add --plugin postgresql
```

5. Установите переменные окружения в Railway Dashboard

### Render.com

1. Создайте аккаунт на [Render](https://render.com)
2. Создайте PostgreSQL database
3. Создайте Web Service из GitHub репозитория
4. Установите Build Command: `npm install && npm run build`
5. Установите Start Command: `npm start`
6. Добавьте переменные окружения

## 🎓 Следующие шаги

### Интеграция с Frontend

1. **Создайте React приложение** с Tesseract.js
2. **Подключите API** через axios/fetch
3. **Реализуйте OAuth flow**:
   ```tsx
   // Кнопка входа
   <button onClick={() => window.location.href = 'http://localhost:3001/api/auth/google'}>
     Войти через Google
   </button>

   // Обработка callback
   useEffect(() => {
     const urlParams = new URLSearchParams(window.location.search);
     const token = urlParams.get('token');
     if (token) {
       localStorage.setItem('authToken', token);
       navigate('/dashboard');
     }
   }, []);
   ```

### Добавление функционала

- [ ] Загрузка изображений (Multer + S3/Cloudflare R2)
- [ ] Email уведомления (Nodemailer)
- [ ] Экспорт данных (CSV, Excel)
- [ ] Бюджеты и лимиты
- [ ] Рекуррентные транзакции
- [ ] WebSockets для реал-тайм обновлений

## 🐛 Troubleshooting

**БД не запускается:**
```bash
docker-compose down -v
docker-compose up -d
```

**Prisma ошибки:**
```bash
npm run prisma:generate
npm run prisma:migrate
```

**OAuth не работает:**
- Проверьте Callback URLs в консолях Google/Yandex
- Убедитесь что `FRONTEND_URL` правильный

## 📝 Лицензия

MIT

---

**Готово к разработке!** 🎉

Теперь у вас есть полноценный backend с авторизацией и API для работы с транзакциями.
# finapp
