import {
  booleano,
  centavos,
  dataIso,
  dataObrigatoria,
  ErroProjecao,
  inteiro,
  lista,
  objeto,
  opcao,
  percentual,
  texto,
  textoObrigatorio
} from "./leitura.ts";

// Lê "cicluz-financial-hierarchy-v1" e devolve as linhas das tabelas fin_*. Função pura (sem banco):
// o formato foi levantado de groups.js (editor `edit()`, `readOperatorFees`, seeds `groupSeed`).

const COLECOES_HIERARQUICAS = ["mercadorias", "despesas", "vendas", "retiradas"] as const;
type ColecaoHierarquica = (typeof COLECOES_HIERARQUICAS)[number];

const DOCUMENTOS = new Set(["DOC/F", "DOC/NF", "DOC/F/NF"]);

function identidade(item: Record<string, unknown>, ordem: number, onde: string) {
  const documento = texto(item["document"]);
  if (documento && !DOCUMENTOS.has(documento)) throw new ErroProjecao(`${onde}: referência documental "${documento}" desconhecida`);
  const cor = texto(item["color"]);
  return {
    nome: textoObrigatorio(item["name"], `${onde}, nome`),
    ativo: item["active"] !== false,
    ordem,
    icone: String(item["icon"] ?? 0),
    modoIdentidade: texto(item["identityMode"]),
    sigla: texto(item["sigla"]),
    cor: cor && /^#[0-9a-f]{6}$/i.test(cor) ? cor : null,
    documento
  };
}

export type LinhaGrupo = ReturnType<typeof identidade> & {
  colecao: ColecaoHierarquica;
  itemId: string;
  paiId: string | null;
  finalidade: string | null;
  lancamentoDireto: boolean;
};

export type LinhaTaxa = {
  operadoraId: string;
  bandeiraId: string;
  ordem: number;
  inicio: string;
  fim: string | null;
  modalidade: string;
  parcelaDe: number | null;
  parcelaAte: number | null;
  mdrPercentual: string | null;
  tarifaCentavos: number | null;
  antecipacaoModo: string | null;
  antecipacaoPercentual: string | null;
  antecipacaoPeriodo: string | null;
  prazoDias: number | null;
  tipoDia: string | null;
  observacoes: string | null;
  despesaId: string;
  contaNome: string | null;
};

function idDe(item: Record<string, unknown>, onde: string) {
  return textoObrigatorio(item["id"], `${onde}, id`);
}

