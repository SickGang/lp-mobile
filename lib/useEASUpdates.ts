import * as Updates from "expo-updates";
import { useEffect } from "react";

/** Проверяет OTA-обновление при запуске (только production-билды). */
export function useEASUpdates() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) {
      return;
    }

    async function runUpdateCheck() {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) {
          return;
        }

        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch (error) {
        console.warn("[EAS Update] check failed:", error);
      }
    }

    void runUpdateCheck();
  }, []);
}
