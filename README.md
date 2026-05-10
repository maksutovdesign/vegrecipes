# 🌱 VegRecipes

**Многоплатформенная платформа вегетарианских рецептов** — полноценный production-ready продукт с AI-ассистентом, геймификацией, PRO-подпиской и Telegram-ботом.

[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)](https://react.dev/)
[![Mobile](https://img.shields.io/badge/Mobile-Expo%2051-000020?logo=expo)](https://expo.dev/)
[![Bot](https://img.shields.io/badge/Bot-aiogram%203.7-2CA5E0?logo=telegram)](https://aiogram.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## О проекте

VegRecipes — это экосистема для тех, кто готовит без мяса. Проект охватывает все точки взаимодействия пользователя: веб, мобильное приложение и Telegram-бот.

**Ключевые возможности:**
- 🔍 Полнотекстовый поиск с русской морфологией (Elasticsearch)
- 🤖 AI-ассистент на базе Claude API — адаптирует рецепты под ваши предпочтения и отвечает на вопросы
- 📊 Визуализация нутриентов и витаминов (donut-чарты, radar-чарты)
- 🗓 PRO: генерация недельного меню с учётом КБЖУ
- 🏆 Геймификация: достижения, дуэли рецептов, дневник здоровья
- 🌍 Интерактивная карта кухонь мира
- 🎰 Рулетка рецептов с фильтрами
- 📸 Сканер холодильника через камеру
- 💳 PRO-подписка через Stripe
- 🌐 Dynamic OG-теги для share-превью
- 🔐 Email-верификация и сброс пароля

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         VegRecipes Ecosystem                    │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Web (React) │ Mobile (Expo)│ Telegram Bot │   Backend (FastAPI)│
│  15 страниц  │  12 экранов  │  16 команд   │   52 endpoint      │
└──────┬───────┴──────┬───────┴──────┬───────┴──────────┬─────────┘
       │              │              │                   │
       └──────────────┴──────────────┴───────────────────┤
                                                         │ REST API
                              ┌──────────────────────────┴──────────────────────┐
                              │                  FastAPI Backend                  │
                              │  PostgreSQL │ Redis │ Elasticsearch │ MinIO       │
                              │  Celery Beat │ Stripe │ Claude API   │ Sentry      │
                              └─────────────────────────────────────────────────┘
```

---

## Стек технологий

### Backend
| Технология | Назначение |
|---|---|
| **FastAPI** | Async REST API, 52 endpoint в 9 модулях |
| **SQLAlchemy 2.0** | Async ORM с полной типизацией |
| **Alembic** | Миграции БД (3 миграции) |
| **Elasticsearch 8.13** | Полнотекстовый поиск с русским морфоанализатором |
| **Redis** | Кэш, Celery broker, rate limiting store |
| **Celery Beat** | Периодические задачи (дуэли, реиндексация, дайджесты) |
| **MinIO** | S3-совместимое хранилище медиафайлов |
| **PostgreSQL** | Основная БД |
| **slowapi** | Rate limiting (5/min регистрация, 10/min логин, 3/min сброс пароля) |
| **sentry-sdk** | Мониторинг ошибок (FastAPI + Starlette интеграции) |
| **aiosmtplib** | Async email (верификация, сброс пароля) |
| **Stripe** | Checkout Sessions, webhook подписи, PRO-подписки |
| **yt-dlp + Whisper** | Импорт рецептов из TikTok/YouTube |

### Frontend (Web)
| Технология | Назначение |
|---|---|
| **React 18 + TypeScript** | UI |
| **Vite** | Сборщик |
| **TanStack Query** | Серверный стейт, кэширование |
| **Zustand** | Клиентский стейт (auth, favorites) |
| **Framer Motion** | Анимации |
| **react-helmet-async** | Dynamic OG / Twitter meta-tags |
| **Recharts** | Нутриционные чарты |
| **D3 / react-simple-maps** | Карта мира |
| **Lucide React** | Иконки |
| **@sentry/react** | Мониторинг фронтенда |

### Mobile
| Технология | Назначение |
|---|---|
| **Expo 51 (React Native)** | Кроссплатформенное мобильное приложение |
| **Expo Router** | File-based навигация |
| **expo-camera / expo-image-picker** | Сканер холодильника |
| **Zustand** | Стейт-менеджмент |
| **@sentry/react-native** | Мониторинг |

### Telegram Bot
| Технология | Назначение |
|---|---|
| **aiogram 3.7** | Async Telegram bot framework |
| **webhook / polling** | Dual-mode запуск |
| **sentry-sdk** | Мониторинг ошибок бота |

---

## Структура проекта

```
vegrecipes/
├── backend/                    # FastAPI приложение
│   ├── main.py                 # App, CORS, Sentry, rate limiter
│   ├── config.py               # Pydantic settings
│   ├── database.py             # SQLAlchemy async engine
│   ├── models/
│   │   ├── recipe.py           # Recipe, Category, Ingredient, Nutrition, Steps
│   │   ├── user.py             # User, RefreshToken (+ email verify / password reset)
│   │   ├── spice.py            # Spice, SpiceNutrition, SpiceCombo
│   │   └── gamification.py     # Achievement, Duel, HealthLog, MealPlan
│   ├── api/
│   │   ├── limiter.py          # Shared SlowAPI limiter
│   │   ├── schemas.py          # Pydantic request/response models
│   │   └── routes/
│   │       ├── recipes.py      # CRUD + поиск + AI-адаптация + достижения
│   │       ├── users.py        # Auth, JWT, email verify, password reset
│   │       ├── categories.py
│   │       ├── spices.py
│   │       ├── meal_plan.py    # PRO: генерация недельного плана
│   │       ├── payments.py     # Stripe webhook + checkout
│   │       ├── duels.py        # Дуэли рецептов
│   │       ├── health_log.py   # Дневник здоровья + сканер холодильника
│   │       └── import_recipe.py
│   ├── services/
│   │   ├── auth.py             # JWT tokens, password hashing
│   │   ├── ai_assistant.py     # Claude API (адаптация, Q&A)
│   │   ├── achievements.py     # 8 достижений, event-based система
│   │   ├── email.py            # Async email (aiosmtplib, HTML-шаблоны)
│   │   ├── nutrition.py        # Расчёт КБЖУ из ингредиентов
│   │   ├── meal_planner.py     # Генерация меню с учётом КБЖУ
│   │   ├── recipe_importer.py  # yt-dlp + Whisper + Claude
│   │   ├── search.py           # Elasticsearch full-text
│   │   ├── health_analytics.py # Аналитика и дефициты нутриентов
│   │   └── recommender.py      # Похожие рецепты, тренды, сезон, холодильник
│   ├── workers/
│   │   ├── celery_app.py       # Celery + beat schedule
│   │   └── tasks.py            # Дуэли, реиндексация, импорт
│   ├── alembic/                # 3 миграции БД
│   ├── seeds/
│   │   ├── seed_data.py        # 1000 рецептов с нутриентами
│   │   └── run_seeds.py
│   └── tests/                  # pytest, coverage > 80%
│
├── frontend/                   # React 18 веб-приложение
│   └── src/
│       ├── pages/
│       │   ├── Home/           # Лендинг с hero, поиском, трендами
│       │   ├── RecipeList/     # Каталог: поиск + 12 фильтров + пагинация
│       │   ├── Recipe/         # Детальный рецепт: шаги, нутриенты, AI-чат
│       │   ├── Categories/     # Браузер категорий
│       │   ├── WorldMap/       # D3 интерактивная карта кухонь мира
│       │   ├── Roulette/       # Рулетка рецептов
│       │   ├── Duel/           # Дуэли рецептов
│       │   ├── Spices/         # База специй с поиском
│       │   ├── MealPlan/       # PRO: генерация недельного плана
│       │   ├── HealthLog/      # Дневник здоровья
│       │   ├── Profile/        # Профиль, достижения, избранное
│       │   ├── PRO/            # Страница подписки / Stripe Checkout
│       │   ├── Auth/           # Вход / регистрация
│       │   ├── VerifyEmail/    # Подтверждение email по токену
│       │   └── ResetPassword/  # Сброс пароля по токену
│       ├── components/
│       │   ├── NutritionDonut/ # Donut-чарт КБЖУ
│       │   ├── VitaminRadar/   # Radar-чарт витаминов
│       │   ├── SeasonWheel/    # Колесо сезонности
│       │   ├── AIChat/         # Чат с AI-ассистентом
│       │   └── RecipeCard/     # Карточка рецепта
│       └── api/                # Типизированный API клиент
│
├── mobile/                     # Expo 51 мобильное приложение
│   └── app/
│       ├── (tabs)/             # Главная, поиск, план питания, профиль
│       ├── recipe/[id].tsx     # Детальный рецепт
│       ├── fridge-scan.tsx     # Сканер холодильника (реальная камера)
│       ├── duel.tsx            # Дуэли рецептов
│       ├── auth.tsx            # Авторизация
│       └── _layout.tsx         # Root layout + Sentry init
│
├── bot/                        # Telegram Bot
│   ├── main.py                 # aiogram 3.7, webhook + polling
│   ├── handlers/               # 16 команд
│   ├── config.py               # Настройки + Sentry DSN
│   └── requirements.txt
│
├── docker-compose.yml          # 9 сервисов: API, Worker, Beat, PG, Redis, ES, MinIO, Bot, Flower
├── start.sh                    # Полный запуск + миграции + seeds + ES reindex
├── stop.sh
└── .env.example                # Шаблон переменных окружения
```

---

## API Endpoints

<details>
<summary><b>Рецепты (13 endpoints)</b></summary>

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/v1/recipes` | Список с пагинацией, 12 фильтров, сортировка |
| POST | `/api/v1/recipes` | Создать рецепт (auth) |
| GET | `/api/v1/recipes/{id}` | Детальный просмотр |
| PUT | `/api/v1/recipes/{id}` | Обновить (автор) |
| DELETE | `/api/v1/recipes/{id}` | Удалить (автор) |
| GET | `/api/v1/recipes/top` | Топ-100 по рейтингу |
| GET | `/api/v1/recipes/trending` | Трендовые за 7 дней |
| GET | `/api/v1/recipes/seasonal` | Сезонные по месяцу |
| GET | `/api/v1/recipes/random` | Случайный рецепт |
| GET | `/api/v1/recipes/autocomplete` | Elasticsearch автодополнение |
| POST | `/api/v1/recipes/{id}/adapt` | AI-адаптация под предпочтения |
| POST | `/api/v1/recipes/{id}/ask` | Вопрос к рецепту (AI-ассистент) |
| GET | `/api/v1/recipes/{id}/similar` | Похожие рецепты |
| POST | `/api/v1/recipes/{id}/favorite` | Добавить/убрать из избранного |
| POST | `/api/v1/recipes/{id}/rate` | Оценить рецепт |

</details>

<details>
<summary><b>Пользователи и Auth (11 endpoints)</b></summary>

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/v1/users/register` | Регистрация (5/min rate limit) |
| POST | `/api/v1/users/login` | Вход (10/min rate limit) |
| POST | `/api/v1/users/refresh` | Обновление JWT токена |
| GET | `/api/v1/users/me` | Профиль текущего пользователя |
| POST | `/api/v1/users/request-verification` | Запросить письмо верификации |
| GET | `/api/v1/users/verify-email` | Подтвердить email по токену |
| POST | `/api/v1/users/forgot-password` | Запросить сброс пароля (3/min) |
| POST | `/api/v1/users/reset-password` | Установить новый пароль |
| GET | `/api/v1/users/me/achievements` | Мои достижения |
| GET | `/api/v1/users/me/favorites` | Избранные рецепты |

</details>

<details>
<summary><b>PRO и Payments (4 endpoints)</b></summary>

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/v1/payments/create-checkout` | Stripe Checkout Session |
| POST | `/api/v1/payments/webhook` | Stripe webhook с проверкой подписи |
| POST | `/api/v1/meal-plan/generate` | Генерация недельного плана (PRO) |
| GET | `/api/v1/meal-plan/my` | Мои планы питания |

</details>

<details>
<summary><b>Остальные endpoints</b></summary>

| Модуль | Количество | Описание |
|---|---|---|
| Категории | 3 | CRUD категорий |
| Специи | 5 | База специй, поиск, комбо |
| Дуэли | 5 | Активная дуэль, голосование, история |
| Дневник здоровья | 6 | Логирование, аналитика, сканер холодильника |
| Импорт | 1 | Импорт из TikTok/YouTube через yt-dlp + Whisper |
| Карта мира | 1 | Кухни мира с геоданными |

</details>

---

## Быстрый старт

### Требования
- Docker & Docker Compose
- Ключи: `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY` + price ID

### 1. Клонировать и настроить окружение

```bash
git clone https://github.com/maksutovdesign/vegrecipes.git
cd vegrecipes
cp .env.example .env
# Заполните .env своими ключами
```

### 2. Запустить одной командой

```bash
chmod +x start.sh
./start.sh
```

`start.sh` автоматически:
1. Запускает Docker Compose (9 сервисов)
2. Ждёт готовности PostgreSQL и Elasticsearch
3. Применяет миграции Alembic
4. Загружает 1000 рецептов с нутриентами
5. Индексирует всё в Elasticsearch

### 3. Открыть

| Сервис | URL |
|---|---|
| API + Swagger | http://localhost:8000/docs |
| Web Frontend | http://localhost:5173 |
| MinIO Console | http://localhost:9001 |
| Flower (Celery) | http://localhost:5555 |

### Запуск фронтенда отдельно

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Запуск мобильного приложения

```bash
cd mobile
cp .env.example .env.local
npm install
npx expo start
```

---

## Переменные окружения

Скопируйте `.env.example` и заполните:

```env
# База данных
POSTGRES_USER=veguser
POSTGRES_PASSWORD=vegpassword
POSTGRES_DB=vegrecipes

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Stripe PRO-подписка
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# Email (опционально — без SMTP печатает токены в stdout)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASSWORD=app_password

# Мониторинг (опционально)
SENTRY_DSN=https://...@sentry.io/...

# URL приложения (для email-ссылок)
APP_URL=https://yourdomain.com
```

---

## Геймификация

### 8 достижений
| Достижение | Условие |
|---|---|
| 🌱 Первый шаг | Добавить первый рецепт в избранное |
| ❤️ Коллекционер | 10 рецептов в избранном |
| 🏆 Гурман | 50 рецептов в избранном |
| ⭐ Критик | Оценить первый рецепт |
| 🎯 Эксперт | Оценить 20 рецептов |
| 📔 Начало пути | Первая запись в дневнике здоровья |
| 🔥 Неделя здоровья | 7 дней подряд в дневнике |
| 💪 Месяц здоровья | 30 дней подряд в дневнике |

### Дуэли рецептов
Еженедельные голосования через Celery Beat. Пользователи голосуют за лучший рецепт в категории. Результаты обновляются автоматически.

---

## Telegram Bot — команды

| Команда | Описание |
|---|---|
| `/start` | Приветствие и главное меню |
| `/random` | Случайный рецепт |
| `/search <запрос>` | Поиск рецептов |
| `/top` | Топ-10 рецептов |
| `/trending` | Трендовые рецепты |
| `/seasonal` | Сезонные рецепты |
| `/categories` | Список категорий |
| `/duel` | Текущая дуэль |
| `/vote <id>` | Проголосовать в дуэли |
| `/log <блюдо>` | Записать приём пищи |
| `/mylog` | Мой дневник за сегодня |
| `/plan` | Недельный план (PRO) |
| `/pro` | Информация о PRO-подписке |
| `/favorites` | Мои избранные рецепты |
| `/achievements` | Мои достижения |
| `/help` | Справка по командам |

---

## Тесты

```bash
cd backend
pip install -r requirements.txt
pip install aiosqlite
pytest --cov=. --cov-report=term-missing
```

Покрытие > 80% для всех API endpoint.

---

## Масштаб проекта

| Метрика | Значение |
|---|---|
| Рецептов в seed-данных | 1 000 |
| API endpoints | 52 |
| Страниц (Web) | 15 |
| Экранов (Mobile) | 12 |
| Команд (Bot) | 16 |
| Моделей БД | 14 |
| Сервисов в docker-compose | 9 |
| Строк кода (est.) | ~12 000 |

---

## Лицензия

MIT — используйте свободно.

---

<p align="center">Сделано с ❤️ и без мяса 🥗</p>
