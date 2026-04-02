import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; localApiUrl?: string }
  | undefined;

export const API_URL = __DEV__
  ? extra?.localApiUrl || "http://localhost:3000"
  : extra?.apiUrl || "https://sickgang-lp-api-b7b5.twc1.net";
