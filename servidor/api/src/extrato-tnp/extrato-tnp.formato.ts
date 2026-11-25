import type {
  ContaExtratoTnp,
  DetalhesContaExtratoTnp,
  DetalhesLancamentoExtratoTnp,
  ExtratoTnp,
  FaturaExtratoTnp,
  InvestimentoExtratoTnp,
  LancamentoExtratoTnp,
  TotaisExtratoTnp,
} from "@cicluz/shared";

// Lista branca da resposta do coletor (GET /api/v1/extrato): cada campo que vai para a tela é escolhido aqui, um
// por um, com o tipo certo. O que o coletor mandar a mais é ignorado. Dinheiro em CENTAVOS inteiros.

// Os campos do contrato do coletor (o resto do que vier é ignorado).
type Campo =
  | "aplicadoAutomaticoCentavos"
  | "ate"
  | "atualizadoNaPluggy"
  | "bandeira"
  | "cartao"
  | "cartoesAdicionais"
  | "categoria"
  | "chequeEspecialLimiteCentavos"
  | "chequeEspecialNaoContratadoCentavos"
  | "chequeEspecialUsadoCentavos"
  | "cnae"
  | "cnpj"
  | "conexoes"
  | "consentimentoExpira"
  | "contaId"
  | "contas"
  | "contraparte"
  | "data"
  | "dataCompra"
  | "descricao"
  | "descricaoBanco"
  | "desde"
  | "detalhes"
  | "dia"
  | "dias"
  | "disponivelCentavos"
  | "documento"
  | "em"
  | "emissor"
  | "encargosCentavos"
  | "entradas"
  | "erro"
  | "estabelecimento"
  | "faturaId"
  | "faturas"
  | "fechamento"
  | "final"
  | "forma"
  | "geradoEm"
  | "hoje"
  | "instituicao"
  | "investimentoId"
  | "investimentos"
  | "lancamentos"
  | "lidoEm"
  | "limiteCentavos"
  | "liquido"
  | "mcc"
  | "minimoCentavos"
  | "motivo"
  | "nome"
  | "numero"
  | "ok"
  | "operacao"
  | "operacaoDetalhe"
  | "pagamentoMinimoCentavos"
  | "pagoCentavos"
  | "parcela"
  | "parcelas"
  | "parcelavel"
  | "pendentes"
  | "periodo"
  | "quantidade"
  | "ramo"
  | "rentabilidade12m"
  | "saidas"
  | "saldoCentavos"
  | "saldoContabilCentavos"
  | "saldoLidoEm"
  | "saldoTotalCentavos"
  | "situacao"
  | "subtipo"
  | "tarifa"
  | "tipo"
  | "tipoPagamento"
  | "todasAsContas"
  | "totalCentavos"
  | "transacaoId"
  | "ultimaBusca"
  | "valorCentavos"
  | "vencimento";
type Bruto = Partial<Record<Campo, unknown>>;
const texto = (v: unknown) =>
  v === null || v === undefined ? null : String(v);
// Texto opcional curto: some quando vazio (o banco nem sempre informa) e nunca passa de 200 caracteres.
const opcional = (v: unknown) =>
  v === null || v === undefined || String(v).trim() === ""
    ? undefined
    : String(v).slice(0, 200);
const inteiro = (v: unknown) =>
  Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0;
const inteiroOuNulo = (v: unknown) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? null
    : Math.trunc(Number(v));
const inteiroOpcional = (v: unknown) => inteiroOuNulo(v) ?? undefined;
const lista = (v: unknown): Bruto[] =>
  Array.isArray(v) ? (v as Bruto[]) : [];
const objeto = (v: unknown): Bruto =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Bruto) : {};
/** Tira os campos undefined (o JSON fica só com o que o banco informou). */
type SemVazios<T> = { [K in keyof T]?: Exclude<T[K], undefined> };
const limpo = <T extends object>(o: T): SemVazios<T> =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as SemVazios<T>;

// Sem o campo (coletor antigo), a conta é bancária: era o único tipo antes do cartão.
const tipoConta = (v: unknown): "BANK" | "CREDIT" =>
  v === "CREDIT" ? "CREDIT" : "BANK";

function totais(v: unknown): TotaisExtratoTnp {
  const t = objeto(v);
  return {
    entradas: inteiro(t.entradas),
    saidas: inteiro(t.saidas),
    liquido: inteiro(t.liquido),
    quantidade: inteiro(t.quantidade),
    pendentes: inteiro(t.pendentes),
  };
}

function detalhesLancamento(v: unknown): DetalhesLancamentoExtratoTnp {
  const d = objeto(v);
  const doc = objeto(d.documento);
  const loja = objeto(d.estabelecimento);
  const cartao = objeto(d.cartao);
  const estabelecimento = limpo({
    nome: opcional(loja.nome),
    cnpj: opcional(loja.cnpj),
    ramo: opcional(loja.ramo),
    cnae: opcional(loja.cnae),
  });
  const dadosCartao = limpo({
    final: opcional(cartao.final),
    parcela: inteiroOpcional(cartao.parcela),
    parcelas: inteiroOpcional(cartao.parcelas),
    dataCompra: opcional(cartao.dataCompra),
    faturaId: opcional(cartao.faturaId),
    tipoPagamento: opcional(cartao.tipoPagamento),
    tarifa: opcional(cartao.tarifa),
    mcc: inteiroOpcional(cartao.mcc),
  });
  return limpo({
    descricaoBanco: opcional(d.descricaoBanco),
    forma: opcional(d.forma),
    operacaoDetalhe: opcional(d.operacaoDetalhe),
    motivo: opcional(d.motivo),
    // O coletor já manda o CPF mascarado; aqui só passa adiante o que veio.
    documento:
      opcional(doc.numero) !== undefined
        ? { tipo: String(doc.tipo ?? ""), numero: String(doc.numero) }
        : undefined,
    estabelecimento: Object.keys(estabelecimento).length
      ? estabelecimento
      : undefined,
    cartao: Object.keys(dadosCartao).length ? dadosCartao : undefined,
  });
}

