import { useEffect, useState } from "react";
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
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "./context/AuthContext";
import Colors from "../constants/colors";
import MaskInput from "react-native-mask-input";
import { API_URL } from "../constants/api";
import {
  isAppleSignInAvailable,
  signInWithAppleApi,
} from "../lib/appleSignIn";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const router = useRouter();
  const { login } = useAuth();
  const isDevMode = __DEV__;

  const phoneRuMask = [
    "+",
    "7",
    " ",
    "(",
    /\d/,
    /\d/,
    /\d/,
    ")",
    " ",
    /\d/,
    /\d/,
    /\d/,
    "-",
    /\d/,
    /\d/,
    "-",
    /\d/,
    /\d/,
  ];

  useEffect(() => {
    void isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const completeLogin = async (token: string, userData: unknown) => {
    await login(token, userData as Parameters<typeof login>[1]);
    router.replace("/");
  };

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { accessToken, user } = await signInWithAppleApi();
      await completeLogin(accessToken, user);
    } catch (error: unknown) {
      const err = error as { code?: string; response?: { data?: { message?: string } }; message?: string };
      if (err.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      const message =
        err.response?.data?.message ||
        err.message ||
        "Не удалось войти через Apple";
      Alert.alert("Ошибка", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTelegramCode = async () => {
    if (!phone.trim()) {
      Alert.alert("Ошибка", "Введите номер телефона");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length < 11) {
      Alert.alert("Ошибка", "Введите полный номер телефона");
      return;
    }

    const botUsername = "lp_carwash_bot";
    const deepLink = `https://t.me/${botUsername}?start=${cleanPhone}`;

    try {
      const supported = await Linking.canOpenURL(deepLink);
      if (supported) {
        await Linking.openURL(deepLink);
        setCodeSent(true);
        Alert.alert(
          "Откройте Telegram",
          "Нажмите START в боте, затем вернитесь в приложение и введите код.",
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
      const cleanPhone = phone.replace(/\D/g, "");

      const response = await axios.post(`${API_URL}/auth/telegram/verify-code`, {
        phoneOrUsername: `+${cleanPhone}`,
        code: code.trim(),
      });

      const token = response.data.accessToken;
      const userData = response.data.user;

      if (!token) {
        throw new Error("Токен не получен от сервера");
      }

      await completeLogin(token, userData);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert("Ошибка", err.response?.data?.message || "Неверный код");
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

      await completeLogin(token, userData);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert(
        "Ошибка",
        err.response?.data?.message || "Не удалось войти в dev-режиме",
      );
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
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Вход через Telegram</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Номер телефона</Text>
              <MaskInput
                style={styles.input}
                placeholder="+7 (900) 123-45-67"
                placeholderTextColor="#666666"
                value={phone}
                onChangeText={setPhone}
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
                    <Text style={styles.loginButtonText}>
                      Войти (локальный dev)
                    </Text>
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

            {appleAvailable && (
              <>
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>или</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View
                  pointerEvents={loading ? "none" : "auto"}
                  style={loading ? styles.buttonDisabled : undefined}
                >
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={
                      AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />
                </View>
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
  appleButton: {
    width: "100%",
    height: 52,
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
});
