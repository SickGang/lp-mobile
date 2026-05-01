import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import Colors from "../constants/colors";
import MaskInput from 'react-native-mask-input';

import { API_URL } from "../constants/api";

export default function LoginScreen() {
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const isDevMode = __DEV__;

  // Маска для российского номера: +7 (XXX) XXX-XX-XX
  const phoneRuMask = [
    '+',
    '7',
    ' ',
    '(',
    /\d/,
    /\d/,
    /\d/,
    ')',
    ' ',
    /\d/,
    /\d/,
    /\d/,
    '-',
    /\d/,
    /\d/,
    '-',
    /\d/,
    /\d/,
  ];

  const handleSendTelegramCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Ошибка", "Введите номер телефона");
      return;
    }

    // Очищаем номер телефона от форматирования
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 11) {
      Alert.alert("Ошибка", "Введите полный номер телефона");
      return;
    }

    // Открываем Telegram бота с deep link
    const botUsername = "lp_carwash_bot"; // Замените на имя вашего бота
    const deepLink = `https://t.me/${botUsername}?start=${cleanPhone}`;
    
    try {
      const supported = await Linking.canOpenURL(deepLink);
      if (supported) {
        await Linking.openURL(deepLink);
        
        // Показываем форму для ввода кода
        setCodeSent(true);
        
        // Телефон уже отформатирован, оставляем как есть для отображения
        // но для API будем использовать cleanPhone
        
        Alert.alert(
          "Откройте Telegram",
          "Нажмите 'START' в боте, и вам придет код. Затем вернитесь сюда и введите его."
        );
      } else {
        Alert.alert("Ошибка", "Не удалось открыть Telegram");
      }
    } catch (error) {
      console.error("Error opening Telegram:", error);
      Alert.alert("Ошибка", "Не удалось открыть Telegram");
    }
  };

  const handleVerifyTelegramCode = async () => {
    if (!code.trim()) {
      Alert.alert("Ошибка", "Введите код из Telegram");
      return;
    }

    setLoading(true);

    try {
      // Очищаем номер от форматирования и добавляем +
      const cleanPhone = phone.replace(/\D/g, '');
      
      const response = await axios.post(`${API_URL}/auth/telegram/verify-code`, {
        phoneOrUsername: `+${cleanPhone}`,
        code: code.trim(),
      });

      const token = response.data.accessToken;
      const userData = response.data.user;
      
      if (!token) {
        throw new Error("Токен не получен от сервера");
      }
      
      await login(token, userData);

      Alert.alert("Успех", "Авторизация прошла успешно!", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
      ]);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Неверный код";
      Alert.alert("Ошибка", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!phone.trim()) {
      Alert.alert("Ошибка", "Введите номер телефона");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 11) {
      Alert.alert("Ошибка", "Введите полный номер телефона");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        phone: `+${cleanPhone}`,
      });

      const token = response.data.accessToken;
      const userData = response.data.user;
      if (!token) {
        throw new Error("Токен не получен от сервера");
      }

      await login(token, userData);
      router.replace("/");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Не удалось войти в dev-режиме";
      Alert.alert("Ошибка", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePhonePasswordLogin = async () => {
    if (!phone.trim()) {
      Alert.alert("Ошибка", "Введите номер телефона");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Ошибка", "Введите пароль");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 11) {
      Alert.alert("Ошибка", "Введите полный номер телефона");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login-password`, {
        phone: `+${cleanPhone}`,
        password: password.trim(),
      });

      const token = response.data.accessToken;
      const userData = response.data.user;
      if (!token) {
        throw new Error("Токен не получен от сервера");
      }

      await login(token, userData);
      router.replace("/");
    } catch (error: any) {
      const backendMessage = error.response?.data?.message;
      const isNetworkError = !error.response;
      const errorMessage =
        backendMessage ||
        (isNetworkError
          ? "Проблема с сетью. Проверьте Wi-Fi/интернет и попробуйте снова."
          : "Не удалось войти. Проверьте телефон и пароль.");
      Alert.alert("Ошибка", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Логотип */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Поля ввода */}
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Вход по телефону и паролю</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Телефон</Text>
              <MaskInput
                style={styles.input}
                placeholder="+7 (900) 123-45-67"
                placeholderTextColor="#666666"
                value={phone}
                onChangeText={(masked) => {
                  setPhone(masked);
                }}
                mask={phoneRuMask}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!loading && (isDevMode || !codeSent)}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Пароль</Text>
              <TextInput
                style={styles.input}
                placeholder="Введите пароль"
                placeholderTextColor="#666666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handlePhonePasswordLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Text style={styles.loginButtonText}>Войти</Text>
              )}
            </TouchableOpacity>

            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>или</Text>
              <View style={styles.separatorLine} />
            </View>

            <Text style={styles.sectionTitle}>Вход через Telegram</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Номер телефона</Text>
              <MaskInput
                style={styles.input}
                placeholder="+7 (900) 123-45-67"
                placeholderTextColor="#666666"
                value={phone}
                onChangeText={(masked) => {
                  setPhone(masked);
                }}
                mask={phoneRuMask}
                keyboardType="phone-pad"
                autoCapitalize="none"
                editable={!loading && (isDevMode || !codeSent)}
              />
            </View>

            {isDevMode ? (
              <>
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  onPress={handleDevLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.loginButtonText}>Войти (локальный dev)</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.devHint}>
                  В dev-режиме Telegram-авторизация временно отключена.
                </Text>
              </>
            ) : (
              <>
                {!codeSent ? (
                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  onPress={handleSendTelegramCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.loginButtonText}>
                      Авторизоваться через Telegram
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Код из Telegram</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123456"
                      placeholderTextColor="#666666"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.loginButton,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={handleVerifyTelegramCode}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <Text style={styles.loginButtonText}>Войти</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={() => {
                      setCodeSent(false);
                      setCode("");
                      // Номер остается отформатированным
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>
                      Открыть Telegram снова
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
            )}

          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 80,
  },
  logo: {
    width: 100,
    height: 100,
  },
  form: {
    width: "100%",
  },
  sectionTitle: {
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: Colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.input.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text.primary,
    borderWidth: 0,
  },
  loginButton: {
    backgroundColor: Colors.button.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.button.primaryText,
    fontSize: 18,
    fontWeight: "600",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.input.background,
  },
  separatorText: {
    marginHorizontal: 12,
    color: Colors.text.secondary,
    fontSize: 14,
  },
  resendButton: {
    alignItems: "center",
    marginTop: 16,
    padding: 12,
  },
  resendButtonText: {
    color: Colors.warning,
    fontSize: 14,
    fontWeight: "500",
  },
  devHint: {
    marginTop: 12,
    color: Colors.text.secondary,
    fontSize: 13,
    textAlign: "center",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 32,
  },
  registerText: {
    color: Colors.text.primary,
    fontSize: 16,
  },
  registerLink: {
    color: Colors.warning,
    fontSize: 16,
    fontWeight: "600",
  },
});

