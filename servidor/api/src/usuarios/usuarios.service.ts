import { criarUsuarioSchema, type CriarUsuario } from "@cicluz/shared";
import { auth, senhaMinimaAutenticacao } from "../auth/config.ts";
import { obterOuCriarEmpresa, inserirPerfil, emailJaCadastrado } from "./usuarios.repository.ts";

// Cria uma conta de acesso já ligada à empresa. O cadastro público está desligado no better-auth,
// então a conta nasce pelo contexto interno dele (mesmo hash de senha do login).
export async function criarUsuario(entrada: CriarUsuario) {
  const dados = criarUsuarioSchema.parse(entrada);
  if (dados.senha.length < senhaMinimaAutenticacao) {
    throw new Error(`A senha precisa ter pelo menos ${senhaMinimaAutenticacao} caracteres`);
  }
  if (await emailJaCadastrado(dados.email)) throw new Error("E-mail já cadastrado");

  const contexto = await auth.$context;
  const usuario = await contexto.internalAdapter.createUser({
    name: dados.nome,
    email: dados.email,
    emailVerified: true
  }, { method: "admin" });
  await contexto.internalAdapter.linkAccount({
    userId: usuario.id,
    providerId: "credential",
    accountId: usuario.id,
    password: await contexto.password.hash(dados.senha)
  });

  const empresa = await obterOuCriarEmpresa(dados.empresaNome);
  await inserirPerfil({ usuarioId: usuario.id, empresaId: empresa.id, nome: dados.nome, papel: dados.papel });
  return { usuarioId: usuario.id, empresaId: empresa.id };
}
