import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCars } from "../context/CarsContext";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar } from "react-native-calendars";
import axios from "axios";
import { API_URL } from "../../constants/api";
import type { Car } from "../context/CarsContext";

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export default function BookingScreen() {
  const router = useRouter();
  const { carId: carIdParam } = useLocalSearchParams<{ carId?: string }>();
  const { user } = useAuth();
  const { cars, selectedCar, loading, selectCar } = useCars();
  const { selectedServices, totalPrice, clearBooking } = useBooking();

  /** Авто с шага услуг передаётся через params; иначе — из контекста (вкладка «Записаться»). */
  const resolveCarForBooking = useMemo((): Car | null => {
    const id = carIdParam ? Number(carIdParam) : NaN;
    if (Number.isFinite(id)) {
      const fromList = cars.find((c) => c.id === id);
      if (fromList) return fromList;
    }
    return selectedCar;
  }, [carIdParam, cars, selectedCar]);

  useEffect(() => {
    const car = resolveCarForBooking;
    if (car && (!selectedCar || selectedCar.id !== car.id)) {
      void selectCar(car);
    }
  }, [resolveCarForBooking, selectedCar, selectCar]);

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  // Загружаем слоты при изменении даты
  useEffect(() => {
    loadSlots();
  }, [selectedDate]);

  // При каждом заходе на экран: проверяем авто и либо редиректим, либо сбрасываем форму
  useFocusEffect(
    useCallback(() => {
      // Если есть автомобили НО услуги НЕ выбраны - переходим на выбор услуг
      // Если услуги уже выбраны - значит мы в процессе записи, остаемся здесь
      if (!loading && cars.length > 0 && selectedServices.length === 0) {
        setRedirecting(true);
        router.push("/services-selection");
        return;
      }

      // Если дошли сюда - либо нет авто, либо есть авто И выбраны услуги
      setRedirecting(false);
      const today = getTodayDate();
      setSelectedDate(today);
      setSelectedTime("");
      loadSlotsForDate(today);
    }, [loading, cars, selectedServices])
  );

  const loadSlotsForDate = async (date: string) => {
    try {
      setLoadingSlots(true);
      const response = await axios.get(`${API_URL}/slots/available`, {
        params: { date },
      });
      setTimeSlots(response.data);
    } catch (error) {
      console.error("Ошибка загрузки слотов:", error);
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadSlots = async () => {
    await loadSlotsForDate(selectedDate);
  };

  const handleBooking = async () => {
    const car = resolveCarForBooking;
    if (!car) {
      Alert.alert(
        "Ошибка",
        "Не выбран автомобиль. Вернитесь к выбору услуг и укажите машину.",
      );
      return;
    }

    if (selectedServices.length === 0) {
      Alert.alert("Ошибка", "Выберите услуги");
      return;
    }

    if (!selectedTime) {
      Alert.alert("Ошибка", "Выберите время");
      return;
    }

    try {
      setCreatingBooking(true);

      // Получаем токен
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Ошибка", "Необходима авторизация");
        router.push("/login");
        return;
      }

      // Создаем дату и время для бронирования
      const startTime = new Date(`${selectedDate}T${selectedTime}:00Z`);

      // Создаем бронирование
      const response = await axios.post(
        `${API_URL}/bookings`,
        {
          carId: car.id,
          serviceIds: selectedServices.map((s) => s.id),
          startTime: startTime.toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert(
        "Успешно!",
        "Ваше бронирование подтверждено",
        [
          {
            text: "OK",
            onPress: () => {
              clearBooking();
              router.push("/history");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Ошибка создания бронирования:", error);
      if (axios.isAxiosError(error)) {
        Alert.alert(
          "Ошибка",
          error.response?.data?.message || "Не удалось создать бронирование"
        );
      } else {
        Alert.alert("Ошибка", "Не удалось создать бронирование");
      }
    } finally {
      setCreatingBooking(false);
    }
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    setSelectedTime("");
    setCalendarVisible(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === getTodayDate()) {
      return "Сегодня";
    } else if (dateString === tomorrow.toISOString().split("T")[0]) {
      return "Завтра";
    } else {
      return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        weekday: "short",
      });
    }
  };

  const getFullDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Показываем loading во время загрузки или редиректа
  if (loading || redirecting) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#D9E57F" />
          <Text style={styles.loadingText}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Если автомобилей нет - показываем empty state
  if (cars.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyState}>
          <Ionicons name="car-sport-outline" size={64} color="#666666" />
          <Text style={styles.emptyTitle}>У вас нет автомобилей</Text>
          <Text style={styles.emptyDescription}>
            Добавьте автомобиль, чтобы продолжить
          </Text>
          <TouchableOpacity
            style={styles.addCarButton}
            onPress={() => router.push("/cars")}
          >
            <Ionicons name="car-sport-outline" size={24} color="#17181C" />
            <Text style={styles.addCarButtonText}>Мои автомобили</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header с профилем */}
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="#ffffff" />
          </View>
          <View style={styles.greetingContainer}>
            <Text style={styles.userName}>{user?.name || user?.username || "Пользователь"}</Text>
            <Text style={styles.greeting}>С возвращением!</Text>
          </View>
        </View>
        <View style={styles.iconButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.mainTitle}>Записаться</Text>

        {/* Выберите дату */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Выберите дату</Text>
          <TouchableOpacity
            style={styles.dateCard}
            onPress={() => setCalendarVisible(true)}
          >
            <View>
              <Text style={styles.dateLabel}>{formatDate(selectedDate)}</Text>
              <Text style={styles.dateSubLabel}>{getFullDate(selectedDate)}</Text>
            </View>
            <Ionicons name="calendar-outline" size={28} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Выберите время */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Выберите время</Text>
          {loadingSlots ? (
            <View style={styles.loadingSlots}>
              <ActivityIndicator size="large" color="#D9E57F" />
              <Text style={styles.loadingText}>Загрузка слотов...</Text>
            </View>
          ) : timeSlots.length === 0 ? (
            <View style={styles.noSlots}>
              <Ionicons name="close-circle-outline" size={48} color="#666666" />
              <Text style={styles.noSlotsText}>Нет доступных слотов</Text>
              <Text style={styles.noSlotsSubText}>
                Выберите другую дату
              </Text>
            </View>
          ) : (
            <View style={styles.timeSlotsGrid}>
              {timeSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.timeSlot,
                    !slot.available && styles.timeSlotUnavailable,
                    selectedTime === slot.startTime && styles.timeSlotSelected,
                  ]}
                  disabled={!slot.available}
                  onPress={() => setSelectedTime(slot.startTime)}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      !slot.available && styles.timeSlotTextUnavailable,
                      selectedTime === slot.startTime && styles.timeSlotTextSelected,
                    ]}
                  >
                    {slot.startTime}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Кнопка подтверждения */}
        {selectedTime && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={handleBooking}
              disabled={creatingBooking}
            >
              {creatingBooking ? (
                <ActivityIndicator size="small" color="#17181C" />
              ) : (
                <Text style={styles.bookButtonText}>Подтвердить запись</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

      <View style={styles.bottomPadding} />

      {/* Модальное окно с полным календарем */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите дату</Text>
              <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Calendar
              minDate={getTodayDate()}
              current={selectedDate}
              onDayPress={handleDayPress}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: "#D9E57F",
                },
              }}
              theme={{
                backgroundColor: "#2C2C2E",
                calendarBackground: "#2C2C2E",
                textSectionTitleColor: "#ffffff",
                selectedDayBackgroundColor: "#D9E57F",
                selectedDayTextColor: "#17181C",
                todayTextColor: "#D9E57F",
                dayTextColor: "#ffffff",
                textDisabledColor: "#666666",
                dotColor: "#D9E57F",
                selectedDotColor: "#17181C",
                arrowColor: "#ffffff",
                monthTextColor: "#ffffff",
                indicatorColor: "#D9E57F",
                textDayFontWeight: "500",
                textMonthFontWeight: "600",
                textDayHeaderFontWeight: "600",
                textDayFontSize: 16,
                textMonthFontSize: 18,
                textDayHeaderFontSize: 14,
              }}
            />
          </View>
        </View>
      </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#17181C",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3A3A3C",
    justifyContent: "center",
    alignItems: "center",
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
    color: "#999999",
  },
  iconButtons: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: "#ffffff",
    marginBottom: 12,
  },
  dateCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#2C2C2E",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateLabel: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  dateSubLabel: {
    fontSize: 14,
    color: "#999999",
  },
  loadingSlots: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#999999",
  },
  noSlots: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    padding: 32,
  },
  noSlotsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  noSlotsSubText: {
    fontSize: 14,
    color: "#999999",
  },
  timeSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  timeSlot: {
    width: "30.5%",
    backgroundColor: "#2C2C2E",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  timeSlotSelected: {
    backgroundColor: "#2C2C2E",
    borderColor: "#D9E57F",
    borderWidth: 2,
  },
  timeSlotUnavailable: {
    backgroundColor: "#2C2C2E",
    opacity: 0.5,
  },
  timeSlotText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  timeSlotTextSelected: {
    color: "#D9E57F",
  },
  timeSlotTextUnavailable: {
    color: "#666666",
    textDecorationLine: "line-through",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#2C2C2E",
    borderRadius: 20,
    width: "90%",
    maxWidth: 400,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A3C",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  emptyDescription: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  addCarButton: {
    backgroundColor: "#D9E57F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addCarButtonText: {
    color: "#17181C",
    fontSize: 16,
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: "#D9E57F",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bookButtonText: {
    color: "#17181C",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
});
