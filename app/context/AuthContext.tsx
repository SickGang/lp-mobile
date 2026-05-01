import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL } from "../../constants/api";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import * as Device from "expo-device";

interface User {
  id: number;
  phone?: string;
  name?: string;
  username?: string;
  photoUrl?: string | null;
}

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, user?: User) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const PUSH_TOKEN_STORAGE_KEY = "expo_push_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const registerPushToken = async (authToken: string) => {
    if (Platform.OS === "web") {
      return;
    }

    try {
      if (!Device.isDevice) {
        return;
      }

      const permissions = await Notifications.getPermissionsAsync();
      let finalStatus = permissions.status;
      if (finalStatus !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }

      if (finalStatus !== "granted") {
        return;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn("EAS projectId is missing, skip push token registration");
        return;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const expoPushToken = tokenResponse.data;
      if (!expoPushToken) {
        return;
      }

      await axios.post(
        `${API_URL}/push-tokens`,
        {
          token: expoPushToken,
          platform: Platform.OS,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes("aps-environment")) {
        console.warn("Push entitlement is missing for this iOS build profile.");
        return;
      }

      console.warn("Error registering push token:", message);
    }
  };

  const checkAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem("auth_token");
      const savedUser = await AsyncStorage.getItem("user_data");
      
      if (savedToken) {
        setToken(savedToken);
        setIsAuthenticated(true);
        void registerPushToken(savedToken);

        if (savedUser) {
          const parsedUser = JSON.parse(savedUser) as User;
          setUser(parsedUser);

          // Обновляем профиль с бэка, чтобы подтянуть актуальный photoUrl.
          try {
            const meResponse = await axios.get(`${API_URL}/users/me`, {
              headers: {
                Authorization: `Bearer ${savedToken}`,
              },
            });

            const me = meResponse.data as {
              id: number;
              phone?: string | null;
              name?: string | null;
              username?: string | null;
              photoUrl?: string | null;
            };

            const refreshedUser: User = {
              id: me.id,
              phone: me.phone ?? undefined,
              name: me.name ?? undefined,
              username: me.username ?? undefined,
              photoUrl: me.photoUrl ?? null,
            };

            await AsyncStorage.setItem("user_data", JSON.stringify(refreshedUser));
            setUser(refreshedUser);
          } catch (refreshError) {
            console.error("Error refreshing user profile:", refreshError);
          }
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (newToken: string, userData?: User) => {
    try {
      await AsyncStorage.setItem("auth_token", newToken);
      setToken(newToken);
      setIsAuthenticated(true);

      void registerPushToken(newToken);
      
      if (userData) {
        await AsyncStorage.setItem("user_data", JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      console.error("Error saving token:", error);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        const savedPushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
        await axios.delete(`${API_URL}/push-tokens/me`, {
          data: {
            token: savedPushToken || undefined,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      await AsyncStorage.removeItem("auth_token");
      await AsyncStorage.removeItem("user_data");
      await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error removing token:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, token, user, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
