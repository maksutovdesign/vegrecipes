import pytest


@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_categories_empty(client):
    resp = await client.get("/api/v1/categories")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_spices_empty(client):
    resp = await client.get("/api/v1/spices")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_world_map(client):
    resp = await client.get("/api/v1/world-map")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_pro_required_for_weekly_plan(auth_client):
    resp = await auth_client.post("/api/v1/meal-plan/generate", json={"daily_calories": 2000})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_duels_active(client):
    resp = await client.get("/api/v1/duels/active")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
