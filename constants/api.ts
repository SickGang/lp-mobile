import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra as
  | { apiUrl?: string; localApiUrl?: string }
  | undefined;

export const API_URL = __DEV__
  ? extra?.localApiUrl || "http://localhost:3000"
  : extra?.apiUrl || "https://carwashapi-production-8b7d.up.railway.app";

