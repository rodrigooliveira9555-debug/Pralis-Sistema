import { randomUUID } from "node:crypto";
import {
  DADOS_DO_S2,
  PERMISSAO_EDITAR_PRODUTOS,
  PERMISSAO_VER_PRODUTOS,
  casarGrupo,
  casarLocal,
  vinculoManualDe,
  type FiltroProdutos,
  type ImportacaoProdutos,
  type PaginaProdutos,
  type PerfilSessao,
  type ProdutoCriacao,
  type ProdutoEdicao,
  type ProdutoResposta,
  type TransferenciaProdutos
} from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";
import { exigirPermissao } from "../auth/permissoes.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import {
  atualizarComVersao,
  atualizarVinculo,
  catalogoAtivado,
  contarProdutos,
  existeCodigo,
  gravarProdutos,
  gravarUltimoCodigo,
  gruposParaCasar,
  idsExistentes,
  inserirProduto,
  inserirSeNaoExiste,
  maiorCodigoGravado,
  travarEmpresa,
  listarAtivos,
  listarProdutos,
  locaisParaCasar,
  obterProduto,
  produtosPorAppOuCodigo,
  todosOsProdutos,
  travarUltimoCodigo,
  type LinhaProduto,
  type NovoProduto
} from "./produtos.repository.ts";

// Regra do código interno (veio do S1/app, era a de dist/compras/produto-regras.js e agora mora SÓ aqui): abaixo de
// 700000 é código de produto; o último código antes do S2 era 13129, então o primeiro produto novo é 13130.
const FAIXA_PRODUTO = 700_000;
const ULTIMO_CODIGO_DE_PRODUTO = 13_129;

const SEM_VER = "Você não tem acesso aos produtos (permissão de Compras).";
const SEM_EDITAR = "Você não pode cadastrar nem alterar produtos (permissão de Compras).";
const exigirVer = (perfil: PerfilSessao) => exigirPermissao(perfil, PERMISSAO_VER_PRODUTOS, SEM_VER);
const exigirEditar = (perfil: PerfilSessao) => exigirPermissao(perfil, PERMISSAO_EDITAR_PRODUTOS, SEM_EDITAR);
function exigirAdministrador(perfil: PerfilSessao) {
  if (perfil.papel !== "administrador") throw proibido("Só o administrador importa do app de produtos e revincula.", "ADMIN_ONLY");
}

function resposta(linha: { produto: LinhaProduto; semGrupo: boolean; semLocal: boolean }): ProdutoResposta {
  const p = linha.produto;
  return {
    id: p.id, codigoInterno: p.codigoInterno, codigoBarras: p.codigoBarras, nome: p.nome, descricao: p.descricao, marca: p.marca,
    tipo: p.tipo as ProdutoResposta["tipo"], status: p.status as ProdutoResposta["status"], liberadoCompra: p.liberadoCompra,
    grupoId: p.grupoId, subgrupoId: p.subgrupoId, localId: p.localId, custo: p.custo, margem: p.margem, precoVenda: p.precoVenda,
    calculoAutomatico: p.calculoAutomatico, dados: (p.dados ?? {}) as Record<string, unknown>, appId: p.appId, versao: p.versao,
    semGrupo: Boolean(linha.semGrupo), semLocal: Boolean(linha.semLocal), atualizadoEm: p.atualizadoEm.toISOString()
  };
}
const naoEncontrado = () => new ErroDominio("Produto não encontrado", 404, "NOT_FOUND");
const nulo = <T>(v: T | null | undefined) => (v === undefined || v === "" ? null : v);

/* ---------- Consultas ---------- */
export async function listar(perfil: PerfilSessao, filtro: FiltroProdutos): Promise<PaginaProdutos> {
  exigirVer(perfil);
  const [{ total, linhas }, contagens] = await Promise.all([listarProdutos(perfil.empresa.id, filtro), contarProdutos(perfil.empresa.id)]);
  return { itens: linhas.map(resposta), total, pagina: filtro.pagina, paginas: Math.max(1, Math.ceil(total / filtro.tamanho)), contagens };
}

// Resumo dos ATIVOS: o cadastro COMPLETO de cada ativo (a tela guarda no aparelho, edita a partir dele e funciona
// sem internet; Compras, Produção e estoque leem daqui). Os inativos só pela listagem paginada.
export async function resumo(perfil: PerfilSessao) {
  exigirVer(perfil);
  const [linhas, ativado] = await Promise.all([listarAtivos(perfil.empresa.id), catalogoAtivado(perfil.empresa.id)]);
  // ativado = o catálogo já está no servidor; antes disso a tela continua com os produtos do aparelho.
  return { ativado, produtos: linhas.map(resposta) };
}

