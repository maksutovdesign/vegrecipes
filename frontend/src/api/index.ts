import api from "./client";
import type { Category, Spice, User, TokenResponse, Duel, MealPlan, WorldMapEntry, Achievement } from "@/types";

export { recipesApi } from "./recipes";

export const categoriesApi = {
  list: () => api.get<Category[]>("/categories").then((r) => r.data),
  get: (slug: string) => api.get<Category>(`/categories/${slug}`).then((r) => r.data),
};

export const spicesApi = {
  list: (q?: string) => api.get<Spice[]>("/spices", { params: q ? { q } : {} }).then((r) => r.data),
  get: (id: number) => api.get<Spice>(`/spices/${id}`).then((r) => r.data),
};

export const usersApi = {
  register: (data: { email: string; username: string; password: string; display_name?: string }) =>
    api.post<TokenResponse>("/users/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<TokenResponse>("/users/login", data).then((r) => r.data),
  me: () => api.get<User>("/users/me").then((r) => r.data),
  updateMe: (data: { display_name?: string; bio?: string }) =>
    api.patch<User>("/users/me", null, { params: data }).then((r) => r.data),
  achievements: () => api.get<Achievement[]>("/users/me/achievements").then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/users/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token: string, new_password: string) =>
    api.post<{ message: string }>("/users/reset-password", { token, new_password }).then((r) => r.data),
  verifyEmail: (token: string) =>
    api.get<{ message: string }>("/users/verify-email", { params: { token } }).then((r) => r.data),
  requestVerification: () =>
    api.post<{ message: string }>("/users/request-verification").then((r) => r.data),
};

export const duelsApi = {
  active: () => api.get<Duel[]>("/duels/active").then((r) => r.data),
  hot: () => api.get<Duel[]>("/duels/hot").then((r) => r.data),
  get: (id: number) => api.get<Duel>(`/duels/${id}`).then((r) => r.data),
  vote: (duelId: number, recipeId: number) =>
    api.post<{ votes_a: number; votes_b: number }>(`/duels/${duelId}/vote`, null, { params: { recipe_id: recipeId } }).then((r) => r.data),
  create: (categoryId?: number) =>
    api.post<Duel>("/duels/create", null, { params: categoryId ? { category_id: categoryId } : {} }).then((r) => r.data),
};

export const mealPlanApi = {
  generate: (data: { daily_calories: number; is_gluten_free?: boolean; is_vegan?: boolean }) =>
    api.post<MealPlan>("/meal-plan/generate", data).then((r) => r.data),
  my: () => api.get<MealPlan[]>("/meal-plan/my").then((r) => r.data),
  daily: (daily_calories = 2000) =>
    api.get("/meal-plan/daily-generate", { params: { daily_calories } }).then((r) => r.data),
};

export const healthApi = {
  log: (data: { recipe_id: number; servings: number }) =>
    api.post("/health-log", data).then((r) => r.data),
  stats: (days = 7) => api.get("/health-log/stats", { params: { days } }).then((r) => r.data),
  history: (limit = 20) => api.get("/health-log/history", { params: { limit } }).then((r) => r.data),
  fridgeMatch: (ingredients: string) =>
    api.get("/health-log/fridge-suggest", { params: { ingredients } }).then((r) => r.data),
  fridgeAI: (ingredients: string) =>
    api.get<{ answer: string }>("/health-log/fridge-ai", { params: { ingredients } }).then((r) => r.data.answer),
};

export const paymentsApi = {
  createCheckout: (plan: "monthly" | "yearly") =>
    api.post<{ checkout_url: string }>("/payments/create-checkout", null, { params: { plan } }).then((r) => r.data),
  subscription: () => api.get("/payments/subscription").then((r) => r.data),
};

export const worldMapApi = {
  data: () => api.get<WorldMapEntry[]>("/world-map").then((r) => r.data),
};

export default api;
