import { podeUsar, sincronizarAcessosSchema, type PerfilSessao, type PodeUsar } from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";
import { conflito, ErroDominio } from "../erros.ts";
import { exigirPermissao } from "../auth/permissoes.ts";
import {
  colaboradorDoUsuario,
  gravarSincronizacao,
  idsDeOutraEmpresa,
  lerAcessosDaEmpresa,
  listarColaboradoresDaEmpresa
} from "./acessos-por-tela.repository.ts";

// O aparelho (tela Acesso por Tela e cadastro de colaboradores) envia o mínimo do colaborador e as configurações. Só quem monta acessos envia.
export async function sincronizarAcessos(perfil: PerfilSessao, entrada: unknown) {
  exigirPermissao(perfil, "permissoes_gerenciar", "Sem permissão para montar os acessos por tela.");
  const dados = sincronizarAcessosSchema.parse(entrada);
  const alheios = await idsDeOutraEmpresa(perfil.empresa.id, dados.colaboradores.map((c) => c.id));
  if (alheios.length) throw conflito("Há colaboradores com identificador já usado por outra empresa.", "COLABORADOR_ID_IN_USE");
  await banco.transaction((tx) => gravarSincronizacao(tx, perfil.empresa.id, dados, perfil.usuarioId));
  return situacaoDosAcessos(perfil, true);
}

// O que está guardado no servidor e quem hoje pode usar o sistema (a tela mostra quem está sem permissão).
export async function situacaoDosAcessos(perfil: PerfilSessao, jaAutorizado = false) {
  if (!jaAutorizado) exigirPermissao(perfil, ["permissoes_gerenciar", "usuarios_visualizar", "usuarios_gerenciar"], "Sem permissão para ver os acessos por tela.");
  const [{ configs, areaPais }, colaboradores] = await Promise.all([lerAcessosDaEmpresa(perfil.empresa.id), listarColaboradoresDaEmpresa(perfil.empresa.id)]);
  return {
    configs,
    areaPais,
    colaboradores: colaboradores.map((c) => ({
      id: c.id,
      nome: c.nome,
      cargoId: c.cargoId,
      ativo: c.ativo,
      podeUsar: podeUsar({ id: c.id, cargoId: c.cargoId, areaIds: c.areaIds }, configs, areaPais).ok
    }))
  };
}

// A regra do login: conta ligada a um colaborador só abre com permissão (a dele, a do cargo ou a da área). Conta sem colaborador
// (administrador, conta de posto ou conta de antes do vínculo) segue como estava. Devolve null quando não há o que conferir.
export async function conferirPermissaoDaConta(usuarioId: string, empresaId: string): Promise<PodeUsar | null> {
  const colaborador = await colaboradorDoUsuario(usuarioId);
  if (!colaborador) return null;
  const { configs, areaPais } = await lerAcessosDaEmpresa(empresaId);
  return podeUsar({ id: colaborador.id, cargoId: colaborador.cargoId, areaIds: colaborador.areaIds }, configs, areaPais);
}

export const erroSemPermissao = (motivo: string) =>
  new ErroDominio(`Você ainda não tem permissões liberadas para usar o sistema. ${motivo} Fale com o administrador.`, 403, "NO_PERMISSIONS");
