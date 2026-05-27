import axios from "axios";

/** Сессия недействительна: протухший JWT, пользователь удалён из БД и т.п. */
export function isInvalidAuthError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  return status === 401 || status === 403 || status === 404;
}
