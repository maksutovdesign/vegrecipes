import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { mealPlanApi } from "@/api";
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from "@/constants/theme";

interface ShoppingItem {
  name: string;
  amount: number;
  unit: string;
  checked?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Овощи и зелень": "🥬",
  "Фрукты": "🍎",
  "Крупы и злаки": "🌾",
  "Бобовые": "🫘",
  "Молочные продукты": "🧀",
  "Специи и приправы": "🌶️",
  "Масла": "🫙",
  "Прочее": "📦",
};

function categorizeItems(items: ShoppingItem[]): Record<string, ShoppingItem[]> {
  const VEGETABLE_KEYWORDS = ["морковь", "лук", "чеснок", "капуста", "брокколи", "шпинат", "помидор", "огурец", "перец", "картофель", "свёкла", "баклажан", "кабачок", "зелень", "петрушка", "укроп"];
  const FRUIT_KEYWORDS = ["яблоко", "банан", "лимон", "апельсин", "груша", "ягод", "слива", "персик"];
  const GRAIN_KEYWORDS = ["рис", "гречка", "овсянка", "булгур", "киноа", "пшено", "кукуруза", "хлеб", "мука", "макарон"];
  const LEGUME_KEYWORDS = ["фасоль", "нут", "чечевица", "горох", "тофу", "соя"];
  const DAIRY_KEYWORDS = ["молоко", "сыр", "йогурт", "сметана", "творог", "кефир", "масло сливочное"];
  const SPICE_KEYWORDS = ["соль", "перец молот", "куркума", "кориандр", "тмин", "паприка", "имбирь", "корица", "ваниль"];
  const OIL_KEYWORDS = ["масло оливковое", "масло подсолнечное", "масло кунжутное", "масло кокосовое"];

  const cats: Record<string, ShoppingItem[]> = {
    "Овощи и зелень": [],
    "Фрукты": [],
    "Крупы и злаки": [],
    "Бобовые": [],
    "Молочные продукты": [],
    "Специи и приправы": [],
    "Масла": [],
    "Прочее": [],
  };

  items.forEach((item) => {
    const nameLower = item.name.toLowerCase();
    if (OIL_KEYWORDS.some((k) => nameLower.includes(k))) cats["Масла"].push(item);
    else if (DAIRY_KEYWORDS.some((k) => nameLower.includes(k))) cats["Молочные продукты"].push(item);
    else if (SPICE_KEYWORDS.some((k) => nameLower.includes(k))) cats["Специи и приправы"].push(item);
    else if (LEGUME_KEYWORDS.some((k) => nameLower.includes(k))) cats["Бобовые"].push(item);
    else if (GRAIN_KEYWORDS.some((k) => nameLower.includes(k))) cats["Крупы и злаки"].push(item);
    else if (FRUIT_KEYWORDS.some((k) => nameLower.includes(k))) cats["Фрукты"].push(item);
    else if (VEGETABLE_KEYWORDS.some((k) => nameLower.includes(k))) cats["Овощи и зелень"].push(item);
    else cats["Прочее"].push(item);
  });

  // Remove empty categories
  return Object.fromEntries(Object.entries(cats).filter(([, v]) => v.length > 0));
}

