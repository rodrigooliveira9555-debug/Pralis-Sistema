import { criarUsuarioSchema, type CriarUsuario } from "@cicluz/shared";
import { auth, senhaMinimaAutenticacao } from "../auth/config.ts";
import { criarEmpresa, emailJaCadastrado, inserirPerfil, obterEmpresaPorNome } from "./usuarios.repository.ts";

// Cria uma conta de acesso já ligada à empresa. O cadastro público está desligado no better-auth,
// então a conta nasce pelo contexto interno dele (mesmo hash de senha do login).
// Empresa nova só com pedido explícito: um erro de digitação no nome não pode criar, em silêncio,
// uma empresa vazia que depois receberia a importação do iPad.
export async function criarUsuario(entrada: CriarUsuario, opcoes: { empresaNova?: boolean } = {}) {
  const dados = criarUsuarioSchema.parse(entrada);
  if (dados.senha.length < senhaMinimaAutenticacao) {
    throw new Error(`A senha precisa ter pelo menos ${senhaMinimaAutenticacao} caracteres`);
  }
  if (await emailJaCadastrado(dados.email)) throw new Error("E-mail já cadastrado");

  const existente = await obterEmpresaPorNome(dados.empresaNome);
  if (existente && opcoes.empresaNova) throw new Error(`A empresa "${dados.empresaNome}" já existe`);
  if (!existente && !opcoes.empresaNova) {
    throw new Error(`Empresa "${dados.empresaNome}" não encontrada. Para criar uma nova, use CICLUZ_EMPRESA_NOVA=1`);
  }
  const empresa = existente ?? (await criarEmpresa(dados.empresaNome));

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

  await inserirPerfil({ usuarioId: usuario.id, empresaId: empresa.id, nome: dados.nome, papel: dados.papel });
  return { usuarioId: usuario.id, empresaId: empresa.id };
}
