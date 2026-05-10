"""Async HTTP client for VegRecipes backend API."""
import httpx
from typing import Any
from config import settings


class APIClient:
    def __init__(self):
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.API_BASE_URL,
                timeout=15.0,
            )
        return self._client

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def _auth_header(self, token: str | None) -> dict:
        return {"Authorization": f"Bearer {token}"} if token else {}

    # ── Auth ───────────────────────────────────────────────
    async def login(self, email: str, password: str) -> dict | None:
        try:
            r = await self.client.post("/users/login", json={"email": email, "password": password})
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    async def register(self, email: str, username: str, password: str) -> dict | None:
        try:
            r = await self.client.post("/users/register", json={
                "email": email, "username": username, "password": password
            })
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    async def me(self, token: str) -> dict | None:
        try:
            r = await self.client.get("/users/me", headers=self._auth_header(token))
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    # ── Recipes ────────────────────────────────────────────
    async def random_recipe(self, category_id: int | None = None, max_cook_time: int | None = None) -> dict | None:
        params: dict[str, Any] = {}
        if category_id:
            params["category_id"] = category_id
        if max_cook_time:
            params["max_cook_time"] = max_cook_time
        try:
            r = await self.client.get("/recipes/random", params=params)
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    async def top_recipes(self, limit: int = 10, period: str = "week") -> list[dict]:
        try:
            r = await self.client.get("/recipes/top", params={"limit": limit, "period": period})
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    async def search_recipes(self, q: str, page: int = 1, size: int = 5) -> dict:
        try:
            r = await self.client.get("/recipes", params={"q": q, "page": page, "size": size})
            return r.json() if r.status_code == 200 else {"items": [], "total": 0}
        except Exception:
            return {"items": [], "total": 0}

    async def get_recipe(self, recipe_id: int) -> dict | None:
        try:
            r = await self.client.get(f"/recipes/{recipe_id}")
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    async def seasonal_recipes(self, month: int) -> list[dict]:
        try:
            r = await self.client.get("/recipes/seasonal", params={"month": month})
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    async def ask_recipe(self, recipe_id: int, question: str, token: str | None = None) -> str:
        try:
            r = await self.client.post(
                f"/recipes/{recipe_id}/ask",
                params={"question": question},
                headers=self._auth_header(token),
            )
            return r.json().get("answer", "Нет ответа") if r.status_code == 200 else "Ошибка AI"
        except Exception:
            return "Ошибка соединения"

    # ── Categories ─────────────────────────────────────────
    async def categories(self) -> list[dict]:
        try:
            r = await self.client.get("/categories")
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    # ── Spices ─────────────────────────────────────────────
    async def spices(self, q: str = "") -> list[dict]:
        try:
            params = {"q": q} if q else {}
            r = await self.client.get("/spices", params=params)
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    async def get_spice(self, spice_id: int) -> dict | None:
        try:
            r = await self.client.get(f"/spices/{spice_id}")
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    # ── Meal Plan ──────────────────────────────────────────
    async def daily_plan(self, daily_calories: int = 2000) -> dict | None:
        try:
            r = await self.client.get("/meal-plan/daily-generate", params={"daily_calories": daily_calories})
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    async def generate_week_plan(self, daily_calories: int, token: str) -> dict | None:
        try:
            r = await self.client.post(
                "/meal-plan/generate",
                json={"daily_calories": daily_calories},
                headers=self._auth_header(token),
            )
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    # ── Health ─────────────────────────────────────────────
    async def fridge_suggest(self, ingredients: str) -> list[dict]:
        try:
            r = await self.client.get("/health-log/fridge-suggest", params={"ingredients": ingredients})
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    async def fridge_ai(self, ingredients: str, token: str | None = None) -> str:
        try:
            r = await self.client.get(
                "/health-log/fridge-ai",
                params={"ingredients": ingredients},
                headers=self._auth_header(token),
            )
            return r.json().get("answer", "") if r.status_code == 200 else "Ошибка AI"
        except Exception:
            return "Ошибка соединения"

    async def health_stats(self, days: int, token: str) -> dict | None:
        try:
            r = await self.client.get(
                "/health-log/stats",
                params={"days": days},
                headers=self._auth_header(token),
            )
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None

    async def log_meal(self, recipe_id: int, servings: float, token: str) -> bool:
        try:
            r = await self.client.post(
                "/health-log",
                json={"recipe_id": recipe_id, "servings": servings},
                headers=self._auth_header(token),
            )
            return r.status_code == 200
        except Exception:
            return False

    # ── Payments ───────────────────────────────────────────
    async def create_checkout(self, plan: str, token: str) -> str | None:
        try:
            r = await self.client.post(
                "/payments/create-checkout",
                params={"plan": plan},
                headers=self._auth_header(token),
            )
            return r.json().get("checkout_url") if r.status_code == 200 else None
        except Exception:
            return None

    # ── Duels ──────────────────────────────────────────────
    async def active_duels(self) -> list[dict]:
        try:
            r = await self.client.get("/duels/active")
            return r.json() if r.status_code == 200 else []
        except Exception:
            return []

    async def vote_duel(self, duel_id: int, recipe_id: int, token: str) -> dict | None:
        try:
            r = await self.client.post(
                f"/duels/{duel_id}/vote",
                params={"recipe_id": recipe_id},
                headers=self._auth_header(token),
            )
            return r.json() if r.status_code == 200 else None
        except Exception:
            return None


api = APIClient()
