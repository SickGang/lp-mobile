import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { useCars } from "../context/CarsContext";
import { useBooking } from "../context/BookingContext";
import axios from "axios";
import { useCallback } from "react";
import { API_URL } from "../../constants/api";

interface Service {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
  selected: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  expanded: boolean;
  services: Service[];
}

interface ServiceCategoryRow {
  id: number;
  name: string;
  servicesCount?: number;
}

/** Одна нейтральная иконка для любой категории — названия только из БД. */
const CATEGORY_LIST_ICON = "pricetag-outline" as const;

export default function ServicesSelectionScreen() {
  const router = useRouter();
  const { selectedCar, cars, selectCar } = useCars();
  const { setSelectedServices } = useBooking();
  const [loading, setLoading] = useState(true);
  const [carModalVisible, setCarModalVisible] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);

  // Загружаем услуги из API при монтировании
  useEffect(() => {
    loadServices();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setCategories((prev) =>
        prev.map((cat) => ({
          ...cat,
          services: cat.services.map((service) => ({ ...service, selected: false })),
        })),
      );
      setSelectedServices([]);
    }, [setSelectedServices]),
  );

  const loadServices = async () => {
    try {
      setLoading(true);
      const [categoriesResponse, servicesResponse] = await Promise.all([
        axios.get<ServiceCategoryRow[]>(`${API_URL}/services/categories`),
        axios.get<any[]>(`${API_URL}/services`),
      ]);

      const dbCategories: ServiceCategoryRow[] = Array.isArray(categoriesResponse.data)
        ? categoriesResponse.data
        : [];

      const rows = Array.isArray(servicesResponse.data) ? servicesResponse.data : [];
      const byCategoryName = new Map<string, Service[]>();
      for (const s of rows) {
        const catName = s?.category;
        if (typeof catName !== "string" || !catName) continue;
        const svc: Service = {
          id: s.id,
          name: s.name,
          price: typeof s.price === "number" ? s.price / 100 : 0,
          category: catName,
          description: s.description ?? "",
          selected: false,
        };
        const list = byCategoryName.get(catName) ?? [];
        list.push(svc);
        byCategoryName.set(catName, list);
      }

      const cats: Category[] = dbCategories
        .map((c) => ({
          id: String(c.id),
          name: c.name,
          icon: CATEGORY_LIST_ICON,
          expanded: false,
          services: byCategoryName.get(c.name) ?? [],
        }))
        .filter((cat) => cat.services.length > 0);

      setCategories(cats);
    } catch (error) {
      console.error("Ошибка загрузки услуг:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId ? { ...cat, expanded: !cat.expanded } : cat
      )
    );
  };

  const toggleService = (categoryId: string, serviceId: number) => {
    setCategories(
      categories.map((cat) =>
        cat.id === categoryId
          ? {
              ...cat,
              services: cat.services.map((service) =>
                service.id === serviceId
                  ? { ...service, selected: !service.selected }
                  : service
              ),
            }
          : cat
      )
    );
  };

  const getSelectedServices = () => {
    const selected: Service[] = [];
    categories.forEach((cat) => {
      cat.services.forEach((service) => {
        if (service.selected) {
          selected.push(service);
        }
      });
    });
    return selected;
  };

  const getTotalPrice = () => {
    return getSelectedServices().reduce(
      (sum, service) => sum + service.price,
      0
    );
  };

  const handleContinue = () => {
    const selected = getSelectedServices();
    if (selected.length === 0) {
      return;
    }
    if (!selectedCar) {
      Alert.alert("Ошибка", "Выберите автомобиль (нажмите на блок с номером выше)");
      return;
    }
    setSelectedServices(
      selected.map(({ id, name, price, selected: sel }) => ({
        id,
        name,
        price,
        selected: sel,
      })),
    );
    router.push({
      pathname: "/booking",
      params: { carId: String(selectedCar.id) },
    });
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleBackPress}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Выбор услуг</Text>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              router.push({
                pathname: "/notifications",
                params: { from: "/services-selection" },
              })
            }
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Информация о выбранном автомобиле */}
      <TouchableOpacity
        style={styles.carInfo}
        onPress={() => setCarModalVisible(true)}
      >
        <Ionicons name="car-sport" size={24} color="#ffffff" />
        <Text style={styles.carInfoText}>
          {selectedCar?.licensePlate || "Выберите автомобиль"}
        </Text>
        <Ionicons name="chevron-down" size={24} color="#ffffff" />
      </TouchableOpacity>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>Выберите услугу</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D9E57F" />
            <Text style={styles.loadingText}>Загрузка услуг...</Text>
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyTitle}>Нет услуг</Text>
            <Text style={styles.emptySubtitle}>
              Добавьте категории и услуги в админ-панели — здесь появятся только активные
              записи из базы.
            </Text>
          </View>
        ) : (
          <>
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category.id)}
            >
              <View style={styles.categoryTitleContainer}>
                <Ionicons
                  name={category.icon as any}
                  size={28}
                  color="#ffffff"
                />
                <Text style={styles.categoryTitle}>{category.name}</Text>
              </View>
              <Ionicons
                name={category.expanded ? "chevron-up" : "chevron-down"}
                size={28}
                color="#ffffff"
              />
            </TouchableOpacity>

            {category.expanded && (
              <View style={styles.servicesContainer}>
                {category.services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceItem}
                    onPress={() => toggleService(category.id, service.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        service.selected && styles.checkboxSelected,
                      ]}
                    />
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.servicePrice}>{service.price} руб.</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Итоговая панель */}
      {getSelectedServices().length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Итого:</Text>
            <Text style={styles.totalPrice}>{getTotalPrice()} ₽</Text>
          </View>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Продолжить</Text>
            <Ionicons name="arrow-forward" size={20} color="#17181C" />
          </TouchableOpacity>
        </View>
      )}

      {/* Модальное окно выбора автомобиля */}
      <Modal
        visible={carModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите автомобиль</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setCarModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {cars.length === 0 ? (
                <View style={styles.emptyCarList}>
                  <Text style={styles.emptyCarListText}>
                    У вас пока нет автомобилей
                  </Text>
                </View>
              ) : (
                cars.map((car) => (
                  <TouchableOpacity
                    key={car.id}
                    style={[
                      styles.carItem,
                      selectedCar?.id === car.id && styles.carItemSelected,
                    ]}
                    onPress={async () => {
                      await selectCar(car);
                      setCarModalVisible(false);
                    }}
                  >
                    <View style={styles.carItemInfo}>
                      <Ionicons name="car-sport" size={24} color="#ffffff" />
                      <View style={styles.carItemDetails}>
                        <Text style={styles.carItemPlate}>{car.licensePlate}</Text>
                        <Text style={styles.carItemModel}>
                          {car.brand} {car.model}
                        </Text>
                      </View>
                    </View>
                    {selectedCar?.id === car.id && (
                      <Ionicons name="checkmark-circle" size={24} color="#D9E57F" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.addCarButton}
              onPress={() => {
                setCarModalVisible(false);
                router.push({
                  pathname: "/cars",
                  params: { from: "/services-selection" },
                });
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#D9E57F" />
              <Text style={styles.addCarButtonText}>Добавить автомобиль</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
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
    gap: 12,
  },
  carInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  carInfoText: {
    flex: 1,
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#888",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#A0A0A0",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: "#ffffff",
    padding: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  categoryCard: {
    backgroundColor: "#2C2C2E",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  categoryTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  servicesContainer: {
    borderTopWidth: 1,
    borderTopColor: "#3A3A3C",
    paddingVertical: 4,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingLeft: 20,
    gap: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#D9E57F",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#D9E57F",
    borderColor: "#D9E57F",
  },
  serviceInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceName: {
    fontSize: 16,
    color: "#ffffff",
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  footer: {
    backgroundColor: "#2C2C2E",
    borderTopWidth: 1,
    borderTopColor: "#3A3A3C",
    padding: 16,
    paddingBottom: 100,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  continueButton: {
    backgroundColor: "#D9E57F",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    color: "#17181C",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#2C2C2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A3C",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3A3A3C",
    justifyContent: "center",
    alignItems: "center",
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyCarList: {
    padding: 32,
    alignItems: "center",
  },
  emptyCarListText: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
  },
  carItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3A3A3C",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  carItemSelected: {
    backgroundColor: "#4A4A4C",
    borderWidth: 2,
    borderColor: "#D9E57F",
  },
  carItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  carItemDetails: {
    marginLeft: 12,
    flex: 1,
  },
  carItemPlate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  carItemModel: {
    fontSize: 14,
    color: "#A0A0A0",
  },
  addCarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    backgroundColor: "#3A3A3C",
    borderRadius: 16,
    gap: 8,
  },
  addCarButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#D9E57F",
  },
});
