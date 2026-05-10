import api from "./client";
import type { PaginatedRecipes, Recipe, RecipeListItem } from "@/types";

export interface RecipesFilter {
  page?: number;
  size?: number;
  skip?: number;
  limit?: number;
  q?: string;
  category_id?: number;
  cuisine?: string;
  difficulty?: number;
  max_cook_time?: number;
  max_calories?: number;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  diet_tags?: string[];
  season_month?: number;
  sort?: "rating" | "views" | "created_at" | "cook_time";
  sort_by?: string;
}

export const recipesApi = {
  list: (params: RecipesFilter = {}) =>
    api.get<PaginatedRecipes>("/recipes", { params }).then((r) => r.data),

  get: (id: number) => api.get<Recipe>(`/recipes/${id}`).then((r) => r.data),

  top: (limit = 100, period: "all" | "week" | "month" = "all") =>
    api.get<RecipeListItem[]>("/recipes/top", { params: { limit, period } }).then((r) => r.data),

  trending: () => api.get<RecipeListItem[]>("/recipes/trending").then((r) => r.data),

  seasonal: (month: number) =>
    api.get<RecipeListItem[]>("/recipes/seasonal", { params: { month } }).then((r) => r.data),

  random: (params?: { category_id?: number; max_cook_time?: number }) =>
    api.get<RecipeListItem>("/recipes/random", { params }).then((r) => r.data),

  autocomplete: (q: string) =>
    api.get<{ suggestions: string[] }>("/recipes/autocomplete", { params: { q } }).then((r) => r.data.suggestions),

  similar: (id: number) =>
    api.get<RecipeListItem[]>(`/recipes/${id}/similar`).then((r) => r.data),

  adapt: (id: number, constraints: { remove?: string[]; servings?: number; gluten_free?: boolean; question?: string }) =>
    api.post<{ answer: string }>(`/recipes/${id}/adapt`, constraints).then((r) => r.data.answer),

  ask: (id: number, question: string) =>
    api.post<{ answer: string }>(`/recipes/${id}/ask`, null, { params: { question } }).then((r) => r.data.answer),
};
