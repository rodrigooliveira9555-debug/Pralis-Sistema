import {
  criarUsuarioSchema,
  rotuloPosto,
  type CriarUsuario,
  type EditarUsuario,
  type NovoUsuario,
  type PerfilSessao,
  type Posto,
  type UsuarioResposta
} from "@cicluz/shared";
import { cargosDasPessoas, substituirCargosUsuario } from "../acessos/acessos.repository.ts";
import { validarCargos } from "../acessos/acessos.service.ts";
import { auth, senhaMinimaAutenticacao } from "../auth/config.ts";
import { exigirPermissao } from "../auth/permissoes.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import {
  atualizarPerfil,
  contaDoPosto,
  criarEmpresa,
  emailJaCadastrado,
  inserirPerfil,
  listarUsuariosDaEmpresa,
  obterEmpresaPorNome,
  obterUsuarioDaEmpresa,
  registrarAuditoria,
  travarAdministradoresAtivos
} from "./usuarios.repository.ts";
import { banco } from "../banco/conexao.ts";

function erroSenhaCurta() {
  return new ErroDominio(`A senha precisa ter pelo menos ${senhaMinimaAutenticacao} caracteres`, 400, "PASSWORD_TOO_SHORT");
}

async function exigirPostoLivre(empresaId: string, posto: Posto | null | undefined, excetoUsuarioId?: string) {
  if (!posto) return;
  const ocupante = await contaDoPosto(empresaId, posto, excetoUsuarioId);
  if (ocupante) throw conflito(`O posto ${rotuloPosto(posto)} já é da conta ${ocupante.nome}.`, "POSTO_IN_USE");
}

// Cria a conta no better-auth (cadastro público desligado: pelo contexto interno, com o mesmo hash
// de senha do login) e liga à empresa.
async function criarConta(dados: {
  empresaId: string;
  nome: string;
  email: string;
  senha: string;
  papel: NovoUsuario["papel"];
  posto?: Posto | null;
}) {
  if (dados.senha.length < senhaMinimaAutenticacao) throw erroSenhaCurta();
  if (await emailJaCadastrado(dados.email)) throw conflito("Este e-mail já tem conta.", "EMAIL_ALREADY_EXISTS");
  await exigirPostoLivre(dados.empresaId, dados.posto);

  const contexto = await auth.$context;
  const usuario = await contexto.internalAdapter.createUser(
    { name: dados.nome, email: dados.email, emailVerified: true },
    { method: "admin" }
  );
  await contexto.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: await contexto.password.hash(dados.senha)
  });
  await inserirPerfil({ usuarioId: usuario.id, empresaId: dados.empresaId, nome: dados.nome, papel: dados.papel, posto: dados.posto ?? null });
  return { usuarioId: usuario.id, empresaId: dados.empresaId };
}

// Script de administração (primeira conta da empresa). Empresa nova só com pedido explícito: um
// erro de digitação no nome não pode criar, em silêncio, uma empresa vazia que depois receberia a
// importação do iPad.
export async function criarUsuario(entrada: CriarUsuario, opcoes: { empresaNova?: boolean } = {}) {
  const dados = criarUsuarioSchema.parse(entrada);
  const existente = await obterEmpresaPorNome(dados.empresaNome);
  if (existente && opcoes.empresaNova) throw new Error(`A empresa "${dados.empresaNome}" já existe`);
  if (!existente && !opcoes.empresaNova) {
    throw new Error(`Empresa "${dados.empresaNome}" não encontrada. Para criar uma nova, use CICLUZ_EMPRESA_NOVA=1`);
  }
  if (dados.senha.length < senhaMinimaAutenticacao) throw erroSenhaCurta();
  if (await emailJaCadastrado(dados.email)) throw new Error("E-mail já cadastrado");
  const empresa = existente ?? (await criarEmpresa(dados.empresaNome));
  return criarConta({ empresaId: empresa.id, nome: dados.nome, email: dados.email, senha: dados.senha, papel: dados.papel });
}

// Criar ou mexer em administrador continua ato do administrador: quem só tem `usuarios_gerenciar`
// cuida das contas comuns.
function exigirAdministrador(perfil: PerfilSessao, mensagem: string) {
  if (perfil.papel !== "administrador") throw proibido(mensagem, "ADMIN_ONLY");
}

type LinhaUsuario = NonNullable<Awaited<ReturnType<typeof obterUsuarioDaEmpresa>>>;

function paraResposta(linha: LinhaUsuario, cargos: { id: string; nome: string }[]): UsuarioResposta {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    papel: linha.papel === "administrador" ? "administrador" : "usuario",
    ativo: linha.ativo,
    criadoEm: linha.criadoEm.toISOString(),
    posto: linha.postoPdv && linha.postoTurno ? { pdv: linha.postoPdv, turno: linha.postoTurno as Posto["turno"] } : null,
    cargos
  };
}

async function usuarioDaEmpresa(perfil: PerfilSessao, usuarioId: string) {
  const linha = await obterUsuarioDaEmpresa(perfil.empresa.id, usuarioId);
  if (!linha) throw new ErroDominio("Usuário não encontrado", 404, "USER_NOT_FOUND");
  return linha;
}

