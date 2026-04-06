import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import { useAuth } from "../context/AuthContext";
import Colors from "../../constants/colors";
import axios from "axios";
import { API_URL } from "../../constants/api";

export default function ProfileScreen() {
  const router = useRouter();
  const { logout, user, token } = useAuth();
  const supportPhone = "+79990000000";
  const supportPhoneLabel = "+7 (999) 000-00-00";
  const supportTelegram = "lp_support_mock";

  const handleLogout = async () => {
    Alert.alert("Выход", "Вы уверены, что хотите выйти из аккаунта?", [
      {
        text: "Отмена",
        style: "cancel",
      },
      {
        text: "Выйти",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      "Удалить профиль",
      "Вы уверены? Профиль и связанные данные будут удалены. Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              if (!token) {
                Alert.alert("Ошибка", "Необходима авторизация");
                return;
              }

              await axios.delete(`${API_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              await logout();
              router.replace("/login");
            } catch (error: any) {
              const message =
                error?.response?.data?.message ||
                "Не удалось удалить профиль. Попробуйте позже.";
              Alert.alert("Ошибка", message);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person-outline" size={50} color="#000000" />
        </View>
        <Text style={styles.name}>{user?.name || user?.username || "Пользователь"}</Text>
        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}
      </View>

      <View style={styles.menu}>
        <Link href={{ pathname: "/cars", params: { from: "/profile" } }} asChild>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIconContainer}>
              <Ionicons name="car-sport-outline" size={22} color="#000000" />
            </View>
            <Text style={styles.menuText}>Ваши автомобили</Text>
          </TouchableOpacity>
        </Link>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#000000"
            />
          </View>
          <Text style={styles.menuText}>О приложении</Text>
        </TouchableOpacity>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Поддержка</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${supportPhone}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.supportLink}>Телефон: {supportPhoneLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://t.me/${supportTelegram}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.supportLink}>Telegram: @{supportTelegram}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#000000"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteProfileButton}
          onPress={handleDeleteProfile}
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color="#FF3B30"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.deleteProfileButtonText}>Удалить профиль</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#17181C",
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: "#17181C",
    alignItems: "center",
    padding: 32,
    paddingBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 50,
  },
  name: {
    fontSize: 24,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  phone: {
    fontSize: 14,
    color: "#cccccc",
  },
  menu: {
    padding: 16,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  supportCard: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "600",
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: "#cccccc",
    marginBottom: 4,
  },
  supportLink: {
    fontSize: 14,
    color: Colors.warning,
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  logoutButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteProfileButton: {
    backgroundColor: "#2C2C2E",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#4A4A4A",
  },
  deleteProfileButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
});
