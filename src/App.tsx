import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Button } from '@/components/ui/button'

function Inicio() {
  const [comecou, setComecou] = useState(false)

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16">
      <section className="w-full max-w-2xl text-center" aria-labelledby="titulo">
        <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-primary">
          FEITO COM NEXUS
        </p>
        <h1 id="titulo" className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Sua próxima ideia começa aqui.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground" aria-live="polite">
          {comecou
            ? 'Tudo pronto. Agora conte ao agente o que você quer criar.'
            : 'Peça ao agente para transformar esta página no seu próximo projeto.'}
        </p>
        <Button size="lg" className="mt-8" onClick={() => setComecou(true)}>
          Vamos começar
          <ArrowUpRight aria-hidden="true" />
        </Button>
      </section>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
      </Routes>
    </BrowserRouter>
  )
}
