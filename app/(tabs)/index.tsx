import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageSourcePropType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../constants/colors";
import { useCars } from "../context/CarsContext";
import { useAuth } from "../context/AuthContext";

export default function HomeScreen() {
  const router = useRouter();
  const { cars, loading } = useCars();
  const { user, isAuthenticated } = useAuth();
  const defaultAvatar = require("../../assets/logo.png") as ImageSourcePropType;
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const avatarSource = user?.photoUrl && !avatarLoadError
    ? { uri: user.photoUrl }
    : defaultAvatar;

  const handleBookingClick = () => {
    if (!isAuthenticated) {
      router.push("/services-selection");
      return;
    }
    router.push("/booking");
  };
  return (
    <SafeAreaView style={styles.safeContainer} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView style={styles.container}>

      {/* Шапка с профилем */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.profileSection}
          onPress={() => {
            if (!isAuthenticated) {
              router.push("/login");
            }
          }}
          disabled={isAuthenticated}
          activeOpacity={isAuthenticated ? 1 : 0.7}
        >
          <Image
            source={avatarSource}
            style={styles.avatar}
            onError={() => setAvatarLoadError(true)}
          />
          <View style={styles.greetingContainer}>
            <Text style={styles.userName}>
              {isAuthenticated
                ? user?.name || user?.username || "Пользователь"
                : "Гость"}
            </Text>
            <Text style={styles.greeting}>
              {isAuthenticated ? "С возвращением!" : "Нажмите, чтобы войти"}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.iconButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              if (!isAuthenticated) {
                router.push("/login");
                return;
              }
              router.push({
                pathname: "/notifications",
                params: { from: "/" },
              });
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>

        <TouchableOpacity style={styles.card} onPress={handleBookingClick}>
          <View style={styles.cardContent}>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Записаться</Text>
              <Text style={styles.cardDescription}>
                Выберите удобное время{"\n"}для посещения
              </Text>
            </View>
            <View style={styles.cardIconContainer}>
              <Ionicons name="calendar-outline" size={32} color="#ffffff" />
            </View>
          </View>
        </TouchableOpacity>

        <Link href="/history" asChild>
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>История</Text>
                <Text style={styles.cardDescription}>
                  Просмотр всех Ваших{"\n"}бронирований
                </Text>
              </View>
              <View style={styles.cardIconContainer}>
                <Ionicons name="time-outline" size={32} color="#ffffff" />
              </View>
            </View>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Padding for bottom navigation */}
      <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  greetingContainer: {
    justifyContent: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 2,
  },
  greeting: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  iconButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#27292D",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#27292D",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  cardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#393C42",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomPadding: {
    height: 100,
  },
});
