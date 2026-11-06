import {
  CARGOS_SUGERIDOS,
  resolverPermissoes,
  type AcessosUsuario,
  type AcessosUsuarioResposta,
  type CargoAcessoEntrada,
  type CargoAcessoResposta,
  type ChavePermissao,
  type EditarCargoAcesso,
  type Papel,
  type PerfilSessao
} from "@cicluz/shared";
import { exigirPermissao, exigirQuePossaConceder } from "../auth/permissoes.ts";
import { banco } from "../banco/conexao.ts";
import { conflito, ErroDominio } from "../erros.ts";
import { obterUsuarioDaEmpresa, registrarAuditoria } from "../usuarios/usuarios.repository.ts";
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
    if (violouUnico(erro, "cargos_acesso_empresa_nome_uq")) throw conflito("Já existe um cargo de acesso com esse nome.", "CARGO_NAME_IN_USE");
    throw erro;
  }
  return paraResposta(await cargoDaEmpresa(perfil, cargoId));
}

export async function editarCargo(perfil: PerfilSessao, cargoId: string, dados: EditarCargoAcesso) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  const atual = await cargoDaEmpresa(perfil, cargoId);
  if (dados.permissoes) {
    // Só conta o que entra: quem tem menos acesso pode tirar, mas não pode acrescentar além do seu.
    exigirQuePossaConceder(perfil, dados.permissoes.filter((chave) => !atual.permissoes.includes(chave)));
  }
  try {
    await banco.transaction(async (tx) => {
      await atualizarCargo(tx, perfil.empresa.id, cargoId, dados);
      if (dados.permissoes) await substituirPermissoesCargo(tx, cargoId, [...new Set(dados.permissoes)]);
      await auditarCargo(tx, { empresaId: perfil.empresa.id, atorId: perfil.usuarioId, cargoId, acao: "alterou", detalhe: { ...dados } });
    });
  } catch (erro) {
    if (violouUnico(erro, "cargos_acesso_empresa_nome_uq")) throw conflito("Já existe um cargo de acesso com esse nome.", "CARGO_NAME_IN_USE");
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
  await banco.transaction(async (tx) => {
    for (const sugerido of novos) {
      const cargoId = await inserirCargo(tx, { empresaId: perfil.empresa.id, nome: sugerido.nome, descricao: sugerido.descricao });
      await substituirPermissoesCargo(tx, cargoId, sugerido.permissoes);
      await auditarCargo(tx, { empresaId: perfil.empresa.id, atorId: perfil.usuarioId, cargoId, acao: "criou", detalhe: { sugerido: true } });
    }
  });
  return { criados: novos.length, cargos: (await listarCargosDaEmpresa(perfil.empresa.id)).map(paraResposta) };
}

function montarResposta(papel: Papel, acessos: Awaited<ReturnType<typeof acessosDoUsuario>>): AcessosUsuarioResposta {
  const efetivas = resolverPermissoes({ papel, cargos: acessos.cargos.filter((cargo) => cargo.ativo), excecoes: acessos.excecoes });
  return {
    cargos: acessos.cargos.map((cargo) => cargo.id),
    excecoes: acessos.excecoes,
    efetivas: [...efetivas].map(([chave, origem]) => ({ chave, origem }))
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
  return montarResposta(alvo.papel === "administrador" ? "administrador" : "usuario", await acessosDoUsuario(usuarioId));
}

// Confere os cargos pedidos: da empresa, ativos e sem conceder além do que o autor tem.
export async function validarCargos(perfil: PerfilSessao, cargos: readonly string[]) {
  if (!cargos.length) return [];
  const daEmpresa = await listarCargosDaEmpresa(perfil.empresa.id);
  const escolhidos = [...new Set(cargos)].map((id) => daEmpresa.find((cargo) => cargo.id === id));
  if (escolhidos.some((cargo) => !cargo || !cargo.ativo)) {
    throw new ErroDominio("Cargo de acesso inexistente ou desativado.", 400, "CARGO_INVALID");
  }
  exigirQuePossaConceder(perfil, escolhidos.flatMap((cargo) => cargo?.permissoes ?? []));
  return escolhidos.map((cargo) => cargo!.id);
}

export async function salvarAcessos(perfil: PerfilSessao, usuarioId: string, dados: AcessosUsuario) {
  exigirPermissao(perfil, "permissoes_gerenciar", SEM_PERMISSAO);
  if (usuarioId === perfil.usuarioId) throw conflito("Você não pode mudar os próprios acessos.", "SELF_ACCESS");
  const alvo = await pessoaDaEmpresa(perfil, usuarioId);
  if (alvo.papel === "administrador") throw conflito("O administrador já tem todos os acessos.", "ADMIN_HAS_ALL");
  exigirQuePossaConceder(perfil, Object.entries(dados.excecoes).filter(([, permitido]) => permitido).map(([chave]) => chave));
  await banco.transaction(async (tx) => {
    await substituirExcecoesUsuario(tx, usuarioId, dados.excecoes);
    await registrarAuditoria(tx, {
      empresaId: perfil.empresa.id,
      atorId: perfil.usuarioId,
      alvoId: usuarioId,
      acao: "alterou_acessos",
      detalhe: { excecoes: dados.excecoes }
    });
  });
  return montarResposta("usuario", await acessosDoUsuario(usuarioId));
}
