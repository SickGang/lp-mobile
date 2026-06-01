/**
 * Формат номера для tel:/telprompt: (E.164 с «+»).
 * sms.ru отдаёт call_phone как «78005008275» — без «+» iOS часто показывает «неверный номер».
 */
export function toTelUri(phone: string, usePrompt = false): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("8")) {
    digits = `7${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `7${digits}`;
  }

  const scheme = usePrompt ? "telprompt" : "tel";
  return `${scheme}:+${digits}`;
}
