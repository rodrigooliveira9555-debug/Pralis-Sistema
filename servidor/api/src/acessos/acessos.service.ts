import {
  CARGOS_SUGERIDOS,
  resolverPermissoes,
  type AcessosUsuario,
  type AcessosUsuarioResposta,
  type CargoAcessoEntrada,
  type CargoAcessoResposta,
  type ChavePermissao,
  type EditarCargoAcesso,
  type PerfilSessao
} from "@cicluz/shared";
import { exigirPermissao, exigirQuePossaConceder } from "../auth/permissoes.ts";
import { banco } from "../banco/conexao.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import { marcarAcessosConfigurados, obterUsuarioDaEmpresa, registrarAuditoria } from "../usuarios/usuarios.repository.ts";
import {
  acessosDoUsuario,
  atualizarCargo,
  auditarCargo,
  inserirCargo,
  listarCargosDaEmpresa,
  obterCargoDaEmpresa,
  substituirExcecoesUsuario,
  substituirPermissoesCargo,
  type CargoLinha
} from "./acessos.repository.ts";

const SEM_PERMISSAO = "Sem permissão para montar cargos e acessos.";

// O Postgres devolve 23505 na violação de índice único; o drizzle embrulha o erro em `cause`.
export function violouUnico(erro: unknown, indice: string) {
  const alvo = (erro as { cause?: unknown })?.cause ?? erro;
  const pg = alvo as { code?: string; constraint?: string };
  return pg?.code === "23505" && pg.constraint === indice;
}

const erroNomeEmUso = () => conflito("Já existe um cargo de acesso com esse nome.", "CARGO_NAME_IN_USE");

const paraResposta = (cargo: CargoLinha): CargoAcessoResposta => ({
  ...cargo,
  permissoes: cargo.permissoes as ChavePermissao[]
});

async function cargoDaEmpresa(perfil: PerfilSessao, cargoId: string) {
  const cargo = await obterCargoDaEmpresa(perfil.empresa.id, cargoId);
  if (!cargo) throw new ErroDominio("Cargo de acesso não encontrado", 404, "CARGO_NOT_FOUND");
  return cargo;
}

// A lista também alimenta o campo "Cargos" da tela Usuários.
export async function listarCargos(perfil: PerfilSessao) {
  exigirPermissao(perfil, ["permissoes_gerenciar", "usuarios_visualizar"], SEM_PERMISSAO);
  return (await listarCargosDaEmpresa(perfil.empresa.id)).map(paraResposta);
}

export async function criarCargo(perfil: PerfilSessao, dados: CargoAcessoEntrada) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  exigirQuePossaConceder(perfil, dados.permissoes);
  let cargoId = "";
  try {
    await banco.transaction(async (tx) => {
      cargoId = await inserirCargo(tx, { empresaId: perfil.empresa.id, nome: dados.nome, descricao: dados.descricao });
      await substituirPermissoesCargo(tx, cargoId, [...new Set(dados.permissoes)]);
      await auditarCargo(tx, { empresaId: perfil.empresa.id, atorId: perfil.usuarioId, cargoId, acao: "criou", detalhe: { ...dados } });
    });
  } catch (erro) {
    if (violouUnico(erro, "cargos_acesso_empresa_nome_uq")) throw erroNomeEmUso();
    throw erro;
  }
  return paraResposta(await cargoDaEmpresa(perfil, cargoId));
}

