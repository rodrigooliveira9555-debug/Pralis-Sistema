import { centavosBr, dataObrigatoria, ErroProjecao, inteiro, lista, objeto, texto, textoObrigatorio } from "./leitura.ts";

// Leitura pura (sem banco) dos documentos de contas, cargos, salários, perfis de cargo, locais,
// organograma e identidade. Formatos levantados de index.html, job-profiles.js, location-tree.js,
// organogram.js, icon-library-manager.js e shared-colors.js.

const DOCUMENTOS = new Set(["DOC/F", "DOC/NF", "DOC/F/NF"]);

export function lerContas(grupos: unknown, detalhes: unknown) {
  const nomes = grupos === null ? [] : lista(objeto(grupos, "Contas")["contas"], "Contas");
  const porNome = detalhes === null ? {} : objeto(detalhes, "Detalhes das contas");
  return nomes.map((bruto, ordem) => {
    const nome = textoObrigatorio(bruto, `Conta ${ordem + 1}`);
    const detalhe = porNome[nome] === undefined ? {} : objeto(porNome[nome], `Conta "${nome}"`);
    const documento = texto(detalhe["document"]);
    if (documento && !DOCUMENTOS.has(documento)) throw new ErroProjecao(`Conta "${nome}": referência documental "${documento}" desconhecida`);
    const situacao = texto(detalhe["status"]) ?? "ATIVA";
    if (situacao !== "ATIVA" && situacao !== "INATIVA") throw new ErroProjecao(`Conta "${nome}": situação "${situacao}" desconhecida`);
    return { nome, ordem, situacao, documento, icone: texto(detalhe["icon"]) ?? "transfer" };
  });
}

type CargoTela = Record<string, unknown>;

function linhaCargo(cargo: CargoTela, chave: string, origem: "referencia" | "local", ordem: number, onde: string) {
  return {
    chave,
    origem,
    ordem,
    nome: textoObrigatorio(cargo["nome"], `${onde}, nome`),
    nomeReduzido: texto(cargo["nomeReduzido"]),
    categoria: texto(cargo["categoria"]),
    cbo: texto(cargo["cbo"]),
    titulo: texto(cargo["titulo"]),
    valorFichaCentavos: centavosBr(cargo["valor"], `${onde}, valor`),
    ano: texto(cargo["ano"]),
    sinonimos: texto(cargo["sinonimos"]),
    descricao: texto(cargo["descricao"]),
    icone: texto(cargo["icon"]),
    modoIdentidade: texto(cargo["identityMode"]),
    sigla: texto(cargo["sigla"]),
    cor: texto(cargo["color"])
  };
}

// Mesma montagem de jobsCurrent(): os locais ("local:i") e os de referência ("ref:i"), com a
// alteração local por cima e sem os de referência excluídos.
export function lerCargos(catalogo: CargoTela[], locaisDoc: unknown, alteracoesDoc: unknown) {
  const locais = locaisDoc === null ? [] : lista(locaisDoc, "Cargos");
  const alteracoes = alteracoesDoc === null ? {} : objeto(alteracoesDoc, "Cargos de referência");
  const linhas = locais.map((bruto, i) => linhaCargo(objeto(bruto, `Cargo ${i + 1}`), `local:${i}`, "local", i, `Cargo ${i + 1}`));
  catalogo.forEach((cargo, i) => {
    const alteracao = alteracoes[String(i)] === undefined ? null : objeto(alteracoes[String(i)], `Cargo de referência ${i + 1}`);
    if (alteracao?.["deleted"] === true) return;
    const dados = alteracao?.["data"] === undefined || alteracao?.["data"] === null ? cargo : objeto(alteracao["data"], `Cargo de referência ${i + 1}`);
    linhas.push(linhaCargo(dados, `ref:${i}`, "referencia", locais.length + i, `Cargo de referência ${i + 1}`));
  });
  return linhas;
}

