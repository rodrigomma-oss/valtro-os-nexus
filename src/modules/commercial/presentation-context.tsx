import { createContext, useContext, ReactNode } from "react";
import { useSearch } from "@tanstack/react-router";

interface PresentationContextType {
  empresa: string;
  cidade?: string;
}

const PresentationContext = createContext<PresentationContextType | undefined>(undefined);

export function PresentationProvider({ children, empresa, cidade }: PresentationContextType & { children: ReactNode }) {
  return (
    <PresentationContext.Provider value={{ empresa, cidade }}>
      {children}
    </PresentationContext.Provider>
  );
}

export function usePresentationContext() {
  const context = useContext(PresentationContext);
  if (!context) {
    throw new Error("usePresentationContext must be used within a PresentationProvider");
  }
  return context;
}

interface DynamicTextProps {
  template: string;
  fallbackCidade?: string;
}

export function DynamicText({ template, fallbackCidade = "" }: DynamicTextProps) {
  const { empresa, cidade } = usePresentationContext();

  const rendered = template
    .replace(/\{\{empresa\}\}/g, empresa)
    .replace(/\{\{cidade\}\}/g, cidade || fallbackCidade);

  return <>{rendered}</>;
}
