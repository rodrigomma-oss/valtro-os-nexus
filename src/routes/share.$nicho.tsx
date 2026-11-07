import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NICHOS } from "@/modules/commercial/config";
import { PresentationLayout } from "@/layouts/presentation-layout";
import { PresentationProvider } from "@/modules/commercial/presentation-context";
import { NICHO_COMPONENTS } from "@/modules/commercial/presentation-registry";

const presentationSearchSchema = z.object({
  company: z.string(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/share/$nicho")({
  validateSearch: (search) => presentationSearchSchema.parse(search),
  component: PublicPresentationPage,
});

function PublicPresentationPage() {
  const { nicho: nichoId } = Route.useParams();
  const { company, city } = Route.useSearch();
  
  const nicho = NICHOS.find(n => n.id === nichoId) || NICHOS[0];
  const PresentationComponent = NICHO_COMPONENTS[nichoId] || NICHO_COMPONENTS.placeholder;

  return (
    <PresentationProvider empresa={company} cidade={city}>
      <PresentationLayout themeClass={nicho.themeClass} isPublic={true}>
        <div className="relative min-h-screen">
          <PresentationComponent />
        </div>
      </PresentationLayout>
    </PresentationProvider>
  );
}
