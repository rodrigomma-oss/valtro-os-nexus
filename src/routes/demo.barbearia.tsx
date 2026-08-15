import { createFileRoute } from '@tanstack/react-router';
import { BarbeariaDemo } from '@/components/commercial/barber/demo/barbearia-demo';

export const Route = createFileRoute('/demo/barbearia')({
  component: BarbeariaDemoPage,
  head: () => ({
    meta: [
      { title: 'Nobre Barbearia — Demonstração | Valtro Labs' },
      { name: 'description', content: 'Experiência demonstrativa de presença digital para Barbearias desenvolvida pela Valtro Labs.' },
      { property: 'og:title', content: 'Nobre Barbearia — Demonstração' },
      { property: 'og:description', content: 'Veja como a presença digital da sua barbearia pode ser profissional e impactante.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
});

function BarbeariaDemoPage() {
  return <BarbeariaDemo />;
}