export default function ShoppingListScreen() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const { data: plans, isLoading } = useQuery({
    queryKey: ["meal-plans"],
    queryFn: mealPlanApi.my,
  });

  const plan = plans?.[0];
  const rawItems: ShoppingItem[] = plan?.shopping_list ?? [];
  const categories = categorizeItems(rawItems);

  const total = rawItems.length;
  const doneCount = checked.size;

  const toggleItem = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const resetAll = () => {
    Alert.alert("Сбросить список?", "Все отметки будут удалены", [
      { text: "Отмена", style: "cancel" },
      { text: "Сбросить", onPress: () => setChecked(new Set()) },
    ]);
  };

  const exportPDF = async () => {
    const html = `
      <html>
      <body style="font-family: sans-serif; padding: 24px;">
        <h1>🛒 Список покупок — VegRecipes</h1>
        ${Object.entries(categories).map(([cat, items]) => `
          <h3>${CATEGORY_ICONS[cat] ?? "📦"} ${cat}</h3>
          <ul>
            ${items.map((i) => `<li>${i.name} — ${i.amount} ${i.unit}</li>`).join("")}
          </ul>
        `).join("")}
        <p style="color:#999;font-size:12px;">Сгенерировано VegRecipes</p>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Экспорт списка покупок",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF создан", uri);
      }
    } catch {
      Alert.alert("Ошибка", "Не удалось создать PDF");
    }
  };

  const shareText = async () => {
    const text = Object.entries(categories)
      .map(([cat, items]) =>
        `${CATEGORY_ICONS[cat] ?? ""} ${cat}:\n${items.map((i) => `  • ${i.name} — ${i.amount} ${i.unit}`).join("\n")}`
      )
      .join("\n\n");

    await Share.share({ message: `🛒 Список покупок VegRecipes\n\n${text}` });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <ActivityIndicator color={colors.green600} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!plan || rawItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Список пуст</Text>
          <Text style={styles.emptyDesc}>
            Сгенерируйте недельное меню, и список покупок появится автоматически
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${total > 0 ? (doneCount / total) * 100 : 0}%` as any }]} />
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {doneCount} / {total} куплено
        </Text>
        <View style={styles.statsActions}>
          <TouchableOpacity onPress={shareText} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>↑ Поделиться</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={exportPDF} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>📄 PDF</Text>
          </TouchableOpacity>
          {doneCount > 0 && (
            <TouchableOpacity onPress={resetAll} style={[styles.actionBtn, styles.actionBtnRed]}>
              <Text style={[styles.actionBtnText, { color: colors.red400 }]}>↺</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {Object.entries(categories).map(([cat, items]) => (
          <View key={cat} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryIcon}>{CATEGORY_ICONS[cat] ?? "📦"}</Text>
              <Text style={styles.categoryTitle}>{cat}</Text>
              <Text style={styles.categoryCount}>
                {items.filter((i) => checked.has(`${i.name}-${i.amount}`)).length}/{items.length}
              </Text>
            </View>

            <View style={styles.itemsList}>
              {items.map((item) => {
                const key = `${item.name}-${item.amount}`;
                const isDone = checked.has(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.itemRow, isDone && styles.itemRowDone]}
                    onPress={() => toggleItem(key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                      {isDone && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.itemName, isDone && styles.itemNameDone]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemAmount, isDone && styles.itemAmountDone]}>
                      {item.amount} {item.unit}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {doneCount === total && total > 0 && (
          <View style={styles.allDone}>
            <Text style={styles.allDoneIcon}>🎉</Text>
            <Text style={styles.allDoneText}>Все куплено! Время готовить!</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },

  progressBar: { height: 4, backgroundColor: colors.gray100 },
  progressFill: { height: "100%", backgroundColor: colors.green500 },

  statsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  statsText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.gray700 },
  statsActions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.gray50, borderRadius: radius.full,
    borderWidth: 1.5, borderColor: colors.gray200,
  },
  actionBtnRed: { borderColor: colors.red400 },
  actionBtnText: { fontSize: fontSizes.xs, fontWeight: "600", color: colors.gray600 },

  scroll: { flex: 1 },

  categorySection: { marginTop: spacing.lg, paddingHorizontal: spacing.xl },
  categoryHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm,
  },
  categoryIcon: { fontSize: 20 },
  categoryTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.gray800, flex: 1 },
  categoryCount: { fontSize: fontSizes.xs, color: colors.gray400, fontWeight: "600" },

  itemsList: {
    backgroundColor: colors.white, borderRadius: radius.xl, overflow: "hidden", ...shadows.sm,
  },
  itemRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.gray50,
  },
  itemRowDone: { opacity: 0.5 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: colors.gray300,
    alignItems: "center", justifyContent: "center",
  },
  checkboxDone: { backgroundColor: colors.green600, borderColor: colors.green600 },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "800" },
  itemName: { flex: 1, fontSize: fontSizes.sm, color: colors.gray800, fontWeight: "500" },
  itemNameDone: { textDecorationLine: "line-through", color: colors.gray400 },
  itemAmount: { fontSize: fontSizes.sm, color: colors.green700, fontWeight: "700" },
  itemAmountDone: { color: colors.gray300 },

  allDone: {
    alignItems: "center", gap: spacing.sm, padding: spacing.xxxl,
  },
  allDoneIcon: { fontSize: 56 },
  allDoneText: { fontSize: fontSizes.lg, fontWeight: "700", color: colors.green700 },

  emptyWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: spacing.lg, padding: spacing.xxxl,
  },
  emptyIcon: { fontSize: 72 },
  emptyTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.extrabold, color: colors.gray800 },
  emptyDesc: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center", lineHeight: 22 },
});
