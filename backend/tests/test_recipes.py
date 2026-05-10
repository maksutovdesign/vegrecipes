import pytest


@pytest.mark.asyncio
async def test_list_recipes_empty(client):
    resp = await client.get("/api/v1/recipes")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_create_recipe_unauthorized(client):
    resp = await client.post("/api/v1/recipes", json={"title": "Test", "difficulty": 1})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_and_get_recipe(auth_client):
    payload = {
        "title": "Тестовый рецепт",
        "description": "Простой тест",
        "difficulty": 2,
        "prep_time": 10,
        "cook_time": 20,
        "servings": 4,
        "is_vegan": True,
        "ingredients": [
            {"name": "гречка", "amount": 200, "unit": "г", "group_name": "основные"},
            {"name": "лук", "amount": 1, "unit": "шт.", "group_name": "основные"},
        ],
        "steps": [
            {"step_number": 1, "description": "Сварите гречку"},
            {"step_number": 2, "description": "Обжарьте лук"},
        ],
    }
    create_resp = await auth_client.post("/api/v1/recipes", json=payload)
    assert create_resp.status_code == 201, create_resp.text
    recipe = create_resp.json()
    assert recipe["title"] == "Тестовый рецепт"
    assert recipe["slug"]
    assert recipe["nutrition"] is not None

    recipe_id = recipe["id"]
    get_resp = await auth_client.get(f"/api/v1/recipes/{recipe_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == recipe_id


@pytest.mark.asyncio
async def test_recipe_not_found(client):
    resp = await client.get("/api/v1/recipes/99999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_top_recipes(client):
    resp = await client.get("/api/v1/recipes/top?limit=10")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_seasonal_recipes(client):
    resp = await client.get("/api/v1/recipes/seasonal?month=6")
    assert resp.status_code == 200