export function lerSalarios(documento: unknown) {
  const lancamentos = documento === null ? [] : lista(documento, "Salários");
  const vigencias: Array<{ ordem: number; inicio: string; observacao: string | null }> = [];
  const valores: Array<{ vigenciaOrdem: number; posicao: number; cargoChave: string; cargoNome: string; valorCentavos: number }> = [];
  lancamentos.forEach((bruto, ordem) => {
    const onde = `Atualização salarial ${ordem + 1}`;
    const item = objeto(bruto, onde);
    vigencias.push({ ordem, inicio: dataObrigatoria(item["start"], `${onde}, início`), observacao: texto(item["note"]) });
    lista(item["values"], `${onde}, valores`).forEach((brutoValor, posicao) => {
      const ondeValor = `${onde}, valor ${posicao + 1}`;
      const valor = objeto(brutoValor, ondeValor);
      const reais = Number(valor["valor"]);
      if (!Number.isFinite(reais) || reais <= 0) throw new ErroProjecao(`${ondeValor}: valor precisa ser maior que zero`);
      valores.push({
        vigenciaOrdem: ordem,
        posicao,
        cargoChave: textoObrigatorio(valor["key"], `${ondeValor}, cargo`),
        cargoNome: textoObrigatorio(valor["nome"], `${ondeValor}, nome do cargo`),
        valorCentavos: Math.round(reais * 100)
      });
    });
  });
  return { vigencias, valores };
}

export function lerPerfis(documento: unknown) {
  if (documento === null) return { areas: [], requisitos: [], cargos: [], vinculos: [] };
  const raiz = objeto(documento, "Ficha de cargos");
  const areas = lista(raiz["areas"], "Áreas").map((bruto, ordem) => {
    const area = objeto(bruto, `Área ${ordem + 1}`);
    return { id: textoObrigatorio(area["id"], `Área ${ordem + 1}, id`), nome: textoObrigatorio(area["name"], `Área ${ordem + 1}, nome`), ordem };
  });
  const requisitos = lista(raiz["requirements"], "Exigências").map((bruto, ordem) => {
    const onde = `Exigência ${ordem + 1}`;
    const req = objeto(bruto, onde);
    return {
      id: textoObrigatorio(req["id"], `${onde}, id`),
      areaId: textoObrigatorio(req["areaId"], `${onde}, área`),
      grupo: textoObrigatorio(req["group"], `${onde}, grupo`),
      texto: textoObrigatorio(req["text"], `${onde}, texto`),
      ordem
    };
  });
  const idsRequisitos = new Set(requisitos.map((req) => req.id));
  const vinculos: Array<{ perfilCargoId: string; requisitoId: string }> = [];
  const cargos = lista(raiz["roles"], "Cargos da ficha").map((bruto, ordem) => {
    const onde = `Cargo da ficha ${ordem + 1}`;
    const role = objeto(bruto, onde);
    const id = textoObrigatorio(role["id"], `${onde}, id`);
    const cargoNome = textoObrigatorio(role["jobName"], `${onde}, cargo`);
    for (const requisitoId of new Set(lista(role["required"], `${onde}, exigências`).map((r) => String(r)))) {
      if (!idsRequisitos.has(requisitoId)) throw new ErroProjecao(`Ficha de "${cargoNome}": exigência vinculada não existe`);
      vinculos.push({ perfilCargoId: id, requisitoId });
    }
    return {
      id,
      areaId: textoObrigatorio(role["areaId"], `${onde}, área`),
      areaNome: texto(role["areaName"]),
      origemCargo: texto(role["sourceId"]),
      cargoNome,
      cbo: texto(role["cbo"]),
      missao: texto(role["mission"]),
      autonomia: texto(role["autonomy"]),
      ordem
    };
  });
  return { areas, requisitos, cargos, vinculos };
}

type LinhaArvore = { id: string; paiId: string | null; nivel: number; ordem: number; no: Record<string, unknown> };

// Percorre em largura: o pai sempre entra antes dos filhos (FK autorreferente).
function percorrerArvore(raizes: unknown[], nome: string, nivelMaximo: number) {
  const linhas: LinhaArvore[] = [];
  let fila = raizes.map((bruto, ordem) => ({ bruto, paiId: null as string | null, nivel: 1, ordem }));
  while (fila.length) {
    const proxima: typeof fila = [];
    for (const { bruto, paiId, nivel, ordem } of fila) {
      const onde = `${nome}, nível ${nivel}, item ${ordem + 1}`;
      if (nivel > nivelMaximo) throw new ErroProjecao(`${onde}: passa de ${nivelMaximo} níveis`);
      const no = objeto(bruto, onde);
      const id = textoObrigatorio(no["id"], `${onde}, id`);
      linhas.push({ id, paiId, nivel, ordem, no });
      lista(no["children"], `${onde}, filhos`).forEach((filho, ordemFilho) =>
        proxima.push({ bruto: filho, paiId: id, nivel: nivel + 1, ordem: ordemFilho })
      );
    }
    fila = proxima;
  }
  return linhas;
}

