import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { Alert } from "react-native";
import { useAuth } from "./AuthContext";

import { API_URL } from "../../constants/api";

export interface Car {
  id: number;
  brand: string;
  model: string;
  licensePlate: string | null;
  hasNoPlate: boolean;
  userId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCarInput {
  brand: string;
  model: string;
  hasNoPlate: boolean;
  licensePlate?: string;
}

interface CarsContextType {
  cars: Car[];
  selectedCar: Car | null;
  selectCar: (car: Car) => void;
  addCar: (car: CreateCarInput) => Promise<boolean>;
  removeCar: (id: number) => Promise<void>;
  loadCars: () => Promise<void>;
  loading: boolean;
}

const CarsContext = createContext<CarsContextType | undefined>(undefined);

export function CarsProvider({ children }: { children: React.ReactNode }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadCars();
    loadSelectedCar();
  }, []);

  // Reload cars when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      loadCars();
    } else {
      // Clear cars when logged out
      setCars([]);
      setSelectedCar(null);
      AsyncStorage.removeItem("selectedCar");
    }
  }, [isAuthenticated]);

  const loadCars = async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        setCars([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/cars`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCars(response.data);
    } catch (error) {
      console.error("Error loading cars:", error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        // Токен недействителен
        await AsyncStorage.removeItem("auth_token");
        setCars([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedCar = async () => {
    try {
      const saved = await AsyncStorage.getItem("selectedCar");
      if (saved) {
        const parsedCar = JSON.parse(saved) as Car;
        // Не перетираем выбор, который пользователь только что сделал в текущей сессии.
        setSelectedCar((current) => current ?? parsedCar);
      }
    } catch (error) {
      console.error("Error loading selected car:", error);
    }
  };

  const addCar = async (carData: CreateCarInput): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Ошибка", "Необходима авторизация");
        return false;
      }

      const response = await axios.post(`${API_URL}/cars`, carData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const newCar = response.data;
      setCars([...cars, newCar]);
      Alert.alert("Успех", "Автомобиль добавлен!");
      return true;
    } catch (error) {
      console.error("Error adding car:", error);
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message || "Не удалось добавить автомобиль";
        Alert.alert("Ошибка", message);
      } else {
        Alert.alert("Ошибка", "Не удалось добавить автомобиль");
      }
      return false;
    }
  };

  const removeCar = async (id: number) => {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (!token) {
        Alert.alert("Ошибка", "Необходима авторизация");
        return;
      }

      await axios.delete(`${API_URL}/cars/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const newCars = cars.filter((car) => car.id !== id);
      setCars(newCars);

      // Если удаляем выбранный автомобиль, сбрасываем выбор
      if (selectedCar?.id === id) {
        setSelectedCar(null);
        await AsyncStorage.removeItem("selectedCar");
      }

      Alert.alert("Успех", "Автомобиль удален!");
    } catch (error) {
      console.error("Error removing car:", error);
      Alert.alert("Ошибка", "Не удалось удалить автомобиль");
    }
  };

  const selectCar = async (car: Car) => {
    setSelectedCar(car);
    await AsyncStorage.setItem("selectedCar", JSON.stringify(car));
  };

  return (
    <CarsContext.Provider
      value={{
        cars,
        selectedCar,
        selectCar,
        addCar,
        removeCar,
        loadCars,
        loading,
      }}
    >
      {children}
    </CarsContext.Provider>
  );
}

export function useCars() {
  const context = useContext(CarsContext);
  if (context === undefined) {
    throw new Error("useCars must be used within a CarsProvider");
  }
  return context;
}

