import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCars } from "../../context/CarsContext";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function CarsListScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { cars, selectedCar, selectCar, removeCar } = useCars();

  const getCarPlateLabel = (car: { hasNoPlate: boolean; licensePlate: string | null }) =>
    car.hasNoPlate || !car.licensePlate ? "Без номера" : car.licensePlate;

  const handleDeleteCar = (id: number) => {
    Alert.alert(
      "Удалить автомобиль?",
      "Вы уверены, что хотите удалить этот автомобиль?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => removeCar(id),
        },
      ],
    );
  };

  const handleBackPress = () => {
    if (typeof from === "string" && from.length > 0) {
      router.replace(from as any);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/profile");
  };

  const swipeBackResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) =>
      gestureState.dx > 14 &&
      Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2,
    onPanResponderRelease: (_, gestureState) => {
      const isRightSwipe = gestureState.dx > 80 && gestureState.vx > 0;
      if (isRightSwipe) {
        handleBackPress();
      }
    },
  });

  return (
    <SafeAreaView
      style={styles.container}
      edges={["top"]}
      {...swipeBackResponder.panHandlers}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Мои автомобили</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {cars.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={64} color="#666666" />
            <Text style={styles.emptyTitle}>Нет автомобилей</Text>
            <Text style={styles.emptyDescription}>
              Добавьте свой первый автомобиль, чтобы начать пользоваться сервисом
            </Text>
          </View>
        ) : (
          <View style={styles.carsList}>
            {cars.map((car) => (
              <View key={car.id} style={styles.carCardWrapper}>
                <TouchableOpacity
                  style={[
                    styles.carCard,
                    selectedCar?.id === car.id && styles.carCardSelected,
                  ]}
                  onPress={() => {
                    selectCar(car);
                  }}
                >
                  <View style={styles.carIcon}>
                    <Ionicons name="car-sport" size={32} color="#ffffff" />
                  </View>
                  <View style={styles.carInfo}>
                    <Text style={styles.carBrand}>{car.brand}</Text>
                    <Text style={styles.carModel}>{car.model}</Text>
                    <Text style={styles.carPlate}>{getCarPlateLabel(car)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteIconButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeleteCar(car.id);
                    }}
                  >
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: "/cars/add",
              params: { from: typeof from === "string" ? from : "/cars" },
            })
          }
        >
          <Ionicons name="add-circle-outline" size={24} color="#D9E57F" />
          <Text style={styles.addButtonText}>Добавить автомобиль</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    marginTop: 100,
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
  },
  carsList: {
    padding: 16,
  },
  carCardWrapper: {
    marginBottom: 12,
  },
  carCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  carCardSelected: {
    borderWidth: 2,
    borderColor: "#D9E57F",
  },
  carIcon: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: "#3A3A3C",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  carInfo: {
    flex: 1,
  },
  carBrand: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  carModel: {
    fontSize: 16,
    color: "#999999",
    marginBottom: 4,
  },
  carPlate: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  deleteIconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "#2C2C2E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    padding: 18,
    borderRadius: 16,
    gap: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 100,
  },
});
