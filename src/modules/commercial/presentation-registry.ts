import React from "react";
import { PetShopPresentation } from "@/components/commercial/petshop/petshop-presentation";
import { BarbeariaPresentation } from "@/components/commercial/barber/barbearia-presentation";

export const NICHO_COMPONENTS: Record<string, React.ComponentType<any>> = {
  petshop: PetShopPresentation,
  barbearia: BarbeariaPresentation,
  placeholder: () => React.createElement("div", null, "Placeholder Técnico")
};