function lancamento(l: Bruto): LancamentoExtratoTnp {
  return {
    transacaoId: String(l.transacaoId),
    contaId: String(l.contaId),
    data: String(l.data),
    dia: String(l.dia),
    descricao: String(l.descricao ?? ""),
    valorCentavos: inteiro(l.valorCentavos),
    tipo: l.tipo === "DEBIT" ? "DEBIT" : "CREDIT",
    situacao: String(l.situacao ?? ""),
    saldoCentavos: inteiroOuNulo(l.saldoCentavos),
    operacao: texto(l.operacao),
    categoria: texto(l.categoria),
    contraparte: texto(l.contraparte),
    detalhes: detalhesLancamento(l.detalhes),
  };
}

function detalhesConta(v: unknown): DetalhesContaExtratoTnp {
  const d = objeto(v);
  return limpo({
    saldoContabilCentavos: inteiroOpcional(d.saldoContabilCentavos),
    aplicadoAutomaticoCentavos: inteiroOpcional(d.aplicadoAutomaticoCentavos),
    chequeEspecialLimiteCentavos: inteiroOpcional(
      d.chequeEspecialLimiteCentavos,
    ),
    chequeEspecialUsadoCentavos: inteiroOpcional(d.chequeEspecialUsadoCentavos),
    chequeEspecialNaoContratadoCentavos: inteiroOpcional(
      d.chequeEspecialNaoContratadoCentavos,
    ),
    bandeira: opcional(d.bandeira),
    limiteCentavos: inteiroOpcional(d.limiteCentavos),
    disponivelCentavos: inteiroOpcional(d.disponivelCentavos),
    vencimento: opcional(d.vencimento),
    fechamento: opcional(d.fechamento),
    pagamentoMinimoCentavos: inteiroOpcional(d.pagamentoMinimoCentavos),
    situacao: opcional(d.situacao),
    cartoesAdicionais: inteiroOpcional(d.cartoesAdicionais),
  });
}

function conta(c: Bruto): ContaExtratoTnp {
  return {
    contaId: String(c.contaId),
    tipo: tipoConta(c.tipo),
    subtipo: texto(c.subtipo),
    nome: String(c.nome ?? ""),
    numero: texto(c.numero),
    saldoCentavos: inteiroOuNulo(c.saldoCentavos),
    saldoLidoEm: texto(c.saldoLidoEm),
    detalhes: detalhesConta(c.detalhes),
  };
}

const fatura = (f: Bruto): FaturaExtratoTnp => ({
  faturaId: String(f.faturaId),
  vencimento: texto(f.vencimento),
  fechamento: texto(f.fechamento),
  totalCentavos: inteiro(f.totalCentavos),
  minimoCentavos: inteiroOuNulo(f.minimoCentavos),
  encargosCentavos: inteiro(f.encargosCentavos),
  pagoCentavos: inteiro(f.pagoCentavos),
  parcelavel: f.parcelavel === true,
});

const investimento = (i: Bruto): InvestimentoExtratoTnp => ({
  investimentoId: String(i.investimentoId),
  nome: String(i.nome ?? ""),
  tipo: texto(i.tipo),
  subtipo: texto(i.subtipo),
  saldoCentavos: inteiro(i.saldoCentavos),
  rentabilidade12m: Number.isFinite(Number(i.rentabilidade12m))
    ? Number(i.rentabilidade12m)
    : null,
  emissor: texto(i.emissor),
  data: texto(i.data),
  lidoEm: texto(i.lidoEm),
});

/** A resposta do coletor, só com os campos da lista branca. */
export function extratoDoColetor(corpo: Bruto): ExtratoTnp {
  const ultima = corpo.ultimaBusca ? objeto(corpo.ultimaBusca) : null;
  const hoje = objeto(corpo.hoje);
  const periodo = objeto(corpo.periodo);
  return {
    geradoEm: String(corpo.geradoEm ?? new Date().toISOString()),
    ultimaBusca: ultima
      ? { em: texto(ultima.em), ok: Boolean(ultima.ok) }
      : null,
    conexoes: lista(corpo.conexoes).map((c) => ({
      instituicao: String(c.instituicao ?? ""),
      situacao: String(c.situacao ?? ""),
      atualizadoNaPluggy: texto(c.atualizadoNaPluggy),
      consentimentoExpira: texto(c.consentimentoExpira),
      erro: texto(c.erro),
    })),
    contas: lista(corpo.contas).map(conta),
    todasAsContas: lista(corpo.todasAsContas).map(conta),
    saldoTotalCentavos: inteiro(corpo.saldoTotalCentavos),
    faturas: lista(corpo.faturas).map(fatura),
    investimentos: lista(corpo.investimentos).map(investimento),
    hoje: { ...totais(hoje), dia: String(hoje.dia ?? "") },
    periodo: {
      ...totais(periodo),
      desde: String(periodo.desde ?? ""),
      ate: String(periodo.ate ?? ""),
    },
    dias: lista(corpo.dias).map((d) => ({
      dia: String(d.dia),
      entradas: inteiro(d.entradas),
      saidas: inteiro(d.saidas),
      lancamentos: lista(d.lancamentos).map(lancamento),
    })),
  };
}
