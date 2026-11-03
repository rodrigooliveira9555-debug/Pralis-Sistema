import {
  criarUsuarioSchema,
  type CriarUsuario,
  type EditarUsuario,
  type NovoUsuario,
  type PerfilSessao,
  type UsuarioResposta
} from "@cicluz/shared";
import { auth, senhaMinimaAutenticacao } from "../auth/config.ts";
import { conflito, ErroDominio, proibido } from "../erros.ts";
import {
  atualizarPerfil,
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

// Cria a conta no better-auth (cadastro público desligado: pelo contexto interno, com o mesmo hash
// de senha do login) e liga à empresa.
async function criarConta(dados: { empresaId: string; nome: string; email: string; senha: string; papel: NovoUsuario["papel"] }) {
  if (dados.senha.length < senhaMinimaAutenticacao) throw erroSenhaCurta();
  if (await emailJaCadastrado(dados.email)) throw conflito("Este e-mail já tem conta.", "EMAIL_ALREADY_EXISTS");

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
  await inserirPerfil({ usuarioId: usuario.id, empresaId: dados.empresaId, nome: dados.nome, papel: dados.papel });
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

function exigirAdministrador(perfil: PerfilSessao) {
  if (perfil.papel !== "administrador") throw proibido("Só o administrador gerencia usuários.", "ADMIN_ONLY");
}

function paraResposta(linha: NonNullable<Awaited<ReturnType<typeof obterUsuarioDaEmpresa>>>): UsuarioResposta {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    papel: linha.papel === "administrador" ? "administrador" : "usuario",
    ativo: linha.ativo,
    criadoEm: linha.criadoEm.toISOString()
  };
}

async function usuarioDaEmpresa(perfil: PerfilSessao, usuarioId: string) {
  const linha = await obterUsuarioDaEmpresa(perfil.empresa.id, usuarioId);
  if (!linha) throw new ErroDominio("Usuário não encontrado", 404, "USER_NOT_FOUND");
  return linha;
}

export async function listarUsuarios(perfil: PerfilSessao): Promise<UsuarioResposta[]> {
  exigirAdministrador(perfil);
  return (await listarUsuariosDaEmpresa(perfil.empresa.id)).map(paraResposta);
}

export async function adicionarUsuario(perfil: PerfilSessao, dados: NovoUsuario) {
  exigirAdministrador(perfil);
  const criado = await criarConta({ ...dados, empresaId: perfil.empresa.id });
  await registrarAuditoria(banco, {
    empresaId: perfil.empresa.id,
    atorId: perfil.usuarioId,
    alvoId: criado.usuarioId,
    acao: "criou",
    detalhe: { papel: dados.papel }
  });
  return paraResposta(await usuarioDaEmpresa(perfil, criado.usuarioId));
}

// Regras: ninguém tira o próprio acesso nem o próprio papel de administrador, e a empresa nunca
// fica sem administrador ativo. Desativar encerra as sessões abertas da pessoa na hora.
export async function editarUsuario(perfil: PerfilSessao, usuarioId: string, dados: EditarUsuario) {
  exigirAdministrador(perfil);
  const alvo = await usuarioDaEmpresa(perfil, usuarioId);
  const proprio = usuarioId === perfil.usuarioId;
  if (proprio && (dados.ativo === false || dados.papel === "usuario")) {
    throw conflito("Você não pode tirar o seu próprio acesso de administrador.", "SELF_LOCKOUT");
  }
  const perdeAdministrador =
    alvo.papel === "administrador" && alvo.ativo && (dados.ativo === false || dados.papel === "usuario");
  await banco.transaction(async (tx) => {
    if (perdeAdministrador && (await travarAdministradoresAtivos(tx, perfil.empresa.id)) <= 1) {
      throw conflito("A empresa precisa de pelo menos um administrador ativo.", "LAST_ADMIN");
    }
    await atualizarPerfil(tx, perfil.empresa.id, usuarioId, dados);
    await registrarAuditoria(tx, {
      empresaId: perfil.empresa.id,
      atorId: perfil.usuarioId,
      alvoId: usuarioId,
      acao: "alterou",
      detalhe: dados
    });
  });
  if (dados.ativo === false) await (await auth.$context).internalAdapter.deleteUserSessions(usuarioId);
  return paraResposta(await usuarioDaEmpresa(perfil, usuarioId));
}

// O administrador define uma senha nova (ex.: a pessoa esqueceu). As sessões dela são encerradas.
// A própria senha só pela tela "Minha senha", que exige a senha atual: uma sessão esquecida aberta
// não pode tomar a conta do administrador.
export async function definirSenha(perfil: PerfilSessao, usuarioId: string, senha: string) {
  exigirAdministrador(perfil);
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
