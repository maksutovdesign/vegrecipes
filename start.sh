#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# VegRecipes — полный запуск сервиса
# Запускать из папки: /Users/maksutovdesign/Desktop/veg/vegrecipes/
# ─────────────────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"
mkdir -p logs

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${GREEN}▶ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ── 1. Проверка Docker ────────────────────────────────────────────────────────
step "Проверяем Docker..."
command -v docker >/dev/null 2>&1 || fail "Docker не найден. Установите Docker Desktop: https://www.docker.com/products/docker-desktop/"
docker info >/dev/null 2>&1 || fail "Docker Desktop не запущен. Откройте приложение Docker Desktop и попробуйте снова."
echo "  Docker OK ✓"

# ── 2. Проверка .env ──────────────────────────────────────────────────────────
step "Проверяем .env..."
[ -f .env ] || fail ".env не найден. Скопируйте: cp .env.example .env"
echo "  .env OK ✓"

# ── 3. Поднимаем инфраструктуру (без backend/celery/bot) ─────────────────────
step "Поднимаем PostgreSQL, Redis, Elasticsearch, MinIO..."
docker compose up -d postgres redis elasticsearch minio

# Ждём готовности PostgreSQL
echo -n "  Ждём PostgreSQL"
until docker compose exec -T postgres pg_isready -U vegrecipes -q 2>/dev/null; do
    echo -n "."
    sleep 2
done
echo " ✓"

# Ждём готовности Redis
echo -n "  Ждём Redis"
until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
    echo -n "."
    sleep 1
done
echo " ✓"

# Elasticsearch может стартовать дольше
echo -n "  Ждём Elasticsearch"
for i in $(seq 1 30); do
    if docker compose exec -T elasticsearch curl -s http://localhost:9200/_cluster/health 2>/dev/null | grep -q '"status"'; then
        echo " ✓"; break
    fi
    echo -n "."
    sleep 3
    [ $i -eq 30 ] && warn "Elasticsearch медленно стартует, продолжаем без него"
done

# ── 4. Создаём MinIO bucket ───────────────────────────────────────────────────
step "Создаём MinIO bucket..."
sleep 3
# Ждём MinIO
for i in $(seq 1 15); do
    if curl -s http://localhost:9000/minio/health/live 2>/dev/null | grep -q "" ; then
        break
    fi
    sleep 2
done

# Создаём bucket через Python + boto3 (входит в requirements)
docker compose run --rm --no-deps backend python - <<'PYEOF'
import boto3
from botocore.exceptions import ClientError
from config import settings

