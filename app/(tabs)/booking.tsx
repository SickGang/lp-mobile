import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCars } from "../context/CarsContext";
import { useBooking } from "../context/BookingContext";
import { useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Calendar, LocaleConfig } from "react-native-calendars";
import * as DeviceCalendar from "expo-calendar";
import axios from "axios";
import { API_URL } from "../../constants/api";
import type { Car } from "../context/CarsContext";

LocaleConfig.locales.ru = {
  monthNames: [
    "Январь",
    "Февраль",
    "Март",
    "Апрель",
    "Май",
    "Июнь",
    "Июль",
    "Август",
    "Сентябрь",
    "Октябрь",
    "Ноябрь",
    "Декабрь",
  ],
  monthNamesShort: [
    "Янв.",
    "Февр.",
    "Март",
    "Апр.",
    "Май",
    "Июнь",
    "Июль",
    "Авг.",
    "Сент.",
    "Окт.",
    "Нояб.",
    "Дек.",
  ],
  dayNames: [
    "Воскресенье",
    "Понедельник",
    "Вторник",
    "Среда",
    "Четверг",
    "Пятница",
    "Суббота",
  ],
  dayNamesShort: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
  today: "Сегодня",
};
LocaleConfig.defaultLocale = "ru";

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

export default function BookingScreen() {
  const router = useRouter();
  const { carId: carIdParam } = useLocalSearchParams<{ carId?: string }>();
  const { isAuthenticated } = useAuth();
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

  const formatDateToYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getTodayDate = () => formatDateToYMD(new Date());

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedTime, setSelectedTime] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());
  const [bookingComment, setBookingComment] = useState("");
  const skipAutoRedirectRef = useRef(false);

  const parseLocalDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const parseLocalDateTime = (dateString: string, timeString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const [hours, minutes] = timeString.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const buildSlotIsoUtc = (dateString: string, timeString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const [hours, minutes] = timeString.split(":").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0)).toISOString();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const getDisplaySlots = useMemo(() => {
    const isToday = selectedDate === getTodayDate();
    if (!isToday) {
      return timeSlots;
    }

    return timeSlots.map((slot) => {
      const slotStart = parseLocalDateTime(selectedDate, slot.startTime);
      const isPastOrStarted = slotStart.getTime() <= nowTimestamp;
      return {
        ...slot,
        available: slot.available && !isPastOrStarted,
      };
    });
  }, [timeSlots, selectedDate, nowTimestamp]);

  const addBookingToDeviceCalendar = async (car: Car) => {
    try {
      const permission = await DeviceCalendar.requestCalendarPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Доступ к календарю запрещен",
          "Вы можете выдать доступ к календарю в настройках устройства."
        );
        return;
      }

      const calendars = await DeviceCalendar.getCalendarsAsync(
        DeviceCalendar.EntityTypes.EVENT
      );
      const writableCalendar = calendars.find((calendar) => calendar.allowsModifications);

      if (!writableCalendar) {
        Alert.alert("Ошибка", "Не удалось найти доступный календарь на устройстве.");
        return;
      }

      const selectedSlot = timeSlots.find((slot) => slot.startTime === selectedTime);
      const startDate = parseLocalDateTime(selectedDate, selectedTime);
      const endDate = selectedSlot
        ? parseLocalDateTime(selectedDate, selectedSlot.endTime)
        : new Date(startDate.getTime() + 60 * 60 * 1000);

      const servicesText = selectedServices.map((service) => service.name).join(", ");
      const carName = [car.brand, car.model].filter(Boolean).join(" ");

      await DeviceCalendar.createEventAsync(writableCalendar.id, {
        title: "Запись в LP Detailing",
        startDate,
        endDate,
        notes: `Автомобиль: ${carName}\nУслуги: ${servicesText}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      Alert.alert("Готово", "Запись добавлена в календарь устройства.");
    } catch (error) {
      console.error("Ошибка добавления в календарь:", error);
      if (Platform.OS === "ios") {
        Alert.alert(
          "Ошибка",
          "Не удалось добавить запись в календарь. Проверьте доступ к календарю в настройках iPhone."
        );
      } else {
        Alert.alert("Ошибка", "Не удалось добавить запись в календарь.");
      }
    }
  };

  // Загружаем слоты при изменении даты
  useEffect(() => {
    loadSlots();
  }, [selectedDate]);

  // При каждом заходе на экран: проверяем авто и либо редиректим, либо сбрасываем форму
  useFocusEffect(
    useCallback(() => {
      // Сбрасываем защитный флаг только когда в booking снова есть выбранные услуги.
      if (selectedServices.length > 0) {
        skipAutoRedirectRef.current = false;
      }

      // Если есть автомобили НО услуги НЕ выбраны - переходим на выбор услуг
      // Если услуги уже выбраны - значит мы в процессе записи, остаемся здесь
      if (
        !loading &&
        cars.length > 0 &&
        selectedServices.length === 0 &&
        !skipAutoRedirectRef.current
      ) {
        setRedirecting(true);
        router.push("/services-selection");
        return;
      }

      // Если дошли сюда - либо нет авто, либо есть авто И выбраны услуги
      setRedirecting(false);
      const today = getTodayDate();
      setSelectedDate(today);
      setSelectedTime("");
      setBookingComment("");
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
        Alert.alert(
          "Требуется вход",
          "Войдите в аккаунт, чтобы подтвердить запись",
          [
            { text: "Отмена", style: "cancel" },
            { text: "Войти", onPress: () => router.push("/login") },
          ],
        );
        return;
      }

      // Для API передаем фиксированное "время слота" в UTC,
      // чтобы на всех клиентах и в админке оставались те же 09:00/11:00 и т.д.
      const startTimeIso = buildSlotIsoUtc(selectedDate, selectedTime);

      // Создаем бронирование
      const response = await axios.post(
        `${API_URL}/bookings`,
        {
          carId: car.id,
          serviceIds: selectedServices.map((s) => s.id),
          startTime: startTimeIso,
          notes: bookingComment.trim() ? bookingComment.trim() : undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      Alert.alert("Заявка принята", "Ваше бронирование в ожидании подтверждения. Добавить напоминание в календарь?", [
        {
          text: "Не добавлять",
          style: "cancel",
          onPress: () => {
            skipAutoRedirectRef.current = true;
            clearBooking();
            router.replace("/history");
          },
        },
        {
          text: "Добавить",
          onPress: () => {
            skipAutoRedirectRef.current = true;
            void addBookingToDeviceCalendar(car).finally(() => {
              clearBooking();
              router.replace("/history");
            });
          },
        },
      ]);
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
    const date = parseLocalDate(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (dateString === getTodayDate()) {
      return "Сегодня";
    } else if (dateString === formatDateToYMD(tomorrow)) {
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
    const date = parseLocalDate(dateString);
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

  // Если автомобилей нет — гость может смотреть услуги; для записи нужен вход
  if (cars.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.emptyState}>
          <Ionicons name="car-sport-outline" size={64} color="#666666" />
          <Text style={styles.emptyTitle}>
            {isAuthenticated
              ? "У вас нет автомобилей"
              : "Запись на услуги"}
          </Text>
          <Text style={styles.emptyDescription}>
            {isAuthenticated
              ? "Добавьте автомобиль или посмотрите каталог услуг"
              : "Посмотрите услуги и цены без регистрации.\nДля записи потребуется вход в аккаунт."}
          </Text>
          <TouchableOpacity
            style={styles.addCarButton}
            onPress={() => router.push("/services-selection")}
          >
            <Ionicons name="pricetags-outline" size={24} color="#17181C" />
            <Text style={styles.addCarButtonText}>Услуги и цены</Text>
          </TouchableOpacity>
          {isAuthenticated ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/cars")}
            >
              <Text style={styles.secondaryButtonText}>Мои автомобили</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.secondaryButtonText}>Войти для записи</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header с профилем */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push("/services-selection")}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Выбор даты</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() =>
              router.push({
                pathname: "/notifications",
                params: { from: "/booking" },
              })
            }
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
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
          ) : getDisplaySlots.length === 0 ? (
            <View style={styles.noSlots}>
              <Ionicons name="close-circle-outline" size={48} color="#666666" />
              <Text style={styles.noSlotsText}>Нет доступных слотов</Text>
              <Text style={styles.noSlotsSubText}>
                Выберите другую дату
              </Text>
            </View>
          ) : (
            <View style={styles.timeSlotsGrid}>
              {getDisplaySlots.map((slot, index) => (
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
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Комментарий: (необязательно)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Например: не трогать вещи, не двигать сидения..."
            placeholderTextColor="#666666"
            multiline
            value={bookingComment}
            onChangeText={setBookingComment}
            maxLength={500}
            textAlignVertical="top"
          />
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
              firstDay={1}
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#17181C",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  headerButtons: {
    flexDirection: "row",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
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
  commentInput: {
    minHeight: 100,
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3A3A3C",
    padding: 14,
    color: "#ffffff",
    fontSize: 15,
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
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: "#D9E57F",
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