/* ---------- Transferência dos produtos do aparelho (uma vez por empresa; nunca sobrescreve) ---------- */
export async function transferir(perfil: PerfilSessao, lote: TransferenciaProdutos) {
  exigirAdministrador(perfil);
  const empresaId = perfil.empresa.id;
  // Os lotes só inserem; o catálogo passa a valer (linha de produtos_codigo) no pedido de conclusão.
  await banco.transaction(async (tx) => {
    await travarEmpresa(tx, empresaId);
    const jaNoServidor = await idsExistentes(empresaId, lote.produtos.map((p) => p.id));
    // Produto antigo sem código interno (e que ainda não está no servidor) recebe o próximo código.
    let ultimo = Math.max(ULTIMO_CODIGO_DE_PRODUTO, lote.maiorCodigo, await maiorCodigoGravado(tx, empresaId));
    const linhas: NovoProduto[] = lote.produtos.filter((p) => !jaNoServidor.has(p.id)).map((p) => {
      const c = colunas(p);
      let codigoInterno = nulo(p.codigoInterno);
      if (!codigoInterno) {
        ultimo += 1;
        if (ultimo >= FAIXA_PRODUTO) throw new ErroDominio("Faixa de código interno de produto esgotada", 409, "CODIGO_ESGOTADO");
        codigoInterno = String(ultimo).padStart(5, "0");
      }
      return {
        empresaId, id: p.id, codigoInterno, ...c, codigoBarras: c.codigoBarras ?? (p.codigoInterno ? null : codigoInterno),
        appId: nulo(p.appId), appLojaId: nulo(p.appLojaId), criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId
      };
    });
    await inserirSeNaoExiste(tx, linhas);
    if (lote.concluir) await gravarUltimoCodigo(tx, empresaId, Math.max(ULTIMO_CODIGO_DE_PRODUTO, lote.maiorCodigo));
  });
  // Quais do lote estão no servidor agora (inseridos agora ou antes). O que faltar fica no aparelho.
  const presentes = await idsExistentes(empresaId, lote.produtos.map((p) => p.id));
  return { recebidos: lote.produtos.length, presentes: presentes.size, faltando: lote.produtos.filter((p) => !presentes.has(p.id)).map((p) => ({ id: p.id, codigoInterno: p.codigoInterno ?? null })) };
}

export async function obter(perfil: PerfilSessao, id: string) {
  exigirVer(perfil);
  const linha = await obterProduto(perfil.empresa.id, id);
  if (!linha) throw naoEncontrado();
  return resposta(linha);
}

/* ---------- Cadastro ---------- */
function colunas(entrada: ProdutoCriacao) {
  return {
    nome: entrada.nome, descricao: entrada.descricao, marca: nulo(entrada.marca), codigoBarras: nulo(entrada.codigoBarras),
    tipo: entrada.tipo, status: entrada.status, liberadoCompra: entrada.status === "inativo" ? false : entrada.liberadoCompra,
    grupoId: nulo(entrada.grupoId), subgrupoId: nulo(entrada.subgrupoId), localId: nulo(entrada.localId),
    custo: nulo(entrada.custo), margem: nulo(entrada.margem), precoVenda: nulo(entrada.precoVenda),
    calculoAutomatico: entrada.calculoAutomatico, dados: entrada.dados
  };
}

// Código interno gerado AQUI, com a linha de produtos_codigo travada: dois aparelhos ao mesmo tempo não repetem.
export async function criar(perfil: PerfilSessao, entrada: ProdutoCriacao) {
  exigirEditar(perfil);
  const empresaId = perfil.empresa.id;
  const id = await banco.transaction(async (tx) => {
    const ultimo = await travarUltimoCodigo(tx, empresaId, ULTIMO_CODIGO_DE_PRODUTO);
    const proximo = ultimo + 1;
    if (proximo >= FAIXA_PRODUTO) throw new ErroDominio("Faixa de código interno de produto esgotada", 409, "CODIGO_ESGOTADO");
    const codigoInterno = String(proximo).padStart(5, "0");
    const novoId = "p-" + randomUUID();
    const c = colunas(entrada);
    // Código de barras vazio recebe o código interno (regra do app de produtos).
    await inserirProduto(tx, { empresaId, id: novoId, codigoInterno, ...c, codigoBarras: c.codigoBarras ?? codigoInterno, criadoPor: perfil.usuarioId, atualizadoPor: perfil.usuarioId });
    await gravarUltimoCodigo(tx, empresaId, proximo);
    return novoId;
  });
  return obter(perfil, id);
}

export async function editar(perfil: PerfilSessao, id: string, entrada: ProdutoEdicao) {
  exigirEditar(perfil);
  const empresaId = perfil.empresa.id;
  await banco.transaction(async (tx) => {
    const atual = await obterProduto(empresaId, id, tx);
    if (!atual) throw naoEncontrado();
    const manual = { ...vinculoManualDe(atual.produto.dados) };
    const c = colunas(entrada);
    // Grupo ou local trocado à mão: o "Revincular" não desfaz.
    if (c.grupoId !== atual.produto.grupoId || c.subgrupoId !== atual.produto.subgrupoId) manual.grupo = true;
    if (c.localId !== atual.produto.localId) manual.local = true;
    const gravado = await atualizarComVersao(tx, empresaId, id, entrada.versao, { ...c, dados: { ...c.dados, vinculoManual: manual }, atualizadoPor: perfil.usuarioId });
    if (!gravado) throw conflito("Outra pessoa alterou este produto enquanto você editava. Feche e abra de novo para ver a versão atual.", "PRODUTO_ALTERADO");
  });
  return obter(perfil, id);
}

