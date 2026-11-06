import {
  centavosParaDecimalBanco,
  datasDaRecorrencia,
  diaNegocio,
  diferencaEmDias,
  liquidoCentavos,
  liquidoDeSomasCentavos,
  somarDias,
  type CategoriaLancamento,
  type DiscriminarEntrada,
  type LancamentoEntrada,
  type LancamentoResposta,
  type PerfilSessao
} from "@cicluz/shared";
import { ErroDominio } from "../erros.ts";
import {
  apagarFuturasDaSerie,
  atualizarLancamento,
  executarEmTransacao,
  inserirLancamento,
  inserirRecorrencia,
  listarLancamentos,
  obterConta,
  obterGrupos,
  obterLancamento,
  serieExiste,
  travarLancamento,
  type LinhaLancamento,
  type NovoLancamento
} from "./lancamentos.repository.ts";
import { calcularAcrescimo, calcularItens, conferirDataPagamento, exigir, valorEmBanco } from "./lancamentos.regras.ts";

// Edição concorrente: a tela manda o "atualizadoEm" que tinha; se outra pessoa salvou depois, 409 em
// vez de sobrescrever calado (ex.: uma discriminação feita por outro usuário sumiria).
function exigirMesmaVersao(atual: LinhaLancamento, base: string | undefined) {
  if (base && new Date(base).getTime() !== atual.atualizadoEm.getTime()) {
    throw new ErroDominio(
      "Outra pessoa alterou este lançamento enquanto você editava. Feche e abra de novo para ver a versão atual.",
      409,
      "LANCAMENTO_ALTERADO"
    );
  }
}

function naoEncontrado() {
  return new ErroDominio("Lançamento não encontrado", 404, "NOT_FOUND");
}

// Conta e grupos existem AGORA nos cadastros da empresa? Devolve os nomes para guardar junto.
async function conferirCadastros(
  perfil: PerfilSessao,
  categoria: CategoriaLancamento,
  entrada: { contaNome?: string | null | undefined; grupoId?: string | null | undefined; itens: Array<{ grupoId?: string | null | undefined }> }
) {
  const empresaId = perfil.empresa.id;
  if (entrada.contaNome && !(await obterConta(empresaId, entrada.contaNome))) {
    throw new ErroDominio(`Conta "${entrada.contaNome}" não existe no cadastro de contas.`, 400, "CONTA_DESCONHECIDA");
  }
  const ids = [entrada.grupoId, ...entrada.itens.map((item) => item.grupoId)].filter((id): id is string => Boolean(id));
  const nomes = await obterGrupos(empresaId, categoria, [...new Set(ids)]);
  const faltando = ids.find((id) => !nomes.has(id));
  if (faltando) throw new ErroDominio("Grupo não encontrado no cadastro desta categoria.", 400, "GRUPO_DESCONHECIDO");
  return nomes;
}

function cabecalho(
  perfil: PerfilSessao,
  entrada: Omit<LancamentoEntrada, "recorrencia">,
  nomes: Map<string, string>,
  valorDescontoCentavos: number
): Omit<NovoLancamento, "empresaId" | "categoria" | "criadoPor"> {
  return {
    dataReferencia: entrada.dataReferencia,
    dataVencimento: entrada.dataVencimento,
    dataPagamento: entrada.dataPagamento ?? null,
    observacao: entrada.observacao,
    valorOriginal: valorEmBanco(entrada.valorOriginal),
    jurosTipo: entrada.jurosTipo ?? null,
    jurosValorInformado:
      entrada.jurosValorInformado === null || entrada.jurosValorInformado === undefined ? null : String(entrada.jurosValorInformado),
    valorAcrescimo: centavosParaDecimalBanco(calcularAcrescimo(entrada)),
    descontoGeralTipo: entrada.descontoGeralTipo ?? null,
    descontoGeralValor:
      entrada.descontoGeralValor === null || entrada.descontoGeralValor === undefined ? null : String(entrada.descontoGeralValor),
    valorDesconto: centavosParaDecimalBanco(valorDescontoCentavos),
    contaNome: entrada.contaNome ?? null,
    grupoId: entrada.grupoId ?? null,
    grupoNome: entrada.grupoId ? (nomes.get(entrada.grupoId) ?? null) : null,
    numeroDocumentoFiscal: entrada.numeroDocumentoFiscal ?? null,
    dataDocumentoFiscal: entrada.dataDocumentoFiscal ?? null,
    atualizadoPor: perfil.usuarioId
  };
}