// Quem não é administrador só mexe em cargo que está todo dentro do que ele tem (antes e depois):
// assim não reativa cargo mais forte que ele, não acrescenta o que não tem e não desativa, de
// quem está acima dele, o acesso que ele nem tem.
export async function editarCargo(perfil: PerfilSessao, cargoId: string, dados: EditarCargoAcesso) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  const atual = await cargoDaEmpresa(perfil, cargoId);
  exigirQuePossaConceder(perfil, [...atual.permissoes, ...(dados.permissoes ?? [])]);
  try {
    await banco.transaction(async (tx) => {
      await atualizarCargo(tx, perfil.empresa.id, cargoId, dados);
      if (dados.permissoes) await substituirPermissoesCargo(tx, cargoId, [...new Set(dados.permissoes)]);
      await auditarCargo(tx, {
        empresaId: perfil.empresa.id,
        atorId: perfil.usuarioId,
        cargoId,
        acao: "alterou",
        detalhe: { antes: { ativo: atual.ativo, permissoes: atual.permissoes }, pedido: { ...dados } }
      });
    });
  } catch (erro) {
    if (violouUnico(erro, "cargos_acesso_empresa_nome_uq")) throw erroNomeEmUso();
    throw erro;
  }
  return paraResposta(await cargoDaEmpresa(perfil, cargoId));
}

// Cria os cargos sugeridos que a empresa ainda não tem (pelo nome). Os que já existem não mudam.
export async function criarCargosSugeridos(perfil: PerfilSessao) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  const existentes = new Set((await listarCargosDaEmpresa(perfil.empresa.id)).map((cargo) => cargo.nome.toLocaleLowerCase("pt-BR")));
  const novos = CARGOS_SUGERIDOS.filter((cargo) => !existentes.has(cargo.nome.toLocaleLowerCase("pt-BR")));
  for (const sugerido of novos) exigirQuePossaConceder(perfil, sugerido.permissoes);
  try {
    await banco.transaction(async (tx) => {
      for (const sugerido of novos) {
        const cargoId = await inserirCargo(tx, { empresaId: perfil.empresa.id, nome: sugerido.nome, descricao: sugerido.descricao });
        await substituirPermissoesCargo(tx, cargoId, sugerido.permissoes);
        await auditarCargo(tx, { empresaId: perfil.empresa.id, atorId: perfil.usuarioId, cargoId, acao: "criou", detalhe: { sugerido: true } });
      }
    });
  } catch (erro) {
    // Dois cliques ao mesmo tempo: o segundo encontra os cargos já criados pelo primeiro.
    if (violouUnico(erro, "cargos_acesso_empresa_nome_uq")) throw erroNomeEmUso();
    throw erro;
  }
  return { criados: novos.length, cargos: (await listarCargosDaEmpresa(perfil.empresa.id)).map(paraResposta) };
}

type Alvo = NonNullable<Awaited<ReturnType<typeof obterUsuarioDaEmpresa>>>;
type Acessos = Awaited<ReturnType<typeof acessosDoUsuario>>;

const ehAdministrador = (alvo: Alvo) => alvo.papel === "administrador";
const ehLegado = (alvo: Alvo) => !ehAdministrador(alvo) && alvo.acessosConfiguradosEm === null;

/** Permissões efetivas de uma pessoa, opcionalmente simulando outros cargos/exceções. */
type CargoSimples = { nome: string; ativo: boolean; permissoes: readonly string[] };

export function efetivasDe(alvo: Alvo, acessos: Acessos, simular: { cargos?: CargoSimples[]; excecoes?: Record<string, boolean> } = {}) {
  const configurando = simular.cargos !== undefined || simular.excecoes !== undefined;
  const cargos = simular.cargos ?? acessos.cargos;
  return resolverPermissoes({
    papel: ehAdministrador(alvo) ? "administrador" : "usuario",
    // Mexer em cargo ou ajuste encerra o acesso de antes (a conta passa a seguir os cargos).
    legado: ehLegado(alvo) && !configurando,
    cargos: cargos.filter((cargo) => cargo.ativo),
    excecoes: simular.excecoes ?? acessos.excecoes
  });
}

/** Quem não é administrador: o que a pessoa ganha com a mudança precisa estar no que o autor tem. */
export function exigirGanhoPermitido(perfil: PerfilSessao, antes: Map<ChavePermissao, unknown>, depois: Map<ChavePermissao, unknown>) {
  exigirQuePossaConceder(perfil, [...depois.keys()].filter((chave) => !antes.has(chave)));
}

