import { Alert } from "react-native";
import type { Router } from "expo-router";

export function promptSignIn(
  router: Router,
  message = "Войдите в аккаунт, чтобы продолжить",
) {
  Alert.alert("Требуется вход", message, [
    { text: "Отмена", style: "cancel" },
    { text: "Войти", onPress: () => router.push("/login") },
  ]);
}
