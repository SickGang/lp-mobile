import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Табы живут в группе (tabs), корень приложения — Stack в app/_layout.tsx.
 * Так не переключается тип корневого навигатора после логина (стабильнее в Expo Go).
 */
export default function TabsLayout() {
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
          tabBarLabel: "Записаться",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={24}
              color={color}
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
    bottom: 20,
    left: 20,
    right: 20,
    height: 65,
    backgroundColor: "#1C1C1E",
    borderRadius: 40,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    paddingBottom: 5,
    paddingTop: 5,
    borderWidth: 0,
    borderTopWidth: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
});
