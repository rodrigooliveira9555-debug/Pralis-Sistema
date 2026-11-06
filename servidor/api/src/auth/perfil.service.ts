import { listaPermissoes, PAPEIS, type Papel, type PerfilSessao } from "@cicluz/shared";
import { acessosDoUsuario } from "../acessos/acessos.repository.ts";
import { obterPerfilPorUsuarioId } from "./perfil.repository.ts";

function papelValido(papel: string): papel is Papel {
  return (PAPEIS as readonly string[]).includes(papel);
}

// Permissões efetivas: administrador tem todas; conta de antes ainda não configurada, o acesso de
// antes; o resto, os cargos de acesso ativos mais as exceções (shared/src/acessos.ts).
export async function permissoesDoUsuario(usuarioId: string, papel: Papel, legado: boolean) {
  if (papel === "administrador" || legado) return listaPermissoes({ papel, legado, cargos: [], excecoes: {} });
  const acessos = await acessosDoUsuario(usuarioId);
  return listaPermissoes({ papel, legado, cargos: acessos.cargos.filter((cargo) => cargo.ativo), excecoes: acessos.excecoes });
}

// Perfil usado em toda requisição autenticada. Usuário ou empresa desativados não têm perfil: a
// sessão pode até existir, mas não abre nada.
export async function buscarPerfilUsuario(usuarioId: string): Promise<PerfilSessao | null> {
  const linha = await obterPerfilPorUsuarioId(usuarioId);
  if (!linha || !linha.ativo || !linha.empresaAtiva || !papelValido(linha.papel)) return null;
  return {
    usuarioId: linha.usuarioId,
    nome: linha.nome,
    email: linha.email,
    papel: linha.papel,
    permissoes: await permissoesDoUsuario(linha.usuarioId, linha.papel, linha.acessosConfiguradosEm === null),
    empresa: { id: linha.empresaId, nome: linha.empresaNome, dadosImportados: linha.dadosImportadosEm !== null }
  };
}