/** Quem não é administrador só mexe em quem não tem acesso que ele mesmo não tem. */
export function exigirAlvoAoAlcance(perfil: PerfilSessao, efetivasAlvo: Map<ChavePermissao, unknown>) {
  if (perfil.papel === "administrador") return;
  if ([...efetivasAlvo.keys()].some((chave) => !perfil.permissoes.includes(chave))) {
    throw proibido("Esta pessoa tem acessos que você não tem. Só o administrador altera a conta dela.", "TARGET_ABOVE_YOU");
  }
}

function montarResposta(alvo: Alvo, acessos: Acessos): AcessosUsuarioResposta {
  return {
    legado: ehLegado(alvo),
    cargos: acessos.cargos.map((cargo) => cargo.id),
    excecoes: acessos.excecoes,
    efetivas: [...efetivasDe(alvo, acessos)].map(([chave, origem]) => ({ chave, origem }))
  };
}

async function pessoaDaEmpresa(perfil: PerfilSessao, usuarioId: string) {
  const alvo = await obterUsuarioDaEmpresa(perfil.empresa.id, usuarioId);
  if (!alvo) throw new ErroDominio("Usuário não encontrado", 404, "USER_NOT_FOUND");
  return alvo;
}

export async function obterAcessos(perfil: PerfilSessao, usuarioId: string) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  const alvo = await pessoaDaEmpresa(perfil, usuarioId);
  return montarResposta(alvo, await acessosDoUsuario(usuarioId));
}

// Confere os cargos pedidos: da empresa e ativos. Devolve as linhas para simular o resultado.
export async function validarCargos(perfil: PerfilSessao, cargos: readonly string[]) {
  if (!cargos.length) return [];
  const daEmpresa = await listarCargosDaEmpresa(perfil.empresa.id);
  const escolhidos = [...new Set(cargos)].map((id) => daEmpresa.find((cargo) => cargo.id === id));
  if (escolhidos.some((cargo) => !cargo || !cargo.ativo)) {
    throw new ErroDominio("Cargo de acesso inexistente ou desativado.", 400, "CARGO_INVALID");
  }
  return escolhidos as CargoLinha[];
}

export async function salvarAcessos(perfil: PerfilSessao, usuarioId: string, dados: AcessosUsuario) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  if (usuarioId === perfil.usuarioId) throw conflito("Você não pode mudar os próprios acessos.", "SELF_ACCESS");
  const alvo = await pessoaDaEmpresa(perfil, usuarioId);
  if (ehAdministrador(alvo)) throw conflito("O administrador já tem todos os acessos.", "ADMIN_HAS_ALL");
  const acessos = await acessosDoUsuario(usuarioId);
  const antes = efetivasDe(alvo, acessos);
  const depois = efetivasDe(alvo, acessos, { excecoes: dados.excecoes });
  exigirAlvoAoAlcance(perfil, antes);
  exigirGanhoPermitido(perfil, antes, depois);
  await banco.transaction(async (tx) => {
    await substituirExcecoesUsuario(tx, usuarioId, dados.excecoes);
    await marcarAcessosConfigurados(tx, perfil.empresa.id, usuarioId);
    await registrarAuditoria(tx, {
      empresaId: perfil.empresa.id,
      atorId: perfil.usuarioId,
      alvoId: usuarioId,
      acao: "alterou_acessos",
      detalhe: { excecoesAntes: acessos.excecoes, excecoes: dados.excecoes, antes: [...antes.keys()], depois: [...depois.keys()] }
    });
  });
  return montarResposta({ ...alvo, acessosConfiguradosEm: alvo.acessosConfiguradosEm ?? new Date() }, await acessosDoUsuario(usuarioId));
}
