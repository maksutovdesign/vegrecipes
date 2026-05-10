import pytest


@pytest.mark.asyncio
async def test_register(client):
    resp = await client.post("/api/v1/users/register", json={
        "email": "new@vegrecipes.ru",
        "username": "newuser",
        "password": "secure123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {"email": "dup@vegrecipes.ru", "username": "dup1", "password": "pass123"}
    await client.post("/api/v1/users/register", json=payload)
    resp = await client.post("/api/v1/users/register", json={**payload, "username": "dup2"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login(client):
    await client.post("/api/v1/users/register", json={
        "email": "login@vegrecipes.ru", "username": "loginuser", "password": "mypass123"
    })
    resp = await client.post("/api/v1/users/login", json={
        "email": "login@vegrecipes.ru", "password": "mypass123"
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post("/api/v1/users/register", json={
        "email": "wrongpass@vegrecipes.ru", "username": "wrongpassuser", "password": "correct"
    })
    resp = await client.post("/api/v1/users/login", json={
        "email": "wrongpass@vegrecipes.ru", "password": "wrong"
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(auth_client):
    resp = await auth_client.get("/api/v1/users/me")
    assert resp.status_code == 200
    data = resp.json()
    assert "email" in data
    assert data["sub_type"] == "free"
