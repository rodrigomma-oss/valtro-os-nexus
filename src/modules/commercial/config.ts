import { ReactNode } from "react";

export interface NichoConfig {
  id: string;
  label: string;
  themeClass: string;
  placeholder?: boolean;
}

export const NICHOS: NichoConfig[] = [
  {
    id: "petshop",
    label: "Pet Shop",
    themeClass: "theme-petshop",
  },
  {
    id: "barbearia",
    label: "Barbearia",
    themeClass: "theme-barbearia",
  },
  {
    id: "placeholder",
    label: "Placeholder Técnico (AC-001.1)",
    themeClass: "theme-neutral",
    placeholder: true,
  },
];
