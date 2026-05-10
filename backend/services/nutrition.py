"""Nutrition calculation from ingredient list."""
from typing import List, Dict, Any

# Approximate nutrition per 100g for common ingredients
INGREDIENT_NUTRITION_DB: Dict[str, Dict[str, float]] = {
    "гречка": {"calories": 313, "protein": 12.6, "fat": 3.3, "carbs": 57.1, "fiber": 11.3, "iron": 6.7, "calcium": 20, "magnesium": 200, "zinc": 2.1},
    "рис": {"calories": 344, "protein": 6.7, "fat": 0.7, "carbs": 78.9, "fiber": 0.4, "iron": 1.0, "calcium": 40, "magnesium": 47, "zinc": 1.5},
    "чечевица": {"calories": 295, "protein": 24.0, "fat": 1.5, "carbs": 46.3, "fiber": 11.5, "iron": 11.8, "calcium": 83, "magnesium": 122, "zinc": 4.8},
    "нут": {"calories": 364, "protein": 19.0, "fat": 6.0, "carbs": 61.0, "fiber": 17.4, "iron": 6.2, "calcium": 105, "magnesium": 115, "zinc": 3.4},
    "тофу": {"calories": 76, "protein": 8.1, "fat": 4.8, "carbs": 1.9, "fiber": 0.3, "calcium": 350, "iron": 5.4, "magnesium": 30, "zinc": 0.8},
    "морковь": {"calories": 41, "protein": 0.9, "fat": 0.2, "carbs": 9.6, "fiber": 2.8, "vitamin_a": 835, "vitamin_c": 5.9, "iron": 0.3, "calcium": 33},
    "шпинат": {"calories": 23, "protein": 2.9, "fat": 0.4, "carbs": 3.6, "fiber": 2.2, "vitamin_a": 469, "vitamin_c": 28.1, "iron": 2.7, "calcium": 99, "magnesium": 79},
    "брокколи": {"calories": 34, "protein": 2.8, "fat": 0.4, "carbs": 6.6, "fiber": 2.6, "vitamin_c": 89.2, "vitamin_k": 101.6, "calcium": 47, "iron": 0.7},
    "авокадо": {"calories": 160, "protein": 2.0, "fat": 14.7, "carbs": 8.5, "fiber": 6.7, "vitamin_c": 10, "magnesium": 29, "potassium": 485},
    "банан": {"calories": 89, "protein": 1.1, "fat": 0.3, "carbs": 22.8, "fiber": 2.6, "vitamin_c": 8.7, "magnesium": 27, "potassium": 358},
    "яблоко": {"calories": 52, "protein": 0.3, "fat": 0.2, "carbs": 13.8, "fiber": 2.4, "vitamin_c": 4.6, "calcium": 6},
    "помидор": {"calories": 18, "protein": 0.9, "fat": 0.2, "carbs": 3.9, "fiber": 1.2, "vitamin_c": 14, "vitamin_a": 42, "calcium": 10, "iron": 0.3},
    "огурец": {"calories": 16, "protein": 0.7, "fat": 0.1, "carbs": 3.6, "fiber": 0.5, "vitamin_c": 2.8, "calcium": 16, "magnesium": 13},
    "оливковое масло": {"calories": 884, "protein": 0, "fat": 100, "carbs": 0, "fiber": 0, "vitamin_e": 14.4},
    "грецкие орехи": {"calories": 654, "protein": 15.2, "fat": 65.2, "carbs": 13.7, "fiber": 6.7, "iron": 2.9, "calcium": 98, "magnesium": 158, "zinc": 3.1},
    "миндаль": {"calories": 579, "protein": 21.2, "fat": 49.9, "carbs": 21.6, "fiber": 12.5, "calcium": 264, "iron": 3.7, "magnesium": 270, "zinc": 3.1},
    "лук": {"calories": 40, "protein": 1.1, "fat": 0.1, "carbs": 9.3, "fiber": 1.7, "vitamin_c": 7.4, "calcium": 23, "iron": 0.2},
    "чеснок": {"calories": 149, "protein": 6.4, "fat": 0.5, "carbs": 33.1, "fiber": 2.1, "vitamin_c": 31.2, "calcium": 181, "iron": 1.7},
    "имбирь": {"calories": 80, "protein": 1.8, "fat": 0.8, "carbs": 17.8, "fiber": 2.0, "vitamin_c": 5, "magnesium": 43, "iron": 0.6},
    "молоко кокосовое": {"calories": 197, "protein": 2.0, "fat": 21.3, "carbs": 2.8, "fiber": 0, "calcium": 16, "iron": 3.3},
    "яйцо": {"calories": 155, "protein": 12.6, "fat": 10.6, "carbs": 1.1, "fiber": 0, "vitamin_d": 2.0, "vitamin_b12": 1.1, "iron": 1.2, "calcium": 56, "zinc": 1.3},
    "творог": {"calories": 98, "protein": 11.1, "fat": 4.3, "carbs": 2.9, "fiber": 0, "calcium": 164, "vitamin_b12": 0.4},
    "мука пшеничная": {"calories": 364, "protein": 10.3, "fat": 1.1, "carbs": 76.3, "fiber": 2.7, "iron": 3.5, "calcium": 17, "magnesium": 22},
    "овсянка": {"calories": 389, "protein": 16.9, "fat": 6.9, "carbs": 66.3, "fiber": 10.6, "iron": 4.7, "calcium": 54, "magnesium": 177, "zinc": 4.0},
    "киноа": {"calories": 368, "protein": 14.1, "fat": 6.1, "carbs": 64.2, "fiber": 7.0, "iron": 4.6, "calcium": 47, "magnesium": 197, "zinc": 3.1},
    "батат": {"calories": 86, "protein": 1.6, "fat": 0.1, "carbs": 20.1, "fiber": 3.0, "vitamin_a": 961, "vitamin_c": 2.4, "calcium": 30, "iron": 0.6},
    "тыква": {"calories": 26, "protein": 1.0, "fat": 0.1, "carbs": 6.5, "fiber": 0.5, "vitamin_a": 426, "vitamin_c": 9.0, "calcium": 21, "iron": 0.8},
    "капуста": {"calories": 25, "protein": 1.3, "fat": 0.1, "carbs": 5.8, "fiber": 2.5, "vitamin_c": 36.6, "calcium": 40, "iron": 0.5},
    "перец болгарский": {"calories": 31, "protein": 1.0, "fat": 0.3, "carbs": 6.0, "fiber": 2.1, "vitamin_c": 127.7, "vitamin_a": 157, "iron": 0.4},
    "баклажан": {"calories": 25, "protein": 1.0, "fat": 0.2, "carbs": 5.9, "fiber": 3.0, "vitamin_c": 2.2, "calcium": 9, "iron": 0.2},
}

