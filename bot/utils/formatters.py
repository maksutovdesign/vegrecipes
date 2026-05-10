"""Text formatters for Telegram messages."""
from datetime import datetime


DIFF_LABEL = {1: "🟢 Легко", 2: "🟡 Средне", 3: "🔴 Сложно"}


def format_recipe_card(r: dict, short: bool = False) -> str:
    """Format a recipe dict into a Telegram message."""
    lines = []

    # Title + vegan badge
    title = r.get("title", "Без названия")
    vegan = "🌿 " if r.get("is_vegan") else ""
    lines.append(f"*{vegan}{title}*")

    if not short:
        desc = r.get("description", "")
        if desc:
            lines.append(f"\n_{desc[:180]}{'...' if len(desc) > 180 else ''}_")

    lines.append("")

    # Meta
    diff = r.get("difficulty", 1)
    lines.append(f"⚡ {DIFF_LABEL.get(diff, '—')}   "
                 f"⏱ {r.get('cook_time', '?')} мин   "
                 f"★ {r.get('rating', 0):.1f}")

    cuisine = r.get("cuisine_country")
    if cuisine:
        lines.append(f"🌍 {cuisine}")

    # Nutrition
    nutr = r.get("nutrition")
    if nutr and nutr.get("calories"):
        cal = round(nutr["calories"])
        p = round(nutr.get("protein") or 0, 1)
        f = round(nutr.get("fat") or 0, 1)
        c = round(nutr.get("carbs") or 0, 1)
        lines.append(f"\n🔥 {cal} ккал  |  Б:{p}г  Ж:{f}г  У:{c}г")

    # Tags
    tags = r.get("tags", [])
    if tags and not short:
        lines.append("  ".join(f"#{t.replace(' ', '_')}" for t in tags[:5]))

    lines.append(f"\n🔗 /recipe\\_{r['id']}")
    return "\n".join(lines)


def format_recipe_list(items: list[dict], page: int = 1, total: int = 0) -> str:
    if not items:
        return "😔 Ничего не найдено"
    lines = [f"*Найдено рецептов: {total}*\n"]
    for i, r in enumerate(items, 1):
        vegan = "🌿" if r.get("is_vegan") else "🍽"
        cal = ""
        nutr = r.get("nutrition")
        if nutr and nutr.get("calories"):
            cal = f" · {round(nutr['calories'])} ккал"
        time_str = f" · ⏱{r.get('cook_time', '?')}м" if r.get("cook_time") else ""
        lines.append(f"{i}\\. {vegan} *{r['title']}*{time_str}{cal}")
        lines.append(f"   /recipe\\_{r['id']}")
    if total > len(items):
        lines.append(f"\n_Страница {page}_")
    return "\n".join(lines)


def format_spice(s: dict) -> str:
    lines = [f"🌶 *{s['name']}*"]
    if s.get("origin"):
        lines.append(f"📍 Происхождение: {s['origin']}")
    if s.get("description"):
        lines.append(f"\n{s['description'][:300]}")
    if s.get("storage_tips"):
        lines.append(f"\n💡 *Хранение:* {s['storage_tips']}")
    if s.get("substitutes"):
        lines.append(f"🔄 *Замена:* {s['substitutes']}")
    nutr = s.get("nutrition", [])
    if nutr:
        lines.append("\n📊 *Питательность (на 5г):*")
        for n in nutr[:5]:
            lines.append(f"  • {n['element']}: {n['amount_per_5g']} {n['unit']}")
    return "\n".join(lines)


def format_daily_plan(plan: dict) -> str:
    if not plan:
        return "😔 Не удалось получить план"
    meals_ru = {
        "breakfast": "🌅 Завтрак",
        "lunch": "☀️ Обед",
        "dinner": "🌙 Ужин",
        "snack": "🍎 Перекус",
    }
    lines = ["📅 *Дневное меню*\n"]
    total_cal = 0
    for meal_key, meal_ru in meals_ru.items():
        meal = plan.get(meal_key)
        if not meal:
            continue
        cal = meal.get("calories", 0)
        total_cal += cal
        lines.append(f"{meal_ru}: *{meal['title']}* — {cal} ккал")
        lines.append(f"   /recipe\\_{meal['recipe_id']}")
    lines.append(f"\n🔥 Итого: *{total_cal} ккал*")
    return "\n".join(lines)


def format_health_stats(stats: dict, days: int) -> str:
    if not stats or not stats.get("dates"):
        return "📊 Данных пока нет. Отмечайте приёмы пищи через /log"

    cals = stats.get("calories", [])
    avg_cal = round(sum(cals) / len(cals)) if cals else 0
    proteins = stats.get("protein", [])
    avg_prot = round(sum(proteins) / len(proteins), 1) if proteins else 0

    lines = [f"📊 *Статистика за {days} дней*\n"]
    lines.append(f"🔥 Среднее ккал/день: *{avg_cal}*")
    lines.append(f"💪 Среднее белка/день: *{avg_prot}г*")

    deficits = stats.get("deficits", [])
    if deficits:
        lines.append("\n⚠️ *Дефициты:*")
        for d in deficits[:5]:
            nutrient = d["nutrient"].replace("_", " ").title()
            pct = round(d["avg_pct"])
            bar = "█" * (pct // 10) + "░" * (10 - pct // 10)
            lines.append(f"  {nutrient}: {bar} {pct}%")

    return "\n".join(lines)


def format_week_plan_summary(plan: dict) -> str:
    lines = ["📅 *Недельное меню готово\\!*\n"]
    total_days = len(plan.get("plan_data", {}))
    lines.append(f"📆 Дней в плане: {total_days}")

    shopping = plan.get("shopping_list", [])
    lines.append(f"🛒 Позиций в списке покупок: {len(shopping)}")
    lines.append("\nПервые покупки:")
    for item in shopping[:5]:
        lines.append(f"  • {item['name']} — {item['amount']} {item['unit']}")
    if len(shopping) > 5:
        lines.append(f"  _...и ещё {len(shopping) - 5} позиций_")

    return "\n".join(lines)


def pluralize(n: int, one: str, few: str, many: str) -> str:
    if 11 <= n % 100 <= 19:
        return many
    r = n % 10
    if r == 1:
        return one
    if 2 <= r <= 4:
        return few
    return many
