import { paraCentavos } from "@cicluz/shared";
import { dinheiroParaApi } from "~/utils/entrada";
import { ESPERADO_BASE, MALOTE, POSTO, RECEBIMENTOS, somaCentavos, type PerfilCasca, type Recebimento, type StatusCaixa } from "~/utils/caixa-casca";

// Estado da CASCA do Caixa: só na memória desta aba (some ao recarregar a página ou em "Reiniciar").
// Simula o ciclo fechado → aberto → em_fechamento → encerrado do sistema principal, sem API.

export type Sangria = { id: string; valor: number; dinheiro: number; moedas: number; lacre: string; observacao: string; hora: string };
export type Parada = { motivos: string[]; outro: string; inicio: string; fim: string | null };
export type Correcao = { de: number; para: number; motivo: string; hora: string };

function estadoInicial() {
  return {
    perfil: "operador" as PerfilCasca,
    status: "fechado" as StatusCaixa,
    abertura: {
      lacre: "",
      conferido: null as boolean | null,
      dinheiroContado: "",
      moedasContadas: "",
      motivo: "",
      responsavel: null as string | null,
      supervisor: null as string | null,
      maquininha: null as string | null,
      abertoEm: null as string | null
    },
    pdvLigado: true,
    paradas: [] as Parada[],
    recebimentos: RECEBIMENTOS.map((item) => ({ ...item })) as Recebimento[],
    sangrias: [] as Sangria[],
    lacresUsados: [] as string[],
    fechamento: {
      etapa: 1,
      gerente: "Marcos Lima",
      gerenteConfirmado: false,
      cedulas: "",
      moedas: "",
      contagemTravada: false,
      correcoes: [] as Correcao[],
      folhaCreare: false,
      relatorioGerado: false,
      maquininhaSalva: false,
      folhaFechamento: false,
      lacre: null as string | null,
      observacao: "",
      encerradoEm: null as string | null
    }
  };
}

export type EstadoCaixaCasca = ReturnType<typeof estadoInicial>;

export function horaAgora() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// "1.234,56" → 123456; vazio ou inválido → null (o campo mostra o erro).
export function centavosDoTexto(texto: string | null | undefined) {
  const api = dinheiroParaApi(texto);
  return api === null ? null : paraCentavos(api);
}

export function useCaixaCasca() {
  const estado = useState<EstadoCaixaCasca>("caixa.casca", estadoInicial);

  const ehOperador = computed(() => estado.value.perfil === "operador");
  const pendentes = computed(() => estado.value.recebimentos.filter((item) => item.situacao === "pendente"));
  const lacresDisponiveis = computed(() => MALOTE.lacresSangria.filter((lacre) => !estado.value.lacresUsados.includes(lacre)));

  const contado = computed(() => {
    const cedulas = centavosDoTexto(estado.value.fechamento.cedulas);
    const moedas = centavosDoTexto(estado.value.fechamento.moedas);
    return cedulas === null || moedas === null ? null : cedulas + moedas;
  });

  // Esperado na gaveta: base fictícia + recebimentos confirmados − sangrias. Contagem cega: as
  // telas do operador só mostram este número na etapa 4 do fechamento.
  const esperado = computed(() =>
    ESPERADO_BASE +
    somaCentavos(estado.value.recebimentos.filter((item) => item.situacao === "confirmado").map((item) => item.valor)) -
    somaCentavos(estado.value.sangrias.map((item) => item.valor))
  );

  const diferenca = computed(() => (contado.value === null ? null : contado.value - esperado.value));

  function abrirCaixa() {
    estado.value.status = "aberto";
    estado.value.abertura.abertoEm = horaAgora();
  }

  function encerrarVendas() {
    estado.value.status = "em_fechamento";
    estado.value.fechamento.etapa = 1;
  }

  function encerrarCaixa() {
    estado.value.status = "encerrado";
    estado.value.fechamento.encerradoEm = horaAgora();
  }

  function reiniciar() {
    const perfil = estado.value.perfil;
    estado.value = estadoInicial();
    estado.value.perfil = perfil;
  }

  return { estado, posto: POSTO, ehOperador, pendentes, lacresDisponiveis, contado, esperado, diferenca, abrirCaixa, encerrarVendas, encerrarCaixa, reiniciar };
}
