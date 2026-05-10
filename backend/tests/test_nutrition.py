import pytest
from services.nutrition import calculate_nutrition, nutrition_per_serving


def test_calculate_nutrition_basic():
    ingredients = [
        {"name": "гречка", "amount": 200, "unit": "г"},
        {"name": "шпинат", "amount": 100, "unit": "г"},
    ]
    result = calculate_nutrition(ingredients)
    assert result["calories"] > 0
    assert result["protein"] > 0
    assert result["iron"] > 0


def test_calculate_nutrition_empty():
    result = calculate_nutrition([])
    assert all(v == 0.0 for v in result.values())


def test_nutrition_per_serving():
    per_100g = {"calories": 100, "protein": 5, "fat": 2, "carbs": 15}
    per_serving = nutrition_per_serving(per_100g, 300)
    assert per_serving["calories"] == 300.0
    assert per_serving["protein"] == 15.0


def test_unknown_ingredient_returns_zeros():
    ingredients = [{"name": "неизвестный продукт xyz", "amount": 100, "unit": "г"}]
    result = calculate_nutrition(ingredients)
    assert result["calories"] == 0.0


def test_unit_conversion():
    ingredients = [
        {"name": "гречка", "amount": 0.2, "unit": "кг"},
    ]
    result_kg = calculate_nutrition(ingredients)

    ingredients2 = [
        {"name": "гречка", "amount": 200, "unit": "г"},
    ]
    result_g = calculate_nutrition(ingredients2)

    assert abs(result_kg["calories"] - result_g["calories"]) < 0.1
