import React from "react";
import { PetShopPresentation } from "@/components/commercial/petshop/petshop-presentation";

export const NICHO_COMPONENTS: Record<string, React.ComponentType<any>> = {
  petshop: PetShopPresentation,
  placeholder: () => React.createElement("div", null, "Placeholder Técnico")
};
