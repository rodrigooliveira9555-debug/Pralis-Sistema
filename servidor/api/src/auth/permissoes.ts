import type { ChavePermissao, PerfilSessao } from "@cicluz/shared";
import { proibido } from "../erros.ts";

export const tem = (perfil: PerfilSessao, chave: ChavePermissao) => perfil.permissoes.includes(chave);

export function exigirPermissao(perfil: PerfilSessao, chaves: ChavePermissao | ChavePermissao[], mensagem: string) {
  const lista = Array.isArray(chaves) ? chaves : [chaves];
  if (!lista.some((chave) => tem(perfil, chave))) throw proibido(mensagem, "INSUFFICIENT_PERMISSION");
}

// Ninguém além do administrador entrega uma permissão que não tem: quem monta acessos não consegue
// subir o próprio nível por um cargo ou por uma exceção.
export function exigirQuePossaConceder(perfil: PerfilSessao, chaves: readonly string[]) {
  if (perfil.papel === "administrador") return;
  const faltam = chaves.filter((chave) => !perfil.permissoes.includes(chave as ChavePermissao));
  if (faltam.length) {
    throw proibido("Você só pode liberar permissões que você mesmo tem.", "CANNOT_GRANT");
  }
}
