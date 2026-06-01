import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
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
import { SafeAreaView } from "react-native-safe-area-context";
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
import { toTelUri } from "../lib/phoneTel";

const CALL_POLL_INTERVAL_MS = 3000;

type CallStartResponse = {
  checkId: string;
  callPhone: string;
  callPhonePretty: string;
  expiresInMinutes: number;
  message: string;
};

type CallVerifyResponse =
  | { confirmed: false; message: string }
  | {
      confirmed: true;
      accessToken: string;
      user: unknown;
    };

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [callPhone, setCallPhone] = useState("");
  const [callPhonePretty, setCallPhonePretty] = useState("");
  const [polling, setPolling] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const pollInFlight = useRef(false);
  const router = useRouter();
  const { login } = useAuth();

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

  const getNormalizedPhone = (): string | null => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 11) {
      return null;
    }
    return `+${cleanPhone}`;
  };

  const getErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as { response?: { data?: { message?: string | string[] } } };
    const raw = err.response?.data?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    return raw || fallback;
  };

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
      const err = error as { code?: string; message?: string };
      if (err.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      Alert.alert("Ошибка", getErrorMessage(error, "Не удалось войти через Apple"));
    } finally {
      setLoading(false);
    }
  };

  const verifyCall = useCallback(async (): Promise<boolean> => {
    if (!checkId || pollInFlight.current) {
      return false;
    }

    pollInFlight.current = true;
    try {
      const response = await axios.post<CallVerifyResponse>(
        `${API_URL}/auth/call/verify`,
        { checkId },
      );

      if (response.data.confirmed) {
        setPolling(false);
        const { accessToken, user } = response.data;
        if (!accessToken) {
          throw new Error("Токен не получен от сервера");
        }
        await completeLogin(accessToken, user);
        return true;
      }

      return false;
    } catch (error: unknown) {
      setPolling(false);
      Alert.alert("Ошибка", getErrorMessage(error, "Не удалось проверить звонок"));
      return true;
    } finally {
      pollInFlight.current = false;
    }
  }, [checkId, login, router]);

  useEffect(() => {
    if (!polling || !checkId) {
      return;
    }

    const interval = setInterval(() => {
      void verifyCall();
    }, CALL_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [polling, checkId, verifyCall]);

  const handleStartCallAuth = async () => {
    const normalizedPhone = getNormalizedPhone();
    if (!normalizedPhone) {
      Alert.alert("Ошибка", "Введите полный номер телефона");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<CallStartResponse>(
        `${API_URL}/auth/call/start`,
        { phone: normalizedPhone },
      );

      setCheckId(response.data.checkId);
      setCallPhone(response.data.callPhone);
      setCallPhonePretty(response.data.callPhonePretty);
      setCallStarted(true);
      setPolling(true);
    } catch (error: unknown) {
      Alert.alert("Ошибка", getErrorMessage(error, "Не удалось начать авторизацию"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialer = async () => {
    const source = callPhone || callPhonePretty;
    if (!source.trim()) {
      Alert.alert("Ошибка", "Номер для звонка не получен. Нажмите «Продолжить» снова.");
      return;
    }

    const url = toTelUri(source, Platform.OS === "ios");
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть набор номера");
    }
  };

  const handleResetCall = () => {
    setPolling(false);
    setCallStarted(false);
    setCheckId(null);
    setCallPhone("");
    setCallPhonePretty("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace("/")}
          disabled={loading}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.skipButtonText}>Продолжить без входа</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
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
              <Text style={styles.sectionTitle}>Вход по звонку</Text>

              {!callStarted ? (
                <>
                  <Text style={styles.hint}>
                    Укажите свой номер — мы покажем, на какой номер нужно
                    позвонить. Звонок бесплатный и сбросится автоматически.
                  </Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Ваш номер телефона</Text>
                    <MaskInput
                      style={styles.input}
                      placeholder="+7 (900) 123-45-67"
                      placeholderTextColor="#666666"
                      value={phone}
                      onChangeText={setPhone}
                      mask={phoneRuMask}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      editable={!loading}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.buttonDisabled]}
                    onPress={handleStartCallAuth}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000000" />
                    ) : (
                      <Text style={styles.loginButtonText}>Продолжить</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.hint}>
                    Позвоните с номера {phone.trim()} на указанный ниже телефон.
                    У вас 5 минут.
                  </Text>

                  <View style={styles.callNumberBox}>
                    <Text style={styles.callNumberLabel}>Позвоните на</Text>
                    <Text style={styles.callNumberPretty}>{callPhonePretty}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, loading && styles.buttonDisabled]}
                    onPress={handleOpenDialer}
                    disabled={loading}
                  >
                    <Text style={styles.loginButtonText}>Позвонить</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, loading && styles.buttonDisabled]}
                    onPress={() => void verifyCall()}
                    disabled={loading}
                  >
                    {polling ? (
                      <View style={styles.pollingRow}>
                        <ActivityIndicator color={Colors.warning} size="small" />
                        <Text style={styles.secondaryButtonText}>
                          Ожидаем звонок…
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.secondaryButtonText}>
                        Проверить вручную
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResetCall}
                    disabled={loading}
                  >
                    <Text style={styles.resendButtonText}>Изменить номер</Text>
                  </TouchableOpacity>
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
    </SafeAreaView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipButtonText: {
    color: Colors.text.tertiary,
    fontSize: 15,
    fontWeight: "500",
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
  hint: {
    color: Colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
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
  callNumberBox: {
    backgroundColor: Colors.input.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
  },
  callNumberLabel: {
    color: Colors.text.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  callNumberPretty: {
    color: Colors.text.primary,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: Colors.button.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: Colors.warning,
    fontSize: 16,
    fontWeight: "500",
  },
  pollingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
});
