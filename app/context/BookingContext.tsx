import React, { createContext, useContext, useState } from "react";

interface Service {
  id: number;
  name: string;
  price: number;
  selected: boolean;
}

interface BookingContextType {
  selectedServices: Service[];
  setSelectedServices: (services: Service[]) => void;
  totalPrice: number;
  clearBooking: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);

  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);

  const clearBooking = () => {
    setSelectedServices([]);
  };

  return (
    <BookingContext.Provider
      value={{
        selectedServices,
        setSelectedServices,
        totalPrice,
        clearBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
