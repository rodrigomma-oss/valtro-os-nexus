import { ReactNode } from "react";
import { NichoConfig, NICHOS } from "@/modules/commercial/config";
import { PetShopPresentation } from "@/components/commercial/petshop/petshop-presentation";

export const NICHO_COMPONENTS: Record<string, React.ComponentType> = {
  petshop: PetShopPresentation,
  placeholder: () => <div>Placeholder</div>
};