// Cria o lançamento; com recorrência (D3) a série inteira nasce na mesma transação, tudo ou nada.
export async function criarLancamento(perfil: PerfilSessao, categoria: CategoriaLancamento, entrada: LancamentoEntrada) {
  exigir(perfil, "criar", "Sem permissão para lançar.");
  const recorrente = entrada.recorrencia && entrada.recorrencia.repeticoes > 1;
  if (recorrente) exigir(perfil, "recorrencia", "Sem permissão para criar recorrência.");
  conferirDataPagamento(categoria, perfil, entrada.dataPagamento);
  const nomes = await conferirCadastros(perfil, categoria, entrada);
  const { itens, valorDescontoCentavos } = calcularItens(categoria, entrada.valorOriginal, entrada, nomes);
  const base = { ...cabecalho(perfil, entrada, nomes, valorDescontoCentavos), empresaId: perfil.empresa.id, categoria, criadoPor: perfil.usuarioId };

  if (!recorrente || !entrada.recorrencia) {
    const id = await executarEmTransacao((tx) => inserirLancamento(tx, base, itens));
    return { id };
  }

  const recorrencia = entrada.recorrencia;
  // As datas repetem o VENCIMENTO; cada ocorrência mantém o intervalo lançamento → vencimento.
  const serie = datasDaRecorrencia(entrada.dataVencimento, recorrencia);
  const intervalo = diferencaEmDias(entrada.dataReferencia, entrada.dataVencimento);
  const id = await executarEmTransacao(async (tx) => {
    const recorrenciaId = await inserirRecorrencia(tx, {
      empresaId: perfil.empresa.id,
      categoria,
      frequencia: recorrencia.frequencia,
      repeticoes: recorrencia.repeticoes,
      // Dias da semana só existem na frequência semanal (como no principal).
      diasSemana: recorrencia.frequencia === "semana" ? (recorrencia.diasSemana ?? null) : null,
      criadoPor: perfil.usuarioId
    });
    let primeiro = "";
    for (const [ordem, vencimento] of serie.datas.entries()) {
      // A 1ª ocorrência mantém o pagamento; as futuras nascem não pagas.
      const idOcorrencia = await inserirLancamento(
        tx,
        {
          ...base,
          dataVencimento: vencimento,
          dataReferencia: ordem === 0 ? entrada.dataReferencia : somarDias(vencimento, -intervalo),
          dataPagamento: ordem === 0 ? base.dataPagamento : null,
          recorrenciaId,
          recorrenciaOrdem: ordem + 1
        },
        itens
      );
      if (ordem === 0) primeiro = idOcorrencia;
    }
    return primeiro;
  });
  return { id, serie: serie.datas.length, serieLimitada: serie.limitadaPeloTeto };
}

function exigirEditavel(perfil: PerfilSessao, atual: LinhaLancamento) {
  exigir(perfil, "editar", "Sem permissão para editar lançamentos.");
  if (atual.dataPagamento) exigir(perfil, "editar_pago", "Sem permissão para editar lançamento pago.");
}

// Edição de UMA ocorrência (a série não muda). Itens substituídos por inteiro.
export async function editarLancamento(perfil: PerfilSessao, id: string, entrada: Omit<LancamentoEntrada, "recorrencia">) {
  const atualSemTrava = await obterLancamento(perfil.empresa.id, id);
  if (!atualSemTrava) throw naoEncontrado();
  const categoria = atualSemTrava.categoria as CategoriaLancamento;
  const nomes = await conferirCadastros(perfil, categoria, entrada);
  await executarEmTransacao(async (tx) => {
    const atual = await travarLancamento(tx, perfil.empresa.id, id);
    if (!atual) throw naoEncontrado();
    exigirEditavel(perfil, atual);
    exigirMesmaVersao(atual, entrada.atualizadoEmBase);
    if ((entrada.dataPagamento ?? null) !== atual.dataPagamento && atual.dataPagamento) {
      exigir(perfil, "pagar", "Sem permissão para alterar o pagamento.");
    }
    conferirDataPagamento(categoria, perfil, entrada.dataPagamento, atual.dataPagamento);
    const { itens, valorDescontoCentavos } = calcularItens(categoria, entrada.valorOriginal, entrada, nomes);
    await atualizarLancamento(tx, id, cabecalho(perfil, entrada, nomes, valorDescontoCentavos), itens);
  });
  return { id };
}

// Discriminar depois (só DES/MER): confere a soma contra o Valor JÁ GRAVADO.
export async function discriminarLancamento(perfil: PerfilSessao, id: string, entrada: DiscriminarEntrada) {
  exigir(perfil, "discriminar", "Sem permissão para discriminar.");
  const atualSemTrava = await obterLancamento(perfil.empresa.id, id);
  if (!atualSemTrava) throw naoEncontrado();
  const categoria = atualSemTrava.categoria as CategoriaLancamento;
  const nomes = await conferirCadastros(perfil, categoria, { itens: entrada.itens });
  await executarEmTransacao(async (tx) => {
    const atual = await travarLancamento(tx, perfil.empresa.id, id);
    if (!atual) throw naoEncontrado();
    exigirEditavel(perfil, atual);
    exigirMesmaVersao(atual, entrada.atualizadoEmBase);
    const { itens, valorDescontoCentavos } = calcularItens(categoria, atual.valorOriginal, entrada, nomes);
    await atualizarLancamento(
      tx,
      id,
      {
        descontoGeralTipo: entrada.descontoGeralTipo ?? null,
        descontoGeralValor:
          entrada.descontoGeralValor === null || entrada.descontoGeralValor === undefined ? null : String(entrada.descontoGeralValor),
        valorDesconto: centavosParaDecimalBanco(valorDescontoCentavos),
        atualizadoPor: perfil.usuarioId
      },
      itens
    );
  });
  return { id };
}

