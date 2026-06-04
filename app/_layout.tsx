import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CarsProvider } from "./context/CarsContext";
import { BookingProvider } from "./context/BookingContext";
import { useEffect } from "react";
import { useEASUpdates } from "../lib/useEASUpdates";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const onLogin = segments[0] === "login";

    if (isAuthenticated && onLogin) {
      router.replace("/");
    }
  }, [isAuthenticated, segments, loading]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
    </Stack>
  );
}

export default function RootLayout() {
  useEASUpdates();

  return (
    <AuthProvider>
      <CarsProvider>
        <BookingProvider>
          <QueryClientProvider client={queryClient}>
            <RootLayoutNav />
          </QueryClientProvider>
        </BookingProvider>
      </CarsProvider>
    </AuthProvider>
  );
}
