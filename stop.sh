#!/bin/bash
# Остановить все сервисы VegRecipes
cd "$(dirname "$0")"

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Останавливаем VegRecipes...${NC}"

# Frontend
if [ -f logs/frontend.pid ]; then
    PID=$(cat logs/frontend.pid)
    kill "$PID" 2>/dev/null && echo "  Frontend остановлен" || true
    rm -f logs/frontend.pid
fi

# Docker
docker compose down && echo "  Docker services остановлены"

echo -e "${GREEN}Готово.${NC}"
