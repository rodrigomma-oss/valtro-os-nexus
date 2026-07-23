import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { PageHero } from "@/components/marketing/page-hero";
import {
  LegalLayout,
  LegalSection,
  LegalNotice,
} from "@/components/marketing/legal-content";

const PAGE_TITLE = "Política de Privacidade — Valtro Labs";
const PAGE_DESCRIPTION =
  "Saiba como a Valtro Labs coleta, utiliza e protege dados pessoais em seus produtos e serviços, em conformidade com a LGPD.";
const PAGE_URL = "https://valtrolabs.pro/privacidade";
const LAST_UPDATED = "23 de julho de 2026";

const TOC = [
  { id: "introducao", label: "Introdução" },
  { id: "dados", label: "Dados que coletamos" },
  { id: "uso", label: "Como utilizamos esses dados" },
  { id: "compartilhamento", label: "Compartilhamento de informações" },
  { id: "seguranca", label: "Armazenamento e segurança" },
  { id: "direitos", label: "Direitos do titular (LGPD)" },
  { id: "cookies", label: "Cookies" },
  { id: "contato", label: "Contato" },
];

export const Route = createFileRoute("/privacidade")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: PAGE_TITLE },
      { name: "twitter:description", content: PAGE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
  }),
});

function PrivacyPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Legal"
        title="Política de Privacidade"
        subtitle="Transparência sobre como tratamos dados pessoais em nossos produtos, serviços de consultoria e no relacionamento com clientes e visitantes."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Privacidade" }]}
      />

      <LegalLayout toc={TOC} lastUpdated={LAST_UPDATED}>
        <LegalSection id="introducao" title="1. Introdução">
          <p>
            Esta Política descreve como a Valtro Labs — empresa de tecnologia
            focada em desenvolvimento de software, consultoria e soluções para
            negócios digitais — trata dados pessoais coletados em seu site
            institucional, no <strong>Valtro Pricing</strong>, no CRM
            comercial, no Portal de Briefing e em interações diretas com
            clientes e prospects.
          </p>
          <p>
            Nosso compromisso é operar de forma transparente e alinhada à Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD), tratando
            apenas os dados necessários para entregar valor real aos negócios
            de nossos clientes.
          </p>
        </LegalSection>

        <LegalSection id="dados" title="2. Dados que coletamos">
          <p>
            Coletamos dados de forma proporcional à finalidade de cada
            interação. Em resumo:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Dados de contato:</strong> nome, e-mail, telefone e
              empresa — informados voluntariamente em formulários, briefings
              ou reuniões comerciais.
            </li>
            <li>
              <strong>Dados de projeto:</strong> respostas a briefings,
              descrição de operação, objetivos, integrações e informações
              técnicas relevantes ao escopo contratado.
            </li>
            <li>
              <strong>Dados de uso do CRM:</strong> registros de leads,
              eventos, notas comerciais e histórico de atendimento — restritos
              à equipe interna da Valtro Labs.
            </li>
            <li>
              <strong>Dados de navegação:</strong> informações técnicas mínimas
              (páginas visitadas, dispositivo, região aproximada) para
              melhoria contínua do site.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="uso" title="3. Como utilizamos esses dados">
          <p>
            Utilizamos os dados coletados para finalidades específicas e
            legítimas:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>responder solicitações comerciais e de suporte;</li>
            <li>
              executar projetos de desenvolvimento, consultoria e
              implementação de soluções contratadas;
            </li>
            <li>
              operar o CRM interno, o Portal de Briefing e o Valtro Pricing de
              forma segura;
            </li>
            <li>
              enviar comunicações relacionadas a projetos em andamento e, com
              consentimento, materiais institucionais;
            </li>
            <li>
              cumprir obrigações legais, contratuais e fiscais aplicáveis.
            </li>
          </ul>
          <LegalNotice>
            Não utilizamos dados pessoais para tomada de decisões
            automatizadas com efeitos jurídicos ou impactos relevantes sobre
            o titular.
          </LegalNotice>
        </LegalSection>

        <LegalSection id="compartilhamento" title="4. Compartilhamento de informações">
          <p>
            Não vendemos dados pessoais. Compartilhamentos ocorrem apenas
            quando estritamente necessários à operação dos nossos serviços:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Provedores de infraestrutura e nuvem</strong> que
              hospedam nossos sistemas sob obrigações contratuais de
              confidencialidade;
            </li>
            <li>
              <strong>Ferramentas operacionais</strong> utilizadas
              internamente (autenticação, armazenamento, e-mail transacional);
            </li>
            <li>
              <strong>Autoridades competentes</strong>, quando exigido por
              lei ou ordem judicial.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="seguranca" title="5. Armazenamento e segurança">
          <p>
            Adotamos medidas técnicas e administrativas para proteger dados
            pessoais contra acessos não autorizados, perdas e usos indevidos.
            Isso inclui controle de acesso por perfil, políticas internas de
            segurança, criptografia em trânsito e revisão contínua dos
            componentes que compõem nossa plataforma.
          </p>
          <p>
            Retemos dados apenas pelo período necessário para cumprir as
            finalidades descritas nesta Política ou para atender obrigações
            legais.
          </p>
        </LegalSection>

        <LegalSection id="direitos" title="6. Direitos do titular (LGPD)">
          <p>
            Como titular de dados, você pode exercer os seguintes direitos:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>confirmar a existência de tratamento;</li>
            <li>acessar seus dados;</li>
            <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
            <li>
              solicitar anonimização, bloqueio ou eliminação de dados
              desnecessários ou tratados em desconformidade;
            </li>
            <li>solicitar a portabilidade dos dados, quando aplicável;</li>
            <li>revogar consentimentos previamente concedidos.</li>
          </ul>
          <p>
            Para exercer qualquer desses direitos, entre em contato pelos
            canais oficiais indicados abaixo. Respondemos às solicitações no
            menor prazo razoável, respeitando os requisitos legais.
          </p>
        </LegalSection>

        <LegalSection id="cookies" title="7. Cookies">
          <p>
            Utilizamos cookies estritamente necessários para o funcionamento
            do site e cookies auxiliares para entender de forma agregada como
            nossas páginas são utilizadas. Não empregamos cookies para
            rastreamento publicitário de terceiros.
          </p>
          <p>
            Você pode gerenciar cookies diretamente no seu navegador; alguns
            recursos podem ficar indisponíveis caso sejam desabilitados.
          </p>
        </LegalSection>

        <LegalSection id="contato" title="8. Contato">
          <p>
            Para dúvidas, solicitações relacionadas a dados pessoais ou
            exercício de direitos previstos na LGPD, utilize a página de{" "}
            <a
              href="/contato"
              className="text-primary hover:underline underline-offset-4"
            >
              contato oficial
            </a>{" "}
            da Valtro Labs. Sua mensagem será direcionada ao responsável
            interno pelo tratamento de dados.
          </p>
        </LegalSection>
      </LegalLayout>
    </PublicLayout>
  );
}