async function resposta(perfil: PerfilSessao, usuarioId: string) {
  const cargos = await cargosDasPessoas(perfil.empresa.id);
  return paraResposta(await usuarioDaEmpresa(perfil, usuarioId), cargos.get(usuarioId) ?? []);
}

export async function listarUsuarios(perfil: PerfilSessao): Promise<UsuarioResposta[]> {
  exigirPermissao(perfil, ["usuarios_visualizar", "usuarios_gerenciar"], "Sem permissão para ver os usuários.");
  const [linhas, cargos] = await Promise.all([listarUsuariosDaEmpresa(perfil.empresa.id), cargosDasPessoas(perfil.empresa.id)]);
  return linhas.map((linha) => paraResposta(linha, cargos.get(linha.id) ?? []));
}

export async function adicionarUsuario(perfil: PerfilSessao, dados: NovoUsuario) {
  exigirPermissao(perfil, "usuarios_gerenciar", "Sem permissão para criar usuários.");
  if (dados.papel === "administrador") exigirAdministrador(perfil, "Só o administrador cria outro administrador.");
  const cargos = dados.papel === "administrador" ? [] : await validarCargos(perfil, dados.cargos);
  const criado = await criarConta({ ...dados, empresaId: perfil.empresa.id });
  await banco.transaction(async (tx) => {
    if (cargos.length) await substituirCargosUsuario(tx, criado.usuarioId, cargos);
    await registrarAuditoria(tx, {
      empresaId: perfil.empresa.id,
      atorId: perfil.usuarioId,
      alvoId: criado.usuarioId,
      acao: "criou",
      detalhe: { papel: dados.papel, cargos, posto: dados.posto }
    });
  });
  return resposta(perfil, criado.usuarioId);
}

// Regras: ninguém tira o próprio acesso nem o próprio papel de administrador, e a empresa nunca
// fica sem administrador ativo. Desativar encerra as sessões abertas da pessoa na hora.
export async function editarUsuario(perfil: PerfilSessao, usuarioId: string, dados: EditarUsuario) {
  exigirPermissao(perfil, "usuarios_gerenciar", "Sem permissão para editar usuários.");
  const alvo = await usuarioDaEmpresa(perfil, usuarioId);
  if (alvo.papel === "administrador" || dados.papel === "administrador") {
    exigirAdministrador(perfil, "Só o administrador altera um administrador.");
  }
  const proprio = usuarioId === perfil.usuarioId;
  if (proprio && (dados.ativo === false || dados.papel === "usuario")) {
    throw conflito("Você não pode tirar o seu próprio acesso de administrador.", "SELF_LOCKOUT");
  }
  if (dados.posto) await exigirPostoLivre(perfil.empresa.id, dados.posto, usuarioId);
  // Administrador já tem tudo: cargo nele não muda nada e só confundiria a lista.
  const cargos = dados.cargos && (dados.papel ?? alvo.papel) !== "administrador" ? await validarCargos(perfil, dados.cargos) : undefined;
  const perdeAdministrador =
    alvo.papel === "administrador" && alvo.ativo && (dados.ativo === false || dados.papel === "usuario");
  await banco.transaction(async (tx) => {
    if (perdeAdministrador && (await travarAdministradoresAtivos(tx, perfil.empresa.id)) <= 1) {
      throw conflito("A empresa precisa de pelo menos um administrador ativo.", "LAST_ADMIN");
    }
    await atualizarPerfil(tx, perfil.empresa.id, usuarioId, { nome: dados.nome, papel: dados.papel, ativo: dados.ativo, posto: dados.posto });
    if (cargos) await substituirCargosUsuario(tx, usuarioId, cargos);
    await registrarAuditoria(tx, {
      empresaId: perfil.empresa.id,
      atorId: perfil.usuarioId,
      alvoId: usuarioId,
      acao: "alterou",
      detalhe: dados
    });
  });
  if (dados.ativo === false) await (await auth.$context).internalAdapter.deleteUserSessions(usuarioId);
  return resposta(perfil, usuarioId);
}

// O administrador define uma senha nova (ex.: a pessoa esqueceu). As sessões dela são encerradas.
// A própria senha só pela tela "Minha senha", que exige a senha atual: uma sessão esquecida aberta
// não pode tomar a conta do administrador.
export async function definirSenha(perfil: PerfilSessao, usuarioId: string, senha: string) {
  exigirAdministrador(perfil, "Só o administrador define a senha de outra pessoa.");
  if (usuarioId === perfil.usuarioId) {
    throw conflito("Para a sua própria senha, use Minha senha (pede a senha atual).", "USE_OWN_PASSWORD_FORM");
  }
  await usuarioDaEmpresa(perfil, usuarioId);
  if (senha.length < senhaMinimaAutenticacao) throw erroSenhaCurta();
  const contexto = await auth.$context;
  await contexto.internalAdapter.updatePassword(usuarioId, await contexto.password.hash(senha));
  await contexto.internalAdapter.deleteUserSessions(usuarioId);
  await registrarAuditoria(banco, {
    empresaId: perfil.empresa.id,
    atorId: perfil.usuarioId,
    alvoId: usuarioId,
    acao: "definiu_senha"
  });
}