// Cancelar série: apaga só as ocorrências futuras e não pagas (R-063 do principal).
export async function cancelarSerie(perfil: PerfilSessao, recorrenciaId: string) {
  exigir(perfil, "cancelar_serie", "Sem permissão para cancelar uma série.");
  if (!(await serieExiste(perfil.empresa.id, recorrenciaId))) throw new ErroDominio("Série não encontrada", 404, "NOT_FOUND");
  const removidas = await apagarFuturasDaSerie(perfil.empresa.id, recorrenciaId, diaNegocio(new Date()));
  return { removidas };
}

function paraResposta(linha: LinhaLancamento, temItens: boolean): LancamentoResposta {
  const categoria = linha.categoria as CategoriaLancamento;
  return {
    id: linha.id,
    categoria,
    dataReferencia: linha.dataReferencia,
    dataVencimento: linha.dataVencimento,
    dataPagamento: linha.dataPagamento,
    observacao: linha.observacao,
    valorOriginal: linha.valorOriginal,
    jurosTipo: linha.jurosTipo,
    jurosValorInformado: linha.jurosValorInformado,
    valorAcrescimo: linha.valorAcrescimo,
    descontoGeralTipo: linha.descontoGeralTipo,
    descontoGeralValor: linha.descontoGeralValor,
    valorDesconto: linha.valorDesconto,
    valorTotal: centavosParaDecimalBanco(
      liquidoCentavos({ valorOriginal: linha.valorOriginal, valorDesconto: linha.valorDesconto, valorAcrescimo: linha.valorAcrescimo })
    ),
    contaNome: linha.contaNome,
    grupoId: linha.grupoId,
    grupoNome: linha.grupoNome,
    numeroDocumentoFiscal: linha.numeroDocumentoFiscal,
    dataDocumentoFiscal: linha.dataDocumentoFiscal,
    recorrenciaId: linha.recorrenciaId,
    recorrenciaOrdem: linha.recorrenciaOrdem,
    pendenteDiscriminacao: categoria !== "retiradas" && !temItens,
    atualizadoEm: linha.atualizadoEm.toISOString()
  };
}

export async function listar(
  perfil: PerfilSessao,
  categoria: CategoriaLancamento,
  filtro: { dataInicio?: string | undefined; dataFim?: string | undefined; situacao: "todos" | "pendentes" | "pagos"; page: number; pageSize: number }
) {
  exigir(perfil, "visualizar", "Sem permissão para ver lançamentos.");
  const { linhas, totais, idsComItens } = await listarLancamentos(
    { empresaId: perfil.empresa.id, categoria, dataInicio: filtro.dataInicio, dataFim: filtro.dataFim, situacao: filtro.situacao },
    { page: filtro.page, pageSize: filtro.pageSize }
  );
  return {
    lancamentos: linhas.map((linha) => paraResposta(linha, idsComItens.has(linha.id))),
    total: totais?.quantidade ?? 0,
    page: filtro.page,
    pageSize: filtro.pageSize,
    valorTotal: centavosParaDecimalBanco(
      liquidoDeSomasCentavos({
        somaOriginal: totais?.somaOriginal ?? 0,
        somaDesconto: totais?.somaDesconto ?? 0,
        somaAcrescimo: totais?.somaAcrescimo ?? 0
      })
    )
  };
}

export async function obter(perfil: PerfilSessao, id: string): Promise<LancamentoResposta> {
  exigir(perfil, "visualizar", "Sem permissão para ver lançamentos.");
  const linha = await obterLancamento(perfil.empresa.id, id);
  if (!linha) throw naoEncontrado();
  return {
    ...paraResposta(linha, linha.itens.length > 0),
    itens: linha.itens.map((item) => ({
      posicao: item.posicao,
      descricao: item.descricao,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      descontoTipo: item.descontoTipo,
      descontoValor: item.descontoValor,
      descontoTotalTipo: item.descontoTotalTipo,
      descontoTotalValor: item.descontoTotalValor,
      valorTotal: item.valorTotal,
      valorTotalComDesconto: item.valorTotalComDesconto,
      valorUnitarioComDesconto: item.valorUnitarioComDesconto,
      grupoId: item.grupoId,
      grupoNome: item.grupoNome
    }))
  };
}
