import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/colors";

interface SignInPromptProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SignInPrompt({
  title,
  description,
  icon = "person-circle-outline",
}: SignInPromptProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={64} color="#666666" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login")}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text.primary,
    marginTop: 20,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: Colors.text.tertiary,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#D9E57F",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#17181C",
  },
});