function dataOuNula(valor: unknown) {
  const limpo = texto(valor);
  return limpo && !Number.isNaN(Date.parse(limpo)) ? new Date(limpo) : null;
}

export function lerLocais(documento: unknown) {
  if (documento === null) return { locais: [], transferencias: [] };
  // Formato legado: a árvore direto como lista.
  const raiz = Array.isArray(documento) ? { tree: documento, history: [] } : objeto(documento, "Locais");
  const locais = percorrerArvore(lista(raiz["tree"], "Locais"), "Locais", 4).map(({ id, paiId, nivel, ordem, no }) => ({
    id,
    paiId,
    nivel,
    ordem,
    nome: textoObrigatorio(no["name"], `Local ${id}, nome`),
    icone: no["icon"] === undefined ? null : String(no["icon"]),
    modoIdentidade: texto(no["identityMode"]),
    sigla: texto(no["sigla"]),
    cor: texto(no["color"])
  }));
  const transferencias = lista(raiz["history"], "Transferências de locais").map((bruto, ordem) => {
    const onde = `Transferência de local ${ordem + 1}`;
    const item = objeto(bruto, onde);
    const nivel = inteiro(item["level"], `${onde}, nível`);
    return {
      ordem,
      nivel,
      data: dataOuNula(item["date"]),
      origemId: textoObrigatorio(item["sourceId"], `${onde}, origem`),
      origemNome: texto(item["sourceName"]) ?? "",
      destinoId: texto(item["targetId"]),
      destinoNome: texto(item["targetName"]),
      copiaOrigem: item["sourceSnapshot"] ?? null
    };
  });
  return { locais, transferencias };
}

export function lerOrganograma(documento: unknown) {
  if (documento === null) return { posicoes: [], versoes: [] };
  const raiz = objeto(documento, "Organograma");
  const posicoes = percorrerArvore(lista(raiz["nodes"], "Organograma"), "Organograma", 50).map(({ id, paiId, ordem, no }) => {
    const quantidade = inteiro(no["quantity"], `Posição ${id}, quantidade`) ?? 1;
    if (quantidade < 1) throw new ErroProjecao(`Posição de "${texto(no["jobName"]) ?? id}": quantidade menor que 1`);
    return {
      id,
      paiId,
      ordem,
      cargoChave: texto(no["jobKey"]),
      cargoNome: textoObrigatorio(no["jobName"], `Posição ${id}, cargo`),
      cbo: texto(no["cbo"]),
      quantidade,
      rotulo: texto(no["label"])
    };
  });
  const versoes = lista(raiz["versions"], "Versões do organograma").map((bruto, ordem) => {
    const versao = objeto(bruto, `Versão do organograma ${ordem + 1}`);
    return { ordem, data: dataOuNula(versao["date"]), posicoes: versao["nodes"] ?? [] };
  });
  return { posicoes, versoes };
}

export function lerIdentidade(biblioteca: unknown, cores: unknown) {
  const raiz = biblioteca === null ? {} : objeto(biblioteca, "Biblioteca de ícones");
  const ocultos = new Set(lista(raiz["hidden"], "Ícones ocultos").map(String));
  const excluidos = new Set(lista(raiz["deleted"], "Ícones excluídos").map(String));
  const icones = lista(raiz["custom"], "Ícones próprios").map((bruto, i) => {
    const icone = objeto(bruto, `Ícone ${i + 1}`);
    const id = textoObrigatorio(icone["id"], `Ícone ${i + 1}, id`);
    return {
      id,
      rotulo: texto(icone["label"]),
      desenho: textoObrigatorio(icone["path"], `Ícone ${i + 1}, desenho`),
      oculto: ocultos.has(id),
      excluido: excluidos.has(id)
    };
  });
  // Cores: a árvore de locais pode gravar maiúsculas; o banco guarda minúsculas e sem repetição.
  const vistas = new Set<string>();
  const listaCores = (cores === null ? [] : lista(cores, "Cores")).flatMap((bruto) => {
    const cor = String(bruto).trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(cor) || vistas.has(cor)) return [];
    vistas.add(cor);
    return [cor];
  });
  return { icones, cores: listaCores.map((cor, ordem) => ({ cor, ordem })) };
}
