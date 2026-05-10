import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/store/authStore";
import { colors, radius, spacing, fontSizes, shadows } from "@/constants/theme";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ProGate({ children, fallback }: Props) {
  const router = useRouter();
  const isPro = useAuthStore((s) => s.isPro());

  if (isPro) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <View style={styles.gate}>
      <Text style={styles.crown}>👑</Text>
      <Text style={styles.title}>Функция PRO</Text>
      <Text style={styles.desc}>
        Разблокируйте полный потенциал платформы с подпиской VegRecipes PRO
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push("/pro" as never)}>
        <Text style={styles.btnText}>Оформить PRO</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  gate: {
    margin: spacing.xl,
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    alignItems: "center",
    gap: spacing.md,
    ...shadows.md,
  },
  crown: { fontSize: 48 },
  title: { fontSize: fontSizes.xl, fontWeight: "800", color: colors.gray800 },
  desc: { fontSize: fontSizes.sm, color: colors.gray500, textAlign: "center", lineHeight: 20 },
  btn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
    backgroundColor: colors.amber400,
    borderRadius: radius.full,
  },
  btnText: { color: colors.white, fontWeight: "700", fontSize: fontSizes.md },
});
