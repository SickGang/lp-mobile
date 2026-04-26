import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useCallback } from "react";
import Colors from "../../constants/colors";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../../constants/api";

interface Booking {
  id: number;
  startTime: string;
  endTime: string;
  status: string;
  totalPrice: number;
  selectedServices: {
    service: {
      id: number;
      name: string;
    };
  }[];
  car: {
    id: number;
    licensePlate: string | null;
    hasNoPlate: boolean;
  };
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  // Перезагружаем бронирования при возврате на экран
  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [])
  );

  const loadBookings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        return;
      }

      const response = await axios.get(`${API_URL}/bookings/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setBookings(response.data);
    } catch (error) {
      console.error("Ошибка загрузки бронирований:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async (bookingId: number) => {
    Alert.alert(
      "Отменить бронирование",
      "Вы уверены, что хотите отменить это бронирование?",
      [
        { text: "Нет", style: "cancel" },
        {
          text: "Да",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("auth_token");
              if (!token) {
                return;
              }

              await axios.patch(
                `${API_URL}/bookings/${bookingId}/cancel`,
                {},
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              Alert.alert("Успешно", "Бронирование отменено");
              loadBookings();
            } catch (error) {
              console.error("Ошибка отмены бронирования:", error);
              Alert.alert("Ошибка", "Не удалось отменить бронирование");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const months = [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} г.`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getServiceNames = (booking: Booking) => {
    return booking.selectedServices.map((s) => s.service.name).join(", ");
  };

  const now = new Date();
  const activeBookings = bookings.filter(
    (b) => new Date(b.startTime) > now && b.status !== "cancelled"
  );
  const pastBookings = bookings.filter(
    (b) => new Date(b.startTime) <= now || b.status === "cancelled"
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Шапка с профилем */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <Image
            source={
              user?.photoUrl && !avatarLoadError
                ? { uri: user.photoUrl }
                : require("../../assets/logo.png")
            }
            style={styles.avatar}
            onError={() => setAvatarLoadError(true)}
          />
          <View style={styles.greetingContainer}>
            <Text style={styles.userName}>{user?.name || user?.username || "Пользователь"}</Text>
            <Text style={styles.greeting}>С возвращением!</Text>
          </View>
        </View>
        <View style={styles.iconButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              router.push({
                pathname: "/notifications",
                params: { from: "/history" },
              })
            }
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Основной контент */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D9E57F" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.title}>История пуста</Text>
          <Text style={styles.description}>
            Здесь будет отображаться история Ваших{"\n"}бронирований
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Активные бронирования */}
          {activeBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              <View style={styles.bookingInfo}>
                <Text style={styles.serviceName}>{getServiceNames(booking)}</Text>
                <View style={styles.bookingDetails}>
                  <Text style={styles.bookingDate}>
                    {formatDate(booking.startTime)}
                  </Text>
                  <Text style={styles.bookingTime}>
                    {formatTime(booking.startTime)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => cancelBooking(booking.id)}
              >
                <Ionicons name="trash-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ))}

          {/* Разделитель */}
          {activeBookings.length > 0 && pastBookings.length > 0 && (
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Прошедшие</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {/* Прошедшие бронирования */}
          {pastBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCardPast}>
              <View style={styles.bookingInfo}>
                <Text style={styles.serviceNamePast}>
                  {getServiceNames(booking)}
                </Text>
                <View style={styles.bookingDetails}>
                  <Text style={styles.bookingDatePast}>
                    {formatDate(booking.startTime)}
                  </Text>
                  <Text style={styles.bookingTimePast}>
                    {formatTime(booking.startTime)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
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
    color: "#ffffff",
    marginBottom: 2,
  },
  greeting: {
    fontSize: 14,
    color: "#A0A0A0",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#888",
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#A0A0A0",
    lineHeight: 24,
  },
  bookingCard: {
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingCardPast: {
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    opacity: 0.6,
  },
  bookingInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  serviceNamePast: {
    fontSize: 18,
    fontWeight: "600",
    color: "#888888",
    marginBottom: 8,
  },
  bookingDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bookingDate: {
    fontSize: 14,
    color: "#A0A0A0",
  },
  bookingDatePast: {
    fontSize: 14,
    color: "#666666",
  },
  bookingTime: {
    fontSize: 14,
    color: "#A0A0A0",
    backgroundColor: "#3A3A3C",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingTimePast: {
    fontSize: 14,
    color: "#666666",
    backgroundColor: "#252527",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3A3A3C",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#3A3A3C",
  },
  dividerText: {
    fontSize: 14,
    color: "#888888",
    marginHorizontal: 16,
    fontWeight: "500",
  },
  bottomPadding: {
    height: 100,
  },
});
