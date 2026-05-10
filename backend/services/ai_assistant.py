"""Claude API integration for recipe adaptation and assistance."""
import anthropic
from config import settings

RECIPE_SYSTEM_PROMPT = """Ты — кулинарный ассистент платформы VegRecipes. Специализируешься на вегетарианской кухне.

Твои задачи:
1. Адаптировать рецепты под ограничения (убрать ингредиент, изменить порции, сделать без глютена)
2. Предлагать замены ингредиентов с пересчётом нутриентов
3. Рекомендовать блюда по имеющимся продуктам
4. Отвечать на кулинарные вопросы

Всегда:
- Отвечай на русском языке
- Указывай нутриенты при адаптации (если меняются)
- Предлагай конкретные альтернативы, а не абстрактные советы
- Учитывай, что все рецепты вегетарианские

Формат адаптации рецепта — JSON:
{
  "adapted_ingredients": [...],
  "changes_description": "...",
  "nutrition_delta": {...},
  "tips": "..."
}"""


def _build_recipe_context(recipe: dict) -> str:
    ingredients = ", ".join(
        f"{i.get('amount', '')} {i.get('unit', '')} {i.get('name', '')}"
        for i in recipe.get("ingredients", [])
    )
    return f"""Рецепт: {recipe.get('title', '')}
Описание: {recipe.get('description', '')}
Ингредиенты: {ingredients}
Порций: {recipe.get('servings', 4)}
Нутриенты на 100г: {recipe.get('nutrition', {})}"""


async def adapt_recipe(recipe: dict, constraints: dict) -> str:
    """
    constraints example:
    {"remove": ["лук"], "servings": 3, "gluten_free": True, "question": "Чем заменить лук?"}
    """
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    user_message = _build_recipe_context(recipe) + "\n\nЗапрос пользователя:\n"

    parts = []
    if constraints.get("remove"):
        parts.append(f"Убрать из рецепта: {', '.join(constraints['remove'])}")
    if constraints.get("servings"):
        parts.append(f"Пересчитать на {constraints['servings']} порции")
    if constraints.get("gluten_free"):
        parts.append("Сделать без глютена")
    if constraints.get("question"):
        parts.append(constraints["question"])

    user_message += "\n".join(parts) if parts else "Что можно приготовить с этими ингредиентами?"

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=RECIPE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


async def answer_question(recipe: dict, question: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    user_message = _build_recipe_context(recipe) + f"\n\nВопрос: {question}"

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=512,
        system=RECIPE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


async def suggest_from_fridge(ingredients: list[str]) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    user_message = f"В холодильнике есть: {', '.join(ingredients)}. Предложи 3-5 вегетарианских блюда, которые можно приготовить с минимумом докупок."

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=800,
        system=RECIPE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


async def extract_recipe_from_text(text: str) -> dict:
    """Extract structured recipe from transcribed video/blog text."""
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    system = """Извлеки рецепт из текста и верни строго JSON без markdown:
{
  "title": "...",
  "description": "...",
  "ingredients": [{"name": "...", "amount": ..., "unit": "..."}],
  "steps": [{"step_number": 1, "description": "..."}],
  "prep_time": 0,
  "cook_time": 0,
  "servings": 4,
  "tags": []
}"""

    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=system,
        messages=[{"role": "user", "content": text}],
    )
    import json
    try:
        return json.loads(response.content[0].text)
    except Exception:
        return {}
