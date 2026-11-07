import { createFileRoute } from '@tanstack/react-router';
import { PataECiaDemo } from '@/components/commercial/petshop/demo/pata-e-cia-demo';

export const Route = createFileRoute('/demo/petshop')({
  component: PetshopDemoPage,
  head: () => ({
    meta: [
      { title: 'Pata & Cia — Demonstração Pet Shop | Valtro Labs' },
      { name: 'description', content: 'Experiência demonstrativa de presença digital para Pet Shops desenvolvida pela Valtro Labs.' },
      { property: 'og:title', content: 'Pata & Cia — Demonstração Pet Shop' },
      { property: 'og:description', content: 'Veja como a presença digital do seu Pet Shop pode ser profissional e impactante.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
});

function PetshopDemoPage() {
  return <PataECiaDemo />;
}
