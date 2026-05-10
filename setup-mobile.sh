#!/bin/bash
# Первоначальная установка мобильного приложения
cd "$(dirname "$0")/mobile"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Устанавливаем зависимости мобильного приложения...${NC}"

npm install

# Проверяем Expo CLI
if ! command -v expo >/dev/null 2>&1; then
    echo "Устанавливаем Expo CLI..."
    npm install -g expo-cli 2>/dev/null || npx expo --version >/dev/null
fi

echo ""
echo -e "${GREEN}Установка завершена!${NC}"
echo ""
echo "  Запустить мобильное приложение:"
echo -e "${YELLOW}    cd mobile && npx expo start${NC}"
echo ""
echo "  Затем:"
echo "    • Нажмите  i  — открыть в iOS симуляторе"
echo "    • Нажмите  a  — открыть в Android эмуляторе"
echo "    • Отсканируйте QR в приложении Expo Go"
echo ""
echo "  API для мобилки (по умолчанию localhost:8000):"
echo "    Если бэкенд на другом адресе — обновите src/api/index.ts"
echo ""
