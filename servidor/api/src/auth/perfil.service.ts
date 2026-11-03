import { PAPEIS, type Papel, type PerfilSessao } from "@cicluz/shared";
import { obterPerfilPorUsuarioId } from "./perfil.repository.ts";

function papelValido(papel: string): papel is Papel {
  return (PAPEIS as readonly string[]).includes(papel);
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
    empresa: { id: linha.empresaId, nome: linha.empresaNome, dadosImportados: linha.dadosImportadosEm !== null }
  };
}
