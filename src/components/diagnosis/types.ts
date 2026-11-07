export interface DiagnosisData {
  // Empresa
  nome: string;
  empresa: string;
  segmento: string;
  cidade: string;
  estado: string;
  tempoAtuacao: string;
  // Loja
  marketplace: string;
  link: string;
  qtdProdutos: string;
  faturamento: string;
  // Objetivos
  objetivos: string[];
  objetivosOutro: string;
  // Marketing
  usaShopeeAds: string;
  investimento: string;
  campanhas: string;
  conversao: string;
  // Operação
  equipe: string;
  estoque: string;
  expedicao: string;
  dificuldades: string;
}

export const initialData: DiagnosisData = {
  nome: "",
  empresa: "",
  segmento: "",
  cidade: "",
  estado: "",
  tempoAtuacao: "",
  marketplace: "",
  link: "",
  qtdProdutos: "",
  faturamento: "",
  objetivos: [],
  objetivosOutro: "",
  usaShopeeAds: "",
  investimento: "",
  campanhas: "",
  conversao: "",
  equipe: "",
  estoque: "",
  expedicao: "",
  dificuldades: "",
};

export interface StepMeta {
  id: string;
  label: string;
  title: string;
  description: string;
}

export const STEPS: StepMeta[] = [
  { id: "empresa", label: "Empresa", title: "Sobre a sua empresa", description: "Comece nos contando um pouco sobre você e o seu negócio." },
  { id: "loja", label: "Loja", title: "Sua operação de venda", description: "Onde você vende e qual o tamanho atual da operação." },
  { id: "objetivos", label: "Objetivos", title: "O que você quer alcançar", description: "Selecione os objetivos que mais representam o seu momento." },
  { id: "marketing", label: "Marketing", title: "Marketing e anúncios", description: "Como você atrai clientes hoje e onde investe." },
  { id: "operacao", label: "Operação", title: "Operação e bastidores", description: "Como funciona o dia a dia da sua loja." },
  { id: "revisao", label: "Revisão", title: "Revise suas respostas", description: "Confira as informações antes de finalizar." },
];
