import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL } from "../../constants/api";
import { isInvalidAuthError } from "../../lib/authSession";
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

  const clearLocalSession = useCallback(async () => {
    await AsyncStorage.multiRemove([
      "auth_token",
      "user_data",
      PUSH_TOKEN_STORAGE_KEY,
    ]);
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  }, []);

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
      if (!savedToken) {
        return;
      }

      const savedUserRaw = await AsyncStorage.getItem("user_data");
      let cachedUser: User | null = null;
      if (savedUserRaw) {
        try {
          cachedUser = JSON.parse(savedUserRaw) as User;
        } catch {
          await AsyncStorage.removeItem("user_data");
        }
      }

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

        setToken(savedToken);
        setIsAuthenticated(true);
        setUser(refreshedUser);
        await AsyncStorage.setItem("user_data", JSON.stringify(refreshedUser));
        void registerPushToken(savedToken);
      } catch (error) {
        if (isInvalidAuthError(error)) {
          await clearLocalSession();
          return;
        }

        console.warn("Could not verify session, using cached profile:", error);

        if (cachedUser) {
          setToken(savedToken);
          setIsAuthenticated(true);
          setUser(cachedUser);
        } else {
          await clearLocalSession();
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
    const authToken = token ?? (await AsyncStorage.getItem("auth_token"));

    try {
      if (authToken) {
        const savedPushToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
        await axios.delete(`${API_URL}/push-tokens/me`, {
          data: {
            token: savedPushToken || undefined,
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
      }
    } catch (error) {
      // Сессия могла уже быть недействительной — локальный выход всё равно выполняем.
      if (!isInvalidAuthError(error)) {
        console.warn("Push token cleanup failed during logout:", error);
      }
    } finally {
      await clearLocalSession();
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
