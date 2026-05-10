import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RecipeFilters {
  search: string;
  dietTags: string[];
  difficulty: string;
  maxTime?: number;
  sortBy: string;
  cuisine?: string;
  category_id?: number;
  season_month?: number;
}

interface RecipeStore {
  filters: RecipeFilters;
  setFilter: <K extends keyof RecipeFilters>(key: K, value: RecipeFilters[K]) => void;
  resetFilters: () => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
}

const defaultFilters: RecipeFilters = {
  search: "",
  dietTags: [],
  difficulty: "",
  maxTime: undefined,
  sortBy: "created_at",
};

export const useRecipeStore = create<RecipeStore>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      setFilter: (key, value) =>
        set((s) => ({ filters: { ...s.filters, [key]: value } })),
      resetFilters: () => set({ filters: defaultFilters }),
      favorites: [],
      toggleFavorite: (id) => {
        const next = get().favorites.includes(id)
          ? get().favorites.filter((f) => f !== id)
          : [...get().favorites, id];
        set({ favorites: next });
      },
    }),
    {
      name: "veg-recipe-store",
      partialize: (s) => ({ favorites: s.favorites }),
    }
  )
);