NUTRIENTS = ["calories", "protein", "fat", "carbs", "fiber", "vitamin_a", "vitamin_c", "vitamin_d", "vitamin_b12", "iron", "calcium", "magnesium", "zinc"]


def _find_ingredient(name: str) -> Dict[str, float]:
    name_lower = name.lower().strip()
    for key, data in INGREDIENT_NUTRITION_DB.items():
        if key in name_lower or name_lower in key:
            return data
    return {}


def calculate_nutrition(ingredients: List[Dict[str, Any]], servings: int = 4) -> Dict[str, float]:
    """Calculate per-100g nutrition from ingredient list."""
    totals: Dict[str, float] = {k: 0.0 for k in NUTRIENTS}
    total_weight_g = 0.0

    unit_to_grams = {
        "г": 1, "кг": 1000, "мл": 1, "л": 1000,
        "ст.л.": 15, "ч.л.": 5, "стакан": 250,
        "шт.": 100, "пучок": 30, "щепотка": 1,
    }

    for ing in ingredients:
        amount = float(ing.get("amount", 0) or 0)
        unit = ing.get("unit", "г")
        name = ing.get("name", "")
        multiplier = unit_to_grams.get(unit, 1)
        weight_g = amount * multiplier
        total_weight_g += weight_g

        db_entry = _find_ingredient(name)
        for nutrient in NUTRIENTS:
            if nutrient in db_entry:
                totals[nutrient] += db_entry[nutrient] * weight_g / 100

    if total_weight_g == 0:
        return {k: 0.0 for k in NUTRIENTS}

    per_100g = {k: round(v / total_weight_g * 100, 2) for k, v in totals.items()}
    return per_100g


def nutrition_per_serving(per_100g: Dict[str, float], weight_per_serving_g: float) -> Dict[str, float]:
    return {k: round(v * weight_per_serving_g / 100, 2) for k, v in per_100g.items()}
