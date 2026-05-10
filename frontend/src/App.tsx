import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout/Layout";
import HomePage from "@/pages/Home/Home";
import RecipePage from "@/pages/Recipe/RecipePage";
import CategoriesPage from "@/pages/Categories/CategoriesPage";
import WorldMapPage from "@/pages/WorldMap/WorldMapPage";
import RoulettePage from "@/pages/Roulette/RoulettePage";
import DuelPage from "@/pages/Duel/DuelPage";
import SpicesPage from "@/pages/Spices/SpicesPage";
import MealPlanPage from "@/pages/MealPlan/MealPlanPage";
import HealthLogPage from "@/pages/HealthLog/HealthLogPage";
import ProfilePage from "@/pages/Profile/ProfilePage";
import AuthPage from "@/pages/Auth/AuthPage";
import PROPage from "@/pages/PRO/PROPage";
import RecipeListPage from "@/pages/RecipeList/RecipeListPage";
import VerifyEmailPage from "@/pages/VerifyEmail/VerifyEmailPage";
import ResetPasswordPage from "@/pages/ResetPassword/ResetPasswordPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/recipes" element={<RecipeListPage />} />
        <Route path="/recipes/:id" element={<RecipePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/world-map" element={<WorldMapPage />} />
        <Route path="/roulette" element={<RoulettePage />} />
        <Route path="/duel" element={<DuelPage />} />
        <Route path="/spices" element={<SpicesPage />} />
        <Route path="/meal-plan" element={<MealPlanPage />} />
        <Route path="/health" element={<HealthLogPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pro" element={<PROPage />} />
      </Route>
      {/* Auth & account flows — no layout wrapper */}
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}
