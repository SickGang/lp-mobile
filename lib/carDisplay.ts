/** Марка и модель для основной строки селектора. */
export function getCarBrandModelLabel(car: {
  brand: string;
  model: string;
}): string {
  return [car.brand, car.model].filter(Boolean).join(" ") || "Автомобиль";
}

/** Гос. номер для вторичной строки; null если номера нет. */
export function getCarLicensePlateSubtitle(car: {
  licensePlate?: string | null;
  hasNoPlate: boolean;
}): string | null {
  if (car.hasNoPlate || !car.licensePlate?.trim()) {
    return null;
  }
  return car.licensePlate.trim();
}
