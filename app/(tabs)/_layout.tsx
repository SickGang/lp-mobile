import { Tabs, useSegments } from "expo-router";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";

/**
 * Табы живут в группе (tabs), корень приложения — Stack в app/_layout.tsx.
 * Так не переключается тип корневого навигатора после логина (стабильнее в Expo Go).
 */
export default function TabsLayout() {
  const segments = useSegments();
  const current = segments[segments.length - 1];
  const bookingFlowActive = current === "booking" || current === "services-selection";

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#D9E57F",
        tabBarInactiveTintColor: "#FFFFFF",
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: {
          backgroundColor: "#ffffff",
        },
        headerTintColor: "#000000",
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerTitleAlign: "center",
      }}
    >
      <Tabs.Screen
        name="services-selection"
        options={{
          href: null,
          title: "Выбор услуг",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Уведомления",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="cars"
        options={{
          href: null,
          title: "Мои автомобили",
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          headerShown: false,
          tabBarLabel: "Главная",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: "Записаться",
          headerShown: false,
          tabBarLabel: ({ focused }) => (
            <Text
              style={[
                styles.tabBarLabel,
                { color: focused || bookingFlowActive ? "#D9E57F" : "#FFFFFF" },
              ]}
            >
              Записаться
            </Text>
          ),
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused || bookingFlowActive ? "calendar" : "calendar-outline"}
              size={24}
              color={focused || bookingFlowActive ? "#D9E57F" : "#FFFFFF"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "История",
          headerShown: false,
          tabBarLabel: "История",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Профиль",
          headerShown: false,
          tabBarLabel: "Профиль",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    marginHorizontal: 32,
    bottom: 26,
    height: 72,
    backgroundColor: "rgba(22, 24, 29, 0.72)",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