/* ---------- Importação do app de produtos (lotes de até 500) ---------- */
export async function importar(perfil: PerfilSessao, lote: ImportacaoProdutos) {
  exigirAdministrador(perfil);
  const empresaId = perfil.empresa.id;
  const [grupos, nos] = await Promise.all([gruposParaCasar(empresaId), locaisParaCasar(empresaId)]);
  return banco.transaction(async (tx) => {
    const existentes = await produtosPorAppOuCodigo(tx, empresaId, lote.produtos.map((p) => p.appId), lote.produtos.map((p) => p.codigoInterno));
    const porApp = new Map(existentes.filter((p) => p.appId).map((p) => [p.appId!, p]));
    const porCodigo = new Map(existentes.map((p) => [p.codigoInterno, p]));
    let novos = 0; let atualizados = 0;
    const linhas: NovoProduto[] = [];
    const vistos = new Set<string>();
    for (const n of lote.produtos) {
      const atual = porApp.get(n.appId) ?? porCodigo.get(n.codigoInterno);
      const id = atual?.id ?? "pi-" + n.codigoInterno;
      if (vistos.has(id)) throw new ErroDominio(`Produto repetido no lote: código ${n.codigoInterno}`, 400, "PRODUTO_REPETIDO_NO_LOTE");
      vistos.add(id);
      const dadosAtuais = (atual?.dados ?? {}) as Record<string, unknown>;
      const manual = vinculoManualDe(dadosAtuais);
      const casadoGrupo = casarGrupo(n.origemGrupo ?? "", grupos);
      const casadoLocal = casarLocal(n.origemLocais, nos);
      const doS2 = Object.fromEntries(DADOS_DO_S2.filter((c) => c in dadosAtuais).map((c) => [c, dadosAtuais[c]]));
      const c = colunas({ ...n, liberadoCompra: n.liberadoCompra ?? true });
      linhas.push({
        empresaId, id, codigoInterno: n.codigoInterno, ...c,
        // Liberado para compra é do S2: produto que já existe mantém; novo ativo nasce liberado; inativo nunca.
        liberadoCompra: n.status === "inativo" ? false : atual ? atual.liberadoCompra : true,
        grupoId: manual.grupo ? atual!.grupoId : casadoGrupo?.grupoId ?? null,
        subgrupoId: manual.grupo ? atual!.subgrupoId : casadoGrupo?.subgrupoId ?? null,
        localId: manual.local ? atual!.localId : casadoLocal,
        dados: { ...n.dados, ...doS2, origemApp: { grupo: n.origemGrupo ?? "", locais: n.origemLocais } },
        appId: n.appId, appLojaId: nulo(n.appLojaId),
        criadoPor: atual?.criadoPor ?? perfil.usuarioId, atualizadoPor: perfil.usuarioId
      });
      if (atual) atualizados++; else novos++;
    }
    // Código interno de um produto novo não pode ser de outro produto que não casou (ex.: cadastrado à mão).
    for (const l of linhas) {
      const dono = await existeCodigo(tx, empresaId, l.codigoInterno);
      if (dono && dono !== l.id) throw conflito(`O código interno ${l.codigoInterno} já é de outro produto do S2.`, "CODIGO_EM_USO");
    }
    await gravarProdutos(tx, linhas);
    await gravarUltimoCodigo(tx, empresaId, Math.max(ULTIMO_CODIGO_DE_PRODUTO, lote.maiorCodigoApp));
    return { novos, atualizados };
  });
}

/* ---------- Revincular por nome (depois de ajustar grupos ou a árvore de locais) ---------- */
export async function revincular(perfil: PerfilSessao) {
  exigirAdministrador(perfil);
  const empresaId = perfil.empresa.id;
  const [grupos, nos] = await Promise.all([gruposParaCasar(empresaId), locaisParaCasar(empresaId)]);
  return banco.transaction(async (tx) => {
    let mudaram = 0;
    for (const p of await todosOsProdutos(empresaId, tx)) {
      const dados = (p.dados ?? {}) as { origemApp?: { grupo?: string; locais?: string[] } };
      const origem = dados.origemApp;
      if (!origem) continue;
      const manual = vinculoManualDe(p.dados);
      const g = manual.grupo ? { grupoId: p.grupoId, subgrupoId: p.subgrupoId } : casarGrupo(origem.grupo ?? "", grupos) ?? { grupoId: null, subgrupoId: null };
      const localId = manual.local ? p.localId : casarLocal(origem.locais ?? [], nos);
      if (g.grupoId !== p.grupoId || g.subgrupoId !== p.subgrupoId || localId !== p.localId) {
        await atualizarVinculo(tx, empresaId, p.id, { grupoId: g.grupoId, subgrupoId: g.subgrupoId, localId });
        mudaram++;
      }
    }
    return { mudaram };
  });
}
