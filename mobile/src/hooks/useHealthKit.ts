import { useState, useEffect } from "react";
import { Platform } from "react-native";

// expo-health wrapper — работает только на iOS/Android с реальным устройством
let Health: typeof import("expo-health") | null = null;
try {
  Health = require("expo-health");
} catch {
  // пакет недоступен в Expo Go — graceful degradation
}

export interface DayActivity {
  steps: number;
  activeCalories: number;
  date: string;
}

export function useHealthKit() {
  const [authorized, setAuthorized] = useState(false);
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [activeCalories, setActiveCalories] = useState<number | null>(null);
  const [weekActivity, setWeekActivity] = useState<DayActivity[]>([]);

  useEffect(() => {
    if (!Health || Platform.OS === "web") return;
    authorize();
  }, []);

  const authorize = async () => {
    if (!Health) return;
    try {
      const result = await Health.requestPermissionsAsync([
        Health.HealthDataType.Steps,
        Health.HealthDataType.ActiveEnergyBurned,
        Health.HealthDataType.DietaryCaloriesConsumed,
      ]);
      if (result === Health.PermissionStatus.AUTHORIZED) {
        setAuthorized(true);
        await fetchData();
      }
    } catch (e) {
      console.warn("HealthKit authorization failed:", e);
    }
  };

  const fetchData = async () => {
    if (!Health) return;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    try {
      // Шаги сегодня
      const stepsData = await Health.getHealthRecordsAsync({
        type: Health.HealthDataType.Steps,
        startDate: startOfDay,
        endDate: now,
      });
      const total = stepsData.reduce((sum: number, r: { quantity: number }) => sum + r.quantity, 0);
      setStepsToday(Math.round(total));

      // Сожжённые калории сегодня
      const calData = await Health.getHealthRecordsAsync({
        type: Health.HealthDataType.ActiveEnergyBurned,
        startDate: startOfDay,
        endDate: now,
      });
      const totalCal = calData.reduce((sum: number, r: { quantity: number }) => sum + r.quantity, 0);
      setActiveCalories(Math.round(totalCal));

      // Активность за 7 дней
      const week: DayActivity[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(startOfDay);
        day.setDate(day.getDate() - i);
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const daySteps = await Health.getHealthRecordsAsync({
          type: Health.HealthDataType.Steps,
          startDate: day,
          endDate: nextDay,
        });
        const dayCal = await Health.getHealthRecordsAsync({
          type: Health.HealthDataType.ActiveEnergyBurned,
          startDate: day,
          endDate: nextDay,
        });

        week.push({
          date: day.toISOString().slice(0, 10),
          steps: Math.round(daySteps.reduce((s: number, r: { quantity: number }) => s + r.quantity, 0)),
          activeCalories: Math.round(dayCal.reduce((s: number, r: { quantity: number }) => s + r.quantity, 0)),
        });
      }
      setWeekActivity(week);
    } catch (e) {
      console.warn("HealthKit fetch error:", e);
    }
  };

  const logNutrition = async (calories: number) => {
    if (!Health || !authorized) return;
    try {
      await Health.saveHealthRecordAsync({
        type: Health.HealthDataType.DietaryCaloriesConsumed,
        quantity: calories,
        startDate: new Date(),
        endDate: new Date(),
      });
    } catch (e) {
      console.warn("HealthKit log nutrition error:", e);
    }
  };

  return { authorized, stepsToday, activeCalories, weekActivity, authorize, logNutrition };
}
