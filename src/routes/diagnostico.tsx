import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Sparkles, ClipboardList, Search, FileText, Handshake } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { DiagnosisLayout } from "@/components/diagnosis/DiagnosisLayout";
import { DiagnosisHeader } from "@/components/diagnosis/DiagnosisHeader";
import { DiagnosisSection } from "@/components/diagnosis/DiagnosisSection";
import { DiagnosisQuestion } from "@/components/diagnosis/DiagnosisQuestion";
import { ProgressHeader } from "@/components/diagnosis/ProgressHeader";
import { NavigationFooter } from "@/components/diagnosis/NavigationFooter";
import { ReviewCard } from "@/components/diagnosis/ReviewCard";
import { SuccessScreen } from "@/components/diagnosis/SuccessScreen";
import { STEPS, initialData, type DiagnosisData } from "@/components/diagnosis/types";

export const Route = createFileRoute("/diagnostico")({
  component: DiagnosticoPage,
  head: () => ({
    meta: [
      { title: "Diagnóstico — Valtro Labs" },
      { name: "description", content: "Portal exclusivo de diagnóstico Valtro Labs." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Screen = "welcome" | "how" | "step" | "success";

const OBJETIVO_OPTIONS = [
  "Aumentar vendas",
  "Melhorar margem",
  "Organizar anúncios",
  "Escalar operação",
  "Melhorar posicionamento",
  "Reduzir custos operacionais",
];

function DiagnosticoPage() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<DiagnosisData>(initialData);

  const update = <K extends keyof DiagnosisData>(key: K, value: DiagnosisData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const toggleObjetivo = (v: string) => {
    setData((d) => ({
      ...d,
      objetivos: d.objetivos.includes(v) ? d.objetivos.filter((o) => o !== v) : [...d.objetivos, v],
    }));
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
    else setScreen("success");
  };
  const goBack = () => {
    if (stepIndex === 0) setScreen("how");
    else setStepIndex((i) => i - 1);
  };

  const showProgress = screen === "step";

  return (
    <DiagnosisLayout topSlot={showProgress ? <ProgressHeader currentStep={stepIndex} /> : null}>
      <AnimatePresence mode="wait">
        {screen === "welcome" && <WelcomeScreen key="welcome" onStart={() => setScreen("how")} />}
        {screen === "how" && <HowItWorks key="how" onContinue={() => setScreen("step")} onBack={() => setScreen("welcome")} />}
        {screen === "step" && (
          <DiagnosisSection key={`step-${stepIndex}`} keyId={`step-${stepIndex}`}>
            <DiagnosisHeader
              eyebrow={`Etapa ${stepIndex + 1} de ${STEPS.length}`}
              title={STEPS[stepIndex].title}
              description={STEPS[stepIndex].description}
            />

            {stepIndex === 0 && <EmpresaStep data={data} update={update} />}
            {stepIndex === 1 && <LojaStep data={data} update={update} />}
            {stepIndex === 2 && (
              <ObjetivosStep
                data={data}
                toggle={toggleObjetivo}
                setOutro={(v) => update("objetivosOutro", v)}
              />
            )}
            {stepIndex === 3 && <MarketingStep data={data} update={update} />}
            {stepIndex === 4 && <OperacaoStep data={data} update={update} />}
            {stepIndex === 5 && <ReviewStep data={data} onEdit={setStepIndex} />}

            <NavigationFooter
              onBack={goBack}
              onNext={goNext}
              onSaveLater={() => {
                /* placeholder */
              }}
              nextLabel={stepIndex === STEPS.length - 1 ? "Enviar diagnóstico" : "Continuar"}
            />
          </DiagnosisSection>
        )}
        {screen === "success" && (
          <SuccessScreen
            key="success"
            nome={data.nome}
            onFinish={() => {
              setScreen("welcome");
              setStepIndex(0);
              setData(initialData);
            }}
          />
        )}
      </AnimatePresence>
    </DiagnosisLayout>
  );
}

/* ---------------- Screens ---------------- */

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
      className="py-6"
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-8">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Diagnóstico Valtro Labs · 10 a 15 minutos
      </div>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground leading-[1.1]">
        Vamos entender o momento do seu negócio.
      </h1>
      <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-[640px]">
        Este diagnóstico foi desenhado para captar, de forma objetiva, o essencial da sua operação. Com base nas suas
        respostas, nossa equipe prepara um retorno personalizado com direção clara para os próximos passos.
      </p>

      <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
        <li className="flex gap-3"><span className="text-primary">·</span> Leva entre 10 e 15 minutos para ser concluído.</li>
        <li className="flex gap-3"><span className="text-primary">·</span> Suas respostas orientam a análise da nossa equipe.</li>
        <li className="flex gap-3"><span className="text-primary">·</span> As informações são tratadas com sigilo e usadas apenas para preparar a sua proposta.</li>
      </ul>

      <div className="mt-10">
        <Button size="lg" onClick={onStart} className="gap-2 min-w-[200px]">
          Iniciar diagnóstico <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function HowItWorks({ onContinue, onBack }: { onContinue: () => void; onBack: () => void }) {
  const steps = [
    { icon: ClipboardList, title: "Você responde", desc: "Compartilhe informações essenciais sobre a sua operação." },
    { icon: Search, title: "Nossa equipe analisa", desc: "Especialistas Valtro estudam o seu contexto e oportunidades." },
    { icon: FileText, title: "Você recebe um diagnóstico", desc: "Um panorama estruturado do seu momento atual." },
    { icon: Handshake, title: "Proposta personalizada", desc: "Direcionamento sob medida para os seus objetivos." },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4 }}
    >
      <DiagnosisHeader
        eyebrow="Como funciona"
        title="Um processo claro do início ao retorno."
        description="Cada etapa foi pensada para respeitar o seu tempo e capturar o essencial do seu negócio."
      />
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
            className="flex items-start gap-5 rounded-xl border border-border bg-card p-5"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 grid place-items-center">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <span>·</span>
                <span>Passo</span>
              </div>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </div>
          </motion.li>
        ))}
      </ol>

      <div className="mt-10 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>Voltar</Button>
        <Button onClick={onContinue} className="gap-2 min-w-[200px]">
          Começar agora <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

/* ---------------- Steps ---------------- */

function EmpresaStep({ data, update }: { data: DiagnosisData; update: <K extends keyof DiagnosisData>(k: K, v: DiagnosisData[K]) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <DiagnosisQuestion label="Seu nome" htmlFor="nome">
        <Input id="nome" value={data.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Como podemos te chamar" />
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Empresa" htmlFor="empresa">
        <Input id="empresa" value={data.empresa} onChange={(e) => update("empresa", e.target.value)} placeholder="Nome da sua empresa" />
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Segmento" htmlFor="segmento">
        <Input id="segmento" value={data.segmento} onChange={(e) => update("segmento", e.target.value)} placeholder="Ex: moda, casa, eletrônicos" />
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Tempo de atuação">
        <Select value={data.tempoAtuacao} onValueChange={(v) => update("tempoAtuacao", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="menos-1">Menos de 1 ano</SelectItem>
            <SelectItem value="1-3">1 a 3 anos</SelectItem>
            <SelectItem value="3-5">3 a 5 anos</SelectItem>
            <SelectItem value="5+">Mais de 5 anos</SelectItem>
          </SelectContent>
        </Select>
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Cidade" htmlFor="cidade">
        <Input id="cidade" value={data.cidade} onChange={(e) => update("cidade", e.target.value)} placeholder="Cidade" />
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Estado" htmlFor="estado">
        <Input id="estado" value={data.estado} onChange={(e) => update("estado", e.target.value)} placeholder="UF" />
      </DiagnosisQuestion>
    </div>
  );
}

function LojaStep({ data, update }: { data: DiagnosisData; update: <K extends keyof DiagnosisData>(k: K, v: DiagnosisData[K]) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <DiagnosisQuestion label="Marketplace principal">
        <Select value={data.marketplace} onValueChange={(v) => update("marketplace", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="shopee">Shopee</SelectItem>
            <SelectItem value="mercado-livre">Mercado Livre</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="magalu">Magalu</SelectItem>
            <SelectItem value="outros">Outros</SelectItem>
          </SelectContent>
        </Select>
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Link da loja" htmlFor="link" optional>
        <Input id="link" value={data.link} onChange={(e) => update("link", e.target.value)} placeholder="https://" />
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Quantidade aproximada de produtos">
        <Select value={data.qtdProdutos} onValueChange={(v) => update("qtdProdutos", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1-50">1 a 50</SelectItem>
            <SelectItem value="51-200">51 a 200</SelectItem>
            <SelectItem value="201-1000">201 a 1.000</SelectItem>
            <SelectItem value="1000+">Mais de 1.000</SelectItem>
          </SelectContent>
        </Select>
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Faturamento mensal aproximado">
        <Select value={data.faturamento} onValueChange={(v) => update("faturamento", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ate-20">Até R$ 20 mil</SelectItem>
            <SelectItem value="20-50">R$ 20 a 50 mil</SelectItem>
            <SelectItem value="50-100">R$ 50 a 100 mil</SelectItem>
            <SelectItem value="100-300">R$ 100 a 300 mil</SelectItem>
            <SelectItem value="300+">Acima de R$ 300 mil</SelectItem>
          </SelectContent>
        </Select>
      </DiagnosisQuestion>
    </div>
  );
}

function ObjetivosStep({
  data,
  toggle,
  setOutro,
}: {
  data: DiagnosisData;
  toggle: (v: string) => void;
  setOutro: (v: string) => void;
}) {
  return (
    <div className="space-y-6">
      <DiagnosisQuestion label="Quais objetivos representam o seu momento?" hint="Selecione quantos quiser.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OBJETIVO_OPTIONS.map((opt) => {
            const active = data.objetivos.includes(opt);
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <Checkbox checked={active} onCheckedChange={() => toggle(opt)} />
                <span className="text-sm text-foreground">{opt}</span>
              </label>
            );
          })}
        </div>
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Outros objetivos" htmlFor="outros" optional>
        <Textarea
          id="outros"
          value={data.objetivosOutro}
          onChange={(e) => setOutro(e.target.value)}
          placeholder="Conte-nos algo específico que você quer alcançar"
          rows={3}
        />
      </DiagnosisQuestion>
    </div>
  );
}

function MarketingStep({ data, update }: { data: DiagnosisData; update: <K extends keyof DiagnosisData>(k: K, v: DiagnosisData[K]) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <DiagnosisQuestion label="Utiliza Shopee Ads?">
        <Select value={data.usaShopeeAds} onValueChange={(v) => update("usaShopeeAds", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sim-ativo">Sim, com campanhas ativas</SelectItem>
            <SelectItem value="sim-esporadico">Sim, esporadicamente</SelectItem>
            <SelectItem value="nao">Ainda não uso</SelectItem>
          </SelectContent>
        </Select>
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Investimento mensal em anúncios">
        <Select value={data.investimento} onValueChange={(v) => update("investimento", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Nenhum</SelectItem>
            <SelectItem value="ate-1k">Até R$ 1.000</SelectItem>
            <SelectItem value="1-5k">R$ 1.000 a 5.000</SelectItem>
            <SelectItem value="5-20k">R$ 5.000 a 20.000</SelectItem>
            <SelectItem value="20k+">Acima de R$ 20.000</SelectItem>
          </SelectContent>
        </Select>
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Campanhas ativas atualmente" htmlFor="campanhas" optional>
        <Textarea
          id="campanhas"
          value={data.campanhas}
          onChange={(e) => update("campanhas", e.target.value)}
          placeholder="Descreva brevemente"
          rows={3}
          className="sm:col-span-2"
        />
      </DiagnosisQuestion>
      <DiagnosisQuestion label="Conversão média conhecida" htmlFor="conversao" optional>
        <Input
          id="conversao"
          value={data.conversao}
          onChange={(e) => update("conversao", e.target.value)}
          placeholder="Ex: 2,5%"
        />
      </DiagnosisQuestion>
    </div>
  );
}

function OperacaoStep({ data, update }: { data: DiagnosisData; update: <K extends keyof DiagnosisData>(k: K, v: DiagnosisData[K]) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <DiagnosisQuestion label="Tamanho da equipe">
          <Select value={data.equipe} onValueChange={(v) => update("equipe", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="so-eu">Somente eu</SelectItem>
              <SelectItem value="2-5">2 a 5 pessoas</SelectItem>
              <SelectItem value="6-15">6 a 15 pessoas</SelectItem>
              <SelectItem value="15+">Mais de 15</SelectItem>
            </SelectContent>
          </Select>
        </DiagnosisQuestion>
        <DiagnosisQuestion label="Modelo de estoque">
          <Select value={data.estoque} onValueChange={(v) => update("estoque", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="proprio">Estoque próprio</SelectItem>
              <SelectItem value="fulfillment">Fulfillment do marketplace</SelectItem>
              <SelectItem value="dropshipping">Dropshipping</SelectItem>
              <SelectItem value="misto">Modelo misto</SelectItem>
            </SelectContent>
          </Select>
        </DiagnosisQuestion>
        <DiagnosisQuestion label="Expedição">
          <Select value={data.expedicao} onValueChange={(v) => update("expedicao", v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interna">Feita internamente</SelectItem>
              <SelectItem value="terceirizada">Terceirizada</SelectItem>
              <SelectItem value="marketplace">Coletada pelo marketplace</SelectItem>
            </SelectContent>
          </Select>
        </DiagnosisQuestion>
      </div>
      <DiagnosisQuestion
        label="Principais dificuldades atuais"
        htmlFor="dificuldades"
        hint="Compartilhe com sinceridade — isso guia nossa análise."
      >
        <Textarea
          id="dificuldades"
          value={data.dificuldades}
          onChange={(e) => update("dificuldades", e.target.value)}
          placeholder="O que mais te trava hoje?"
          rows={5}
        />
      </DiagnosisQuestion>
    </div>
  );
}

function ReviewStep({ data, onEdit }: { data: DiagnosisData; onEdit: (i: number) => void }) {
  const labelMap: Record<string, string> = {
    "menos-1": "Menos de 1 ano", "1-3": "1 a 3 anos", "3-5": "3 a 5 anos", "5+": "Mais de 5 anos",
    shopee: "Shopee", "mercado-livre": "Mercado Livre", amazon: "Amazon", magalu: "Magalu", outros: "Outros",
    "1-50": "1 a 50", "51-200": "51 a 200", "201-1000": "201 a 1.000", "1000+": "Mais de 1.000",
    "ate-20": "Até R$ 20 mil", "20-50": "R$ 20 a 50 mil", "50-100": "R$ 50 a 100 mil",
    "100-300": "R$ 100 a 300 mil", "300+": "Acima de R$ 300 mil",
    "sim-ativo": "Sim, ativo", "sim-esporadico": "Sim, esporadicamente", nao: "Não",
    "0": "Nenhum", "ate-1k": "Até R$ 1.000", "1-5k": "R$ 1 a 5 mil", "5-20k": "R$ 5 a 20 mil", "20k+": "Acima de R$ 20 mil",
    "so-eu": "Somente eu", "2-5": "2 a 5", "6-15": "6 a 15", "15+": "Mais de 15",
    proprio: "Próprio", fulfillment: "Fulfillment", dropshipping: "Dropshipping", misto: "Misto",
    interna: "Interna", terceirizada: "Terceirizada", marketplace: "Marketplace",
  };
  const l = (v: string) => labelMap[v] ?? v;

  return (
    <div className="space-y-4">
      <ReviewCard
        title="Empresa"
        onEdit={() => onEdit(0)}
        items={[
          { label: "Nome", value: data.nome },
          { label: "Empresa", value: data.empresa },
          { label: "Segmento", value: data.segmento },
          { label: "Tempo de atuação", value: l(data.tempoAtuacao) },
          { label: "Cidade", value: data.cidade },
          { label: "Estado", value: data.estado },
        ]}
      />
      <ReviewCard
        title="Loja"
        onEdit={() => onEdit(1)}
        items={[
          { label: "Marketplace", value: l(data.marketplace) },
          { label: "Link", value: data.link },
          { label: "Produtos", value: l(data.qtdProdutos) },
          { label: "Faturamento", value: l(data.faturamento) },
        ]}
      />
      <ReviewCard
        title="Objetivos"
        onEdit={() => onEdit(2)}
        items={[
          { label: "Selecionados", value: data.objetivos.join(", ") },
          { label: "Outros", value: data.objetivosOutro },
        ]}
      />
      <ReviewCard
        title="Marketing"
        onEdit={() => onEdit(3)}
        items={[
          { label: "Shopee Ads", value: l(data.usaShopeeAds) },
          { label: "Investimento", value: l(data.investimento) },
          { label: "Campanhas", value: data.campanhas },
          { label: "Conversão", value: data.conversao },
        ]}
      />
      <ReviewCard
        title="Operação"
        onEdit={() => onEdit(4)}
        items={[
          { label: "Equipe", value: l(data.equipe) },
          { label: "Estoque", value: l(data.estoque) },
          { label: "Expedição", value: l(data.expedicao) },
          { label: "Dificuldades", value: data.dificuldades },
        ]}
      />
    </div>
  );
}
