import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Colors from "../../constants/colors";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  
  // Пока уведомления захардкодим, позже можно будет загружать с API
  const notifications: Notification[] = [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (typeof from === "string" && from.length > 0) {
              router.replace(from as any);
              return;
            }
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace("/");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Уведомления</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={80} color="#666666" />
            <Text style={styles.emptyTitle}>Уведомлений пока нет</Text>
            <Text style={styles.emptyDescription}>
              Здесь будут отображаться важные{"\n"}уведомления и напоминания
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.read && styles.notificationCardUnread,
                ]}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name="notifications"
                    size={24}
                    color="#D9E57F"
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.time}
                  </Text>
                </View>
                {!notification.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2C2C2E",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 120,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginTop: 24,
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#A0A0A0",
    textAlign: "center",
    lineHeight: 24,
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#2C2C2E",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  notificationCardUnread: {
    backgroundColor: "#323337",
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3A3B3F",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: "#A0A0A0",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: "#666666",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9E57F",
    marginLeft: 8,
    marginTop: 4,
  },
});
