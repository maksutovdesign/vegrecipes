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

export interface Recipe {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  difficulty: number;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  main_photo: string | null;
  gallery: string[];
  cuisine_country: string | null;
  season_months: number[];
  tags: string[];
  rating: number;
  views: number;
  favorites_count: number;
  is_gluten_free: boolean;
  is_lactose_free: boolean;
  is_nut_free: boolean;
  is_vegan: boolean;
  diet_tags: string[];
  nutrition: Nutrition | null;
  ingredients: Ingredient[];
  steps: Step[];
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

export interface Spice {
  id: number;
  name: string;
  description: string | null;
  origin: string | null;
  photo_url: string | null;
  storage_tips: string | null;
  substitutes: string | null;
  nutrition?: Array<{ element: string; amount_per_5g: number; unit: string }>;
  combos?: Array<{ spice_id: number; score: number; notes: string | null }>;
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

export interface Duel {
  id: number;
  recipe_a_id: number;
  recipe_b_id: number;
  votes_a: number;
  votes_b: number;
  status: string;
  week_number: number | null;
  recipe_a?: { id: number; title: string; main_photo: string | null };
  recipe_b?: { id: number; title: string; main_photo: string | null };
}

export interface HealthLogEntry {
  id: number;
  recipe_id: number;
  eaten_at: string;
  servings: number;
}

export interface MealPlan {
  id: number;
  week_start: string | null;
  plan_data: Record<string, Record<string, { recipe_id: number; title: string; calories: number }>>;
  shopping_list: Array<{ name: string; amount: number; unit: string }>;
  daily_calories_target: number | null;
}

export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  level: string;
  icon_url: string | null;
  points: number;
  earned_at?: string | null;
}

export interface FridgeMatch {
  recipe_id: number;
  title: string;
  match_percent: number;
  missing_count: number;
  missing: string[];
}

export interface WorldMapEntry {
  country: string;
  count: number;
}
