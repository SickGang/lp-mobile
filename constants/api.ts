import Constants from "expo-constants";
import { Platform } from "react-native";

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; localApiUrl?: string }
  | undefined;

const replaceLocalhostForPlatform = (url: string) => {
  if (!url.includes("localhost")) {
    return url;
  }

  if (Platform.OS === "android") {
    return url.replace("localhost", "10.0.2.2");
  }

  // iOS simulator/dev client works more reliably with 127.0.0.1 than localhost.
  return url.replace("localhost", "127.0.0.1");
};

const normalizeBaseUrl = (url: string) => {
  const trimmed = url.trim().replace(/\/+$/, "");
  // Swagger lives on /api, but mobile endpoints are mounted at root (/cars, /auth, ...)
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

const devDefaultUrl =
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://127.0.0.1:3000";

const resolvedDevUrl = replaceLocalhostForPlatform(
  extra?.localApiUrl || devDefaultUrl
);

export const API_URL = __DEV__
  ? normalizeBaseUrl(resolvedDevUrl)
  : normalizeBaseUrl(extra?.apiUrl || "https://sickgang-lp-api-b7b5.twc1.net");

if (__DEV__) {
  console.log("[API_URL]", API_URL, {
    platform: Platform.OS,
    appOwnership: Constants.appOwnership,
    localApiUrl: extra?.localApiUrl,
    apiUrl: extra?.apiUrl,
  });
}