export function lerFinanceiro(documento: unknown) {
  const raiz = objeto(documento, "Financeiro");

  const grupos: LinhaGrupo[] = [];
  for (const colecao of COLECOES_HIERARQUICAS) {
    lista(raiz[colecao], colecao).forEach((bruto, ordem) => {
      const onde = `${colecao}, grupo ${ordem + 1}`;
      const item = objeto(bruto, onde);
      const id = idDe(item, onde);
      const base = identidade(item, ordem, onde);
      const finalidadeDe = (fonte: Record<string, unknown>) =>
        colecao === "mercadorias" ? opcao(fonte["purpose"]) : null;
      grupos.push({
        ...base,
        colecao,
        itemId: id,
        paiId: null,
        finalidade: finalidadeDe(item),
        lancamentoDireto: colecao === "despesas" && booleano(item["directEntry"], false)
      });
      lista(item["children"], `${onde}, subgrupos`).forEach((brutoFilho, ordemFilho) => {
        const ondeFilho = `${colecao}, "${base.nome}", subgrupo ${ordemFilho + 1}`;
        const filho = objeto(brutoFilho, ondeFilho);
        grupos.push({
          ...identidade(filho, ordemFilho, ondeFilho),
          colecao,
          itemId: idDe(filho, ondeFilho),
          paiId: id,
          finalidade: finalidadeDe(filho),
          lancamentoDireto: false
        });
      });
    });
  }

  const tiposVenda = lista(raiz["tipos-venda"], "tipos de venda").map((bruto, ordem) => {
    const onde = `tipo de venda ${ordem + 1}`;
    const item = objeto(bruto, onde);
    return { itemId: idDe(item, onde), ...identidade(item, ordem, onde) };
  });
  const idsTipos = new Set(tiposVenda.map((tipo) => tipo.itemId));

  const bandeiras = lista(raiz["bandeiras"], "bandeiras").map((bruto, ordem) => {
    const onde = `bandeira ${ordem + 1}`;
    const item = objeto(bruto, onde);
    const base = identidade(item, ordem, onde);
    const tipoVendaId = texto(item["saleTypeId"]);
    if (tipoVendaId && !idsTipos.has(tipoVendaId)) {
      throw new ErroProjecao(`Bandeira "${base.nome}": tipo de venda vinculado não existe mais`);
    }
    return { itemId: idDe(item, onde), ...base, tipoVendaId };
  });
  const nomesBandeiras = new Map(bandeiras.map((bandeira) => [bandeira.itemId, bandeira.nome]));

  const idsDespesas = new Set(grupos.filter((grupo) => grupo.colecao === "despesas").map((grupo) => grupo.itemId));

  const operadoras: Array<{ itemId: string; custosFixos: string | null } & ReturnType<typeof identidade>> = [];
  const taxas: LinhaTaxa[] = [];
  lista(raiz["operadoras"], "operadoras").forEach((bruto, ordem) => {
    const onde = `operadora ${ordem + 1}`;
    const item = objeto(bruto, onde);
    const base = identidade(item, ordem, onde);
    const operadoraId = idDe(item, onde);
    const fees = item["fees"] === undefined ? {} : objeto(item["fees"], `Operadora "${base.nome}", taxas`);
    operadoras.push({ itemId: operadoraId, ...base, custosFixos: texto(fees["overhead"]) });

    const porBandeira = fees["brands"] === undefined ? {} : objeto(fees["brands"], `Operadora "${base.nome}", taxas`);
    for (const [bandeiraId, regras] of Object.entries(porBandeira)) {
      const nomeBandeira = nomesBandeiras.get(bandeiraId);
      if (!nomeBandeira) throw new ErroProjecao(`Operadora "${base.nome}": taxa ligada a uma bandeira que não existe`);
      lista(regras, `Operadora "${base.nome}", bandeira "${nomeBandeira}"`).forEach((brutoRegra, ordemRegra) => {
        const ondeRegra = `Operadora "${base.nome}", bandeira "${nomeBandeira}", condição ${ordemRegra + 1}`;
        const regra = objeto(brutoRegra, ondeRegra);
        const despesaId = textoObrigatorio(regra["expenseId"], `${ondeRegra}, grupo de despesa`);
        if (!idsDespesas.has(despesaId)) {
          throw new ErroProjecao(`${ondeRegra}: o grupo de despesa vinculado foi excluído; escolha outro na tela`);
        }
        const modalidade = opcao(regra["mode"]);
        if (!modalidade) throw new ErroProjecao(`${ondeRegra}: modalidade não escolhida`);
        taxas.push({
          operadoraId,
          bandeiraId,
          ordem: ordemRegra,
          inicio: dataObrigatoria(regra["start"], `${ondeRegra}, início da vigência`),
          fim: dataIso(regra["end"], `${ondeRegra}, fim`),
          modalidade,
          parcelaDe: inteiro(regra["from"], `${ondeRegra}, parcela de`),
          parcelaAte: inteiro(regra["to"], `${ondeRegra}, parcela até`),
          mdrPercentual: percentual(regra["mdr"], `${ondeRegra}, MDR`),
          tarifaCentavos: centavos(regra["fixed"], `${ondeRegra}, tarifa`),
          antecipacaoModo: opcao(regra["advanceMode"]),
          antecipacaoPercentual: percentual(regra["advance"], `${ondeRegra}, antecipação`),
          antecipacaoPeriodo: opcao(regra["period"]),
          prazoDias: inteiro(regra["days"], `${ondeRegra}, prazo`),
          tipoDia: opcao(regra["dayKind"]),
          observacoes: texto(regra["notes"]),
          despesaId,
          contaNome: texto(regra["accountGroup"])
        });
      });
    }
  });

  const transferencias = lista(raiz["_transferHistory"], "histórico de transferências").map((bruto, ordem) => {
    const onde = `transferência ${ordem + 1}`;
    const item = objeto(bruto, onde);
    const data = texto(item["date"]);
    return {
      ordem,
      colecao: textoObrigatorio(item["module"], `${onde}, módulo`),
      paiId: texto(item["parentId"]),
      data: data && !Number.isNaN(Date.parse(data)) ? new Date(data) : null,
      origemId: textoObrigatorio(item["sourceId"], `${onde}, origem`),
      origemNome: texto(item["sourceName"]) ?? "",
      destinoId: texto(item["targetId"]),
      destinoNome: texto(item["targetName"]),
      copiaOrigem: item["sourceSnapshot"] ?? null
    };
  });

  return { grupos, tiposVenda, bandeiras, operadoras, taxas, transferencias };
}

export type Financeiro = ReturnType<typeof lerFinanceiro>;