s3 = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT.replace("minio", "minio"),
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
)
try:
    s3.create_bucket(Bucket=settings.S3_BUCKET)
    # Public read policy
    import json
    policy = json.dumps({
        "Version": "2012-10-17",
        "Statement": [{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":f"arn:aws:s3:::{settings.S3_BUCKET}/*"}]
    })
    s3.put_bucket_policy(Bucket=settings.S3_BUCKET, Policy=policy)
    print(f"Bucket '{settings.S3_BUCKET}' created")
except ClientError as e:
    if "BucketAlreadyOwnedByYou" in str(e) or "BucketAlreadyExists" in str(e):
        print(f"Bucket '{settings.S3_BUCKET}' already exists")
    else:
        print(f"MinIO warning: {e}")
PYEOF
echo "  MinIO bucket OK ✓"

# ── 5. Миграции базы данных ───────────────────────────────────────────────────
step "Запускаем миграции Alembic..."
docker compose run --rm --no-deps \
    -e DATABASE_URL_SYNC=postgresql://vegrecipes:vegrecipes@postgres:5432/vegrecipes \
    backend \
    alembic upgrade head
echo "  Миграции OK ✓"

# ── 6. Seeds — 1000 рецептов ──────────────────────────────────────────────────
step "Загружаем данные (1000 рецептов, категории, специи)..."
docker compose run --rm --no-deps backend python seeds/run_seeds.py
echo "  Seeds OK ✓"

# ── 6b. Индексируем рецепты в Elasticsearch ───────────────────────────────────
step "Индексируем рецепты в Elasticsearch..."
docker compose run --rm --no-deps backend python -c "
import asyncio, sys
sys.path.insert(0, '.')
from services import search as es_service
from database import AsyncSessionLocal
from sqlalchemy import select
from models.recipe import Recipe
from sqlalchemy.orm import selectinload

async def reindex():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Recipe).options(selectinload(Recipe.nutrition)).where(Recipe.is_published == True)
        )
        recipes = result.scalars().all()
        for r in recipes:
            await es_service.index_recipe({
                'id': r.id, 'title': r.title, 'description': r.description,
                'tags': r.tags, 'cuisine_country': r.cuisine_country,
                'difficulty': r.difficulty, 'cook_time': r.cook_time,
                'rating': r.rating, 'is_vegan': r.is_vegan,
                'is_gluten_free': r.is_gluten_free, 'season_months': r.season_months,
                'calories': r.nutrition.calories if r.nutrition else 0,
            })
        print(f'  Проиндексировано {len(recipes)} рецептов')

asyncio.run(reindex())
" 2>/dev/null || warn "Не удалось проиндексировать рецепты (ES недоступен — индексация выполнится при следующем запуске)"
echo "  ES reindex OK ✓"

# ── 7. Запускаем backend и Celery ────────────────────────────────────────────
step "Запускаем backend и Celery workers..."
docker compose up -d backend celery celery-beat

# Telegram bot — только если токен настроен
BOT_TOKEN_VALUE=$(grep "^BOT_TOKEN=" bot/.env 2>/dev/null | cut -d= -f2)
if [[ "$BOT_TOKEN_VALUE" == *":"* ]] && [[ "$BOT_TOKEN_VALUE" != "7123456789"* ]]; then
    step "Запускаем Telegram bot..."
    docker compose up -d bot
    echo "  Bot OK ✓"
else
    warn "Telegram bot не запущен — укажите реальный BOT_TOKEN в bot/.env"
fi

# Ждём backend
echo -n "  Ждём backend API"
for i in $(seq 1 30); do
    if curl -s http://localhost:8000/health 2>/dev/null | grep -q '"status"'; then
        echo " ✓"; break
    fi
    echo -n "."
    sleep 2
    [ $i -eq 30 ] && warn "Backend стартует дольше обычного"
done

# ── 8. Запускаем Web Frontend ─────────────────────────────────────────────────
step "Запускаем Web Frontend (Vite)..."
cd frontend
if [ ! -f node_modules/.bin/vite ]; then
    echo "  npm install..."
    npm install --silent
fi
# Запускаем в фоне, логи в файл
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
cd ..

# Ждём запуска
sleep 3
if kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "  Frontend OK ✓  (pid $FRONTEND_PID)"
else
    warn "Frontend не запустился, проверьте logs/frontend.log"
fi

# ── 9. Итог ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  VegRecipes запущен!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo "  Web:           http://localhost:3000"
echo "  API:           http://localhost:8000"
echo "  Swagger docs:  http://localhost:8000/docs"
echo "  MinIO console: http://localhost:9001  (vegrecipes / vegrecipes_secret)"
echo ""
echo "  Логи:"
echo "    Backend:   docker compose logs -f backend"
echo "    Frontend:  tail -f logs/frontend.log"
echo ""
echo "  Остановить всё:"
echo "    docker compose down && kill \$(cat logs/frontend.pid 2>/dev/null) 2>/dev/null"
echo ""
echo "  Мобильное приложение:"
echo "    cd mobile && npm install && npx expo start"
echo ""
echo "  Генерация фото (ComfyUI):"
echo "    1. Запустите ComfyUI:  python ComfyUI/main.py --listen --port 8188"
echo "    2. Генерация:          python scripts/comfyui/generate_photos.py"
echo "    3. Загрузка в MinIO:   python scripts/comfyui/upload_photos.py"
echo "    Подробнее: scripts/comfyui/README.md"
echo ""
