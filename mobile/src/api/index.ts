import api from "./client";
import type {
  Recipe, RecipeListItem, PaginatedRecipes, Category,
  User, TokenResponse, MealPlan, HealthStats, FridgeMatch,
} from "@/types";

// ── Recipes ────────────────────────────────────────────────
export const recipesApi = {
  list: (params: {
    q?: string; page?: number; size?: number;
    cuisine?: string; category_id?: number;
    is_vegan?: boolean; is_gluten_free?: boolean;
    difficulty?: number; max_cook_time?: number;
    sort?: string;
  } = {}) => api.get<PaginatedRecipes>("/recipes", { params }).then((r) => r.data),

  get: (id: number) => api.get<Recipe>(`/recipes/${id}`).then((r) => r.data),

  top: (limit = 20, period: "all" | "week" | "month" = "week") =>
    api.get<RecipeListItem[]>("/recipes/top", { params: { limit, period } }).then((r) => r.data),

  trending: () => api.get<RecipeListItem[]>("/recipes/trending").then((r) => r.data),

  seasonal: (month: number) =>
    api.get<RecipeListItem[]>("/recipes/seasonal", { params: { month } }).then((r) => r.data),

  random: (params?: { category_id?: number; max_cook_time?: number }) =>
    api.get<RecipeListItem>("/recipes/random", { params }).then((r) => r.data),

  similar: (id: number) =>
    api.get<RecipeListItem[]>(`/recipes/${id}/similar`).then((r) => r.data),

  adapt: (id: number, constraints: Record<string, unknown>) =>
    api.post<{ answer: string }>(`/recipes/${id}/adapt`, constraints).then((r) => r.data.answer),

  ask: (id: number, question: string) =>
    api.post<{ answer: string }>(`/recipes/${id}/ask`, null, { params: { question } }).then((r) => r.data.answer),
};

// ── Categories ─────────────────────────────────────────────
export const categoriesApi = {
  list: () => api.get<Category[]>("/categories").then((r) => r.data),
};

// ── Auth ───────────────────────────────────────────────────
export const usersApi = {
  register: (data: { email: string; username: string; password: string; display_name?: string }) =>
    api.post<TokenResponse>("/users/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<TokenResponse>("/users/login", data).then((r) => r.data),

  me: () => api.get<User>("/users/me").then((r) => r.data),

  updateMe: (data: { display_name?: string }) =>
    api.patch<User>("/users/me", null, { params: data }).then((r) => r.data),
};

// ── Meal Plan ──────────────────────────────────────────────
export const mealPlanApi = {
  generate: (data: { daily_calories: number; is_vegan?: boolean; is_gluten_free?: boolean }) =>
    api.post<MealPlan>("/meal-plan/generate", data).then((r) => r.data),

  my: () => api.get<MealPlan[]>("/meal-plan/my").then((r) => r.data),

  daily: (daily_calories = 2000) =>
    api.get("/meal-plan/daily-generate", { params: { daily_calories } }).then((r) => r.data),
};

// ── Health Log ─────────────────────────────────────────────
export const healthApi = {
  log: (data: { recipe_id: number; servings: number }) =>
    api.post("/health-log", data).then((r) => r.data),

  stats: (days = 7) =>
    api.get<HealthStats>("/health-log/stats", { params: { days } }).then((r) => r.data),

  history: (limit = 30) =>
    api.get("/health-log/history", { params: { limit } }).then((r) => r.data),

  fridgeMatch: (ingredients: string) =>
    api.get<FridgeMatch[]>("/health-log/fridge-suggest", { params: { ingredients } }).then((r) => r.data),

  fridgeAI: (ingredients: string) =>
    api.get<{ answer: string }>("/health-log/fridge-ai", { params: { ingredients } }).then((r) => r.data.answer),
};

// ── Payments ───────────────────────────────────────────────
export const paymentsApi = {
  createCheckout: (plan: "monthly" | "yearly") =>
    api.post<{ checkout_url: string }>("/payments/create-checkout", null, { params: { plan } }).then((r) => r.data),
};

export default api;
