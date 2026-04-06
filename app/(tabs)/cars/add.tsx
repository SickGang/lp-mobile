import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useCars } from "../../context/CarsContext";
import { useRouter } from "expo-router";

interface CarModel {
  id: string;
  mark_id: string;
  name: string;
  cyrillic_name: string;
  year_from: number;
  year_to: number;
  class: string;
}

interface CarBrand {
  id: string;
  name: string;
  cyrillic_name: string;
  numeric_id: number;
  year_from: number;
  year_to: number;
  popular: number;
  country: string;
  models: CarModel[];
}

type ListPicker = "none" | "brand" | "model";

export default function AddCarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCar } = useCars();

  const [listPicker, setListPicker] = useState<ListPicker>("none");
  const [brand, setBrand] = useState("");
  const [brandId, setBrandId] = useState("");
  const [model, setModel] = useState("");
  const [modelId, setModelId] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [searchBrand, setSearchBrand] = useState("");
  const [searchModel, setSearchModel] = useState("");

  const [carData, setCarData] = useState<CarBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCarData();
  }, []);

  const loadCarData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("https://api.cars-base.ru/full");
      setCarData(response.data.data || []);
    } catch (error) {
      console.error("Error loading car data:", error);
      Alert.alert(
        "Ошибка",
        "Не удалось загрузить данные автомобилей. Проверьте подключение к интернету.",
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = carData.filter((b) =>
    b.name.toLowerCase().includes(searchBrand.toLowerCase()),
  );

  const selectedBrandData = carData.find((b) => b.id === brandId);
  const availableModels = selectedBrandData?.models || [];

  const filteredModels = availableModels.filter((m) =>
    m.name.toLowerCase().includes(searchModel.toLowerCase()),
  );

  const formatLicensePlate = (text: string) => {
    const validLetters = "АВЕКМНОРСТУХ";
    let cleaned = text.toUpperCase().replace(/[^А-ЯA-Z0-9]/g, "");

    const latinToCyrillic: { [key: string]: string } = {
      A: "А",
      B: "В",
      E: "Е",
      K: "К",
      M: "М",
      H: "Н",
      O: "О",
      P: "Р",
      C: "С",
      T: "Т",
      Y: "У",
      X: "Х",
    };

    cleaned = cleaned
      .split("")
      .map((char) => latinToCyrillic[char] || char)
      .join("");

    let formatted = "";
    let letterCount = 0;
    let digitCount = 0;

    for (let i = 0; i < cleaned.length && formatted.length < 12; i++) {
      const char = cleaned[i];
      const isDigit = /[0-9]/.test(char);
      const isLetter = validLetters.includes(char);

      if (formatted.length === 0) {
        if (isLetter) {
          formatted += char;
          letterCount++;
        }
      } else if (formatted.length >= 1 && formatted.length <= 3) {
        if (isDigit && digitCount < 3) {
          formatted += char;
          digitCount++;
        }
      } else if (formatted.length === 4) {
        if (isLetter && letterCount < 2) {
          formatted += char;
          letterCount++;
        }
      } else if (formatted.length === 5) {
        if (isLetter && letterCount < 3) {
          formatted += char;
          letterCount++;
        }
      } else if (formatted.length >= 6) {
        if (isDigit && formatted.length < 9) {
          formatted += char;
        }
      }
    }

    return formatted;
  };

  const handleLicensePlateChange = (text: string) => {
    setLicensePlate(formatLicensePlate(text));
  };

  const handleBrandSelect = (selectedBrand: CarBrand) => {
    setBrand(selectedBrand.name);
    setBrandId(selectedBrand.id);
    setModel("");
    setModelId("");
    setListPicker("none");
    setSearchBrand("");
  };

  const handleModelSelect = (selectedModel: CarModel) => {
    setModel(selectedModel.name);
    setModelId(selectedModel.id);
    setListPicker("none");
    setSearchModel("");
  };

  const handleAddCar = async () => {
    if (!brand.trim()) {
      Alert.alert("Ошибка", "Выберите марку автомобиля");
      return;
    }
    if (!model.trim()) {
      Alert.alert("Ошибка", "Выберите модель автомобиля");
      return;
    }
    if (!licensePlate.trim()) {
      Alert.alert("Ошибка", "Введите гос. номер");
      return;
    }
    if (licensePlate.length < 8) {
      Alert.alert("Ошибка", "Введите полный гос. номер (например: А123ВС77)");
      return;
    }

    const newCar = {
      brand: brand.trim(),
      model: model.trim(),
      licensePlate: licensePlate.trim(),
    };

    const success = await addCar(newCar);
    if (success) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/cars");
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={["top"]}>
        <ActivityIndicator size="large" color="#D9E57F" />
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/cars");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Добавить автомобиль</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(120, insets.bottom + 80) },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Марка автомобиля</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setListPicker("brand")}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                style={brand ? styles.selectButtonTextFilled : styles.selectButtonText}
              >
                {brand || "Выберите марку"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#999999" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Модель</Text>
            <TouchableOpacity
              style={[styles.selectButton, !brandId && styles.selectButtonDisabled]}
              onPress={() => {
                if (brandId) {
                  setListPicker("model");
                } else {
                  Alert.alert("Внимание", "Сначала выберите марку автомобиля");
                }
              }}
              disabled={!brandId}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text
                style={model ? styles.selectButtonTextFilled : styles.selectButtonText}
              >
                {model || "Выберите модель"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={20}
                color={brandId ? "#999999" : "#666666"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Гос. номер</Text>
            <TextInput
              style={styles.input}
              placeholder="А123ВС77"
              value={licensePlate}
              onChangeText={handleLicensePlateChange}
              autoCapitalize="characters"
              placeholderTextColor="#666666"
              maxLength={9}
            />
            <Text style={styles.hint}>Формат: А123ВС77 или А123ВС777</Text>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleAddCar}>
            <Text style={styles.submitButtonText}>Добавить</Text>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={listPicker === "brand"}
        onRequestClose={() => {
          setListPicker("none");
          setSearchBrand("");
        }}
        hardwareAccelerated
      >
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите марку</Text>
              <TouchableOpacity
                onPress={() => {
                  setListPicker("none");
                  setSearchBrand("");
                }}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#999999"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Поиск марки..."
                value={searchBrand}
                onChangeText={setSearchBrand}
                placeholderTextColor="#666666"
              />
              {searchBrand.length > 0 && (
                <TouchableOpacity onPress={() => setSearchBrand("")}>
                  <Ionicons name="close-circle" size={20} color="#999999" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredBrands}
              keyExtractor={(item) => item.id}
              style={styles.brandsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.brandItem, brandId === item.id && styles.brandItemActive]}
                  onPress={() => handleBrandSelect(item)}
                >
                  <Text
                    style={[
                      styles.brandItemText,
                      brandId === item.id && styles.brandItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {brandId === item.id && (
                    <Ionicons name="checkmark" size={24} color="#17181C" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>Марка не найдена</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={listPicker === "model"}
        onRequestClose={() => {
          setListPicker("none");
          setSearchModel("");
        }}
        hardwareAccelerated
      >
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выберите модель</Text>
              <TouchableOpacity
                onPress={() => {
                  setListPicker("none");
                  setSearchModel("");
                }}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#999999"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Поиск модели..."
                value={searchModel}
                onChangeText={setSearchModel}
                placeholderTextColor="#666666"
              />
              {searchModel.length > 0 && (
                <TouchableOpacity onPress={() => setSearchModel("")}>
                  <Ionicons name="close-circle" size={20} color="#999999" />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredModels}
              keyExtractor={(item) => item.id}
              style={styles.brandsList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.brandItem, modelId === item.id && styles.brandItemActive]}
                  onPress={() => handleModelSelect(item)}
                >
                  <Text
                    style={[
                      styles.brandItemText,
                      modelId === item.id && styles.brandItemTextActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {modelId === item.id && (
                    <Ionicons name="checkmark" size={24} color="#17181C" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptySearch}>
                  <Text style={styles.emptySearchText}>
                    {availableModels.length === 0 ? "Нет доступных моделей" : "Модель не найдена"}
                  </Text>
                </View>
              }
            />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#17181C",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999999",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A3C",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#3A3A3C",
    borderWidth: 2,
    borderColor: "#48484A",
    borderRadius: 12,
    padding: 16,
    minHeight: 56,
  },
  selectButtonText: {
    fontSize: 16,
    color: "#999999",
  },
  selectButtonTextFilled: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
  },
  selectButtonDisabled: {
    opacity: 0.5,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#3A3A3C",
    borderWidth: 2,
    borderColor: "#48484A",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#ffffff",
  },
  hint: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#D9E57F",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#17181C",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomPadding: {
    height: 40,
  },
  selectModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  selectModalContent: {
    backgroundColor: "#2C2C2E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3A3A3C",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#48484A",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#ffffff",
  },
  brandsList: {
    flex: 1,
  },
  brandItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3A3A3C",
  },
  brandItemActive: {
    backgroundColor: "#D9E57F",
  },
  brandItemText: {
    fontSize: 16,
    color: "#ffffff",
  },
  brandItemTextActive: {
    color: "#17181C",
    fontWeight: "600",
  },
  emptySearch: {
    padding: 40,
    alignItems: "center",
  },
  emptySearchText: {
    fontSize: 16,
    color: "#999999",
  },
});
