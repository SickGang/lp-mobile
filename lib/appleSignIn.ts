import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import axios from "axios";
import { API_URL } from "../constants/api";

export type AppleSignInResult = {
  accessToken: string;
  user: {
    id: number;
    phone?: string | null;
    name?: string | null;
    username?: string | null;
    photoUrl?: string | null;
    email?: string | null;
    appleLinked?: boolean;
    telegramLinked?: boolean;
  };
};

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") {
    return false;
  }
  return AppleAuthentication.isAvailableAsync();
}

export async function signInWithAppleApi(): Promise<AppleSignInResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error("Не удалось получить токен Apple");
  }

  const response = await axios.post<AppleSignInResult>(`${API_URL}/auth/apple`, {
    identityToken: credential.identityToken,
    givenName: credential.fullName?.givenName ?? undefined,
    familyName: credential.fullName?.familyName ?? undefined,
  });

  if (!response.data.accessToken) {
    throw new Error("Токен не получен от сервера");
  }

  return response.data;
}
