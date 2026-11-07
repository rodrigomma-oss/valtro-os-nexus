import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/layouts/public-layout";
import { PageHero } from "@/components/marketing/page-hero";
import {
  LegalLayout,
  LegalSection,
  LegalNotice,
} from "@/components/marketing/legal-content";

const PAGE_TITLE = "Termos de Uso — Valtro Labs";
const PAGE_DESCRIPTION =
  "Conheça os termos que regem o uso do site, dos produtos e dos serviços oferecidos pela Valtro Labs, incluindo Valtro Pricing, CRM e Portal de Briefing.";
const PAGE_URL = "https://valtrolabs.pro/termos";
const LAST_UPDATED = "23 de julho de 2026";

const TOC = [
  { id: "objetivo", label: "Objetivo" },
  { id: "aceitacao", label: "Aceitação" },
  { id: "uso-permitido", label: "Uso permitido" },
  { id: "propriedade", label: "Propriedade intelectual" },
  { id: "responsabilidade", label: "Limitação de responsabilidade" },
  { id: "servicos", label: "Serviços oferecidos" },
  { id: "alteracoes", label: "Alterações" },
  { id: "legislacao", label: "Legislação aplicável" },
  { id: "contato", label: "Contato" },
];

export const Route = createFileRoute("/termos")({
  component: TermsPage,
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

function TermsPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Legal"
        title="Termos de Uso"
        subtitle="Regras claras que orientam o uso do site institucional, dos produtos e dos serviços de tecnologia e consultoria oferecidos pela Valtro Labs."
        breadcrumb={[{ label: "Home", to: "/" }, { label: "Termos de Uso" }]}
      />

      <LegalLayout toc={TOC} lastUpdated={LAST_UPDATED}>
        <LegalSection id="objetivo" title="1. Objetivo">
          <p>
            Estes Termos disciplinam o uso do site{" "}
            <strong>valtrolabs.pro</strong>, dos produtos digitais
            desenvolvidos pela Valtro Labs — como o <strong>Valtro Pricing</strong>,
            o CRM interno e o Portal de Briefing — e dos serviços de
            desenvolvimento de software e consultoria prestados aos nossos
            clientes.
          </p>
        </LegalSection>

        <LegalSection id="aceitacao" title="2. Aceitação">
          <p>
            Ao acessar o site ou utilizar qualquer produto ou serviço da
            Valtro Labs, o usuário declara ter lido, compreendido e aceitado
            integralmente estes Termos. Caso não concorde com qualquer cláusula,
            o uso deve ser interrompido.
          </p>
          <p>
            Serviços contratados de forma específica (consultoria, projetos de
            desenvolvimento e implementações) podem ser complementados por
            propostas ou contratos próprios, que prevalecem em caso de
            divergência sobre pontos comerciais.
          </p>
        </LegalSection>

        <LegalSection id="uso-permitido" title="3. Uso permitido">
          <p>
            O usuário se compromete a utilizar o site e os serviços de forma
            ética, legal e alinhada à finalidade para a qual foram
            disponibilizados. É expressamente vedado:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              utilizar mecanismos automatizados para extração massiva de
              conteúdo;
            </li>
            <li>
              tentar acessar áreas restritas, contas de terceiros ou
              informações confidenciais;
            </li>
            <li>
              interferir na disponibilidade e integridade dos sistemas;
            </li>
            <li>
              utilizar as marcas, textos ou identidade visual da Valtro Labs
              sem autorização prévia por escrito.
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="propriedade" title="4. Propriedade intelectual">
          <p>
            Todos os elementos do site e dos produtos — incluindo código-fonte,
            marcas, logotipos, textos, layouts, ilustrações e metodologias
            proprietárias — pertencem à Valtro Labs ou a seus licenciantes e
            estão protegidos pela legislação vigente.
          </p>
          <p>
            Nenhuma disposição destes Termos concede ao usuário licença ou
            direito de uso das marcas ou tecnologias da Valtro Labs, salvo
            autorização expressa em contrato próprio.
          </p>
        </LegalSection>

        <LegalSection id="responsabilidade" title="5. Limitação de responsabilidade">
          <p>
            O conteúdo institucional do site tem caráter informativo. As
            decisões de negócio tomadas com base em conteúdos públicos são de
            responsabilidade exclusiva do usuário.
          </p>
          <p>
            Para produtos e serviços contratados, as responsabilidades e
            garantias são delimitadas em proposta ou contrato específico. Não
            respondemos por indisponibilidades causadas por fatores externos,
            como falhas em provedores de infraestrutura, redes públicas ou
            eventos de força maior.
          </p>
          <LegalNotice>
            Nenhuma comunicação institucional constitui, por si só, oferta
            vinculante. Propostas comerciais formais são emitidas por escrito
            após alinhamento com nossa equipe.
          </LegalNotice>
        </LegalSection>

        <LegalSection id="servicos" title="6. Serviços oferecidos">
          <p>
            A Valtro Labs oferece, entre outras iniciativas:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Valtro Pricing</strong> — solução para precificação em
              marketplaces;
            </li>
            <li>
              <strong>Desenvolvimento de software</strong> sob medida para
              operações digitais;
            </li>
            <li>
              <strong>Consultoria estratégica e técnica</strong> para negócios
              digitais e marketplaces;
            </li>
            <li>
              <strong>CRM e Portal de Briefing</strong> internos, utilizados
              para gestão comercial e estruturação de projetos.
            </li>
          </ul>
          <p>
            Novos módulos podem ser lançados, ajustados ou descontinuados
            conforme a evolução do ecossistema Valtro Labs.
          </p>
        </LegalSection>

        <LegalSection id="alteracoes" title="7. Alterações">
          <p>
            Estes Termos podem ser atualizados periodicamente para refletir
            evoluções nos produtos, serviços e obrigações legais. A data da
            última atualização será sempre exibida no topo desta página.
            Alterações relevantes poderão ser comunicadas por canais próprios
            aos clientes ativos.
          </p>
        </LegalSection>

        <LegalSection id="legislacao" title="8. Legislação aplicável">
          <p>
            Estes Termos são regidos pelas leis da República Federativa do
            Brasil. Fica eleito o foro do domicílio da Valtro Labs para dirimir
            eventuais controvérsias, salvo disposição legal em contrário.
          </p>
        </LegalSection>

        <LegalSection id="contato" title="9. Contato">
          <p>
            Dúvidas sobre estes Termos podem ser encaminhadas pela página de{" "}
            <a
              href="/contato"
              className="text-primary hover:underline underline-offset-4"
            >
              contato oficial
            </a>
            . Nossa equipe responderá com o cuidado que caracteriza a Valtro
            Labs.
          </p>
        </LegalSection>
      </LegalLayout>
    </PublicLayout>
  );
}
