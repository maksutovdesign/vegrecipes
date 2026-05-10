export interface Nutrition {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
  vitamin_a: number | null;
  vitamin_c: number | null;
  vitamin_d: number | null;
  vitamin_b12: number | null;
  iron: number | null;
  calcium: number | null;
  magnesium: number | null;
  zinc: number | null;
}

export interface Ingredient {
  id: number;
  name: string;
  amount: number | null;
  unit: string | null;
  group_name: string | null;
  substitute_notes: string | null;
}

export interface Step {
  id: number;
  step_number: number;
  description: string;
  photo_url: string | null;
  timer_seconds: number | null;
  voice_hint: string | null;
}

export interface RecipeListItem {
  id: number;
  title: string;
  slug: string;
  main_photo: string | null;
  difficulty: number;
  cook_time: number | null;
  prep_time: number | null;
  rating: number;
  views: number;
  cuisine_country: string | null;
  is_vegan: boolean;
  season_months: number[];
  nutrition: Nutrition | null;
}

export interface Recipe extends RecipeListItem {
  description: string | null;
  category_id: number | null;
  servings: number;
  gallery: string[];
  tags: string[];
  favorites_count: number;
  is_gluten_free: boolean;
  is_lactose_free: boolean;
  is_nut_free: boolean;
  diet_tags: string[];
  ingredients: Ingredient[];
  steps: Step[];
}

export interface PaginatedRecipes {
  items: RecipeListItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  subcategories: string[];
}

export interface User {
  id: number;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  sub_type: "free" | "pro";
  streak_days: number;
  followers_count: number;
  following_count: number;
  created_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface MealPlan {
  id: number;
  week_start: string | null;
  plan_data: Record<string, Record<string, { recipe_id: number; title: string; calories: number }>>;
  shopping_list: Array<{ name: string; amount: number; unit: string }>;
  daily_calories_target: number | null;
}

export interface HealthStats {
  dates: string[];
  calories: number[];
  protein: number[];
  fat: number[];
  carbs: number[];
  deficits: Array<{ nutrient: string; avg_pct: number }>;
}

export interface FridgeMatch {
  recipe_id: number;
  title: string;
  match_percent: number;
  missing_count: number;
  missing: string[];
}

export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  level: string;
  icon_url: string | null;
  points: number;
}
