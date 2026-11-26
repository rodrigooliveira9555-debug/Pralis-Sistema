import { createHash } from "node:crypto";
import {
  TAMANHO_MAXIMO_ARQUIVO,
  type ArquivoEnvio,
  type ArquivoResposta,
  type MensagemResposta,
  type PapelArquivo,
  type PerfilSessao
} from "@cicluz/shared";
import { banco } from "../banco/conexao.ts";
import { ErroDominio, proibido } from "../erros.ts";
import * as repo from "./agenda.repository.ts";
import { tipoDoArquivo } from "./agenda.regras.ts";
import * as compromissos from "./compromissos.repository.ts";
import { acessoDe, naoEncontrado, naoTransferida } from "./compromissos.service.ts";
import { exigirExpediente } from "./rotina.regras.ts";

// Chat e arquivos de cada compromisso. A permissão vem das tabelas da Agenda (0007), conferida a cada pedido:
// o documento "cicluz-agenda-v1" não decide mais nada (G1). Compromisso excluído não tem chat nem arquivos.

async function exigirAcesso(perfil: PerfilSessao, compromissoId: string) {
  const empresaId = perfil.empresa.id;
  await exigirExpediente(perfil);
  const item = await compromissos.compromisso(banco, empresaId, compromissoId);
  if (!item || item.excluidoEm) {
    if (!(await compromissos.estado(banco, empresaId))) throw naoTransferida();
    throw naoEncontrado();
  }
  const participantes = await compromissos.participantesDe(banco, empresaId, [compromissoId]);
  const acesso = acessoDe(item, participantes.map((p) => ({ id: p.usuarioId, responsavel: p.responsavel, ver: p.ver, editar: p.editar, concluir: p.concluir, excluir: p.excluir })), perfil.usuarioId);
  if (!acesso.ver) throw proibido("Você não participa deste compromisso.", "AGENDA_SEM_ACESSO");
  return { item, acesso };
}

type LinhaMensagem = { id: string; autorId: string; autorNome: string; texto: string; criadoEm: Date; arquivoId?: string | null; arquivoNome?: string | null; arquivoTipo?: string | null };
const mensagem = (m: LinhaMensagem): MensagemResposta => ({
  id: m.id, autorId: m.autorId, autorNome: m.autorNome, texto: m.texto, criadoEm: m.criadoEm.toISOString(),
  arquivo: m.arquivoId ? { id: m.arquivoId, nome: m.arquivoNome ?? "", tipo: m.arquivoTipo ?? "" } : null
});

export async function listarMensagens(perfil: PerfilSessao, compromissoId: string, depois?: string) {
  await exigirAcesso(perfil, compromissoId);
  return (await repo.listarMensagens(perfil.empresa.id, compromissoId, depois)).map(mensagem);
}

export async function enviarMensagem(perfil: PerfilSessao, compromissoId: string, texto: string, arquivoId?: string) {
  await exigirAcesso(perfil, compromissoId);
  // Foto ou áudio: o arquivo precisa ser deste compromisso (e da empresa); quem não vê o compromisso já parou acima.
  const anexo = arquivoId ? await repo.obterArquivo(perfil.empresa.id, arquivoId, false) : null;
  if (arquivoId && (!anexo || anexo.compromissoId !== compromissoId)) throw new ErroDominio("Arquivo não encontrado.", 404, "ARQUIVO_NAO_ENCONTRADO");
  const m = await repo.inserirMensagem(perfil.empresa.id, compromissoId, perfil.usuarioId, texto, anexo ? anexo.id : null);
  await repo.marcarLido(perfil.empresa.id, compromissoId, perfil.usuarioId);
  return mensagem({ ...m, autorNome: perfil.nome, arquivoId: anexo?.id ?? null, arquivoNome: anexo?.nome ?? null, arquivoTipo: anexo?.tipo ?? null });
}

export async function marcarLido(perfil: PerfilSessao, compromissoId: string) {
  await exigirAcesso(perfil, compromissoId);
  await repo.marcarLido(perfil.empresa.id, compromissoId, perfil.usuarioId);
}

/** Não lidas de cada compromisso que a pessoa pode ver. */
export async function naoLidas(perfil: PerfilSessao) {
  // Só dos compromissos que a pessoa vê (a mesma consulta do GET /api/agenda).
  const visiveis = new Set((await compromissos.compromissosVisiveis(perfil.empresa.id, perfil.usuarioId)).map((c) => c.id));
  const saida: Record<string, number> = {};
  for (const l of await repo.contarNaoLidas(perfil.empresa.id, perfil.usuarioId)) {
    if (visiveis.has(l.compromissoId)) saida[l.compromissoId] = l.total;
  }
  return saida;
}

const podeExcluir = (perfil: PerfilSessao, enviadoPor: string, gestor: boolean) => gestor || enviadoPor === perfil.usuarioId;
const arquivo = (a: { id: string; nome: string; tipo: string; tamanho: number; papel: string; enviadoPor: string; enviadoPorNome: string; criadoEm: Date }, perfil: PerfilSessao, gestor: boolean): ArquivoResposta => ({
  id: a.id, nome: a.nome, tipo: a.tipo, tamanho: a.tamanho, papel: a.papel as PapelArquivo, enviadoPor: a.enviadoPor, enviadoPorNome: a.enviadoPorNome,
  criadoEm: a.criadoEm.toISOString(), podeExcluir: podeExcluir(perfil, a.enviadoPor, gestor)
});

export async function listarArquivos(perfil: PerfilSessao, compromissoId: string) {
  const { acesso } = await exigirAcesso(perfil, compromissoId);
  return (await repo.listarArquivos(perfil.empresa.id, compromissoId)).map((a) => arquivo(a, perfil, acesso.gestor));
}

/**
 * Envio: o responsável manda evidência (o que fez); o gestor e quem pode editar mandam material.
 * Quem só vê não envia.
 */
export async function enviarArquivo(perfil: PerfilSessao, compromissoId: string, entrada: ArquivoEnvio) {
  const { acesso } = await exigirAcesso(perfil, compromissoId);
  const papel: PapelArquivo | null = acesso.responsavel && !acesso.gestor ? "evidencia" : acesso.gestor || acesso.editar ? "material" : null;
  if (!papel) throw proibido("Você pode ver este compromisso, mas não enviar arquivos.", "AGENDA_SEM_ACESSO");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(entrada.conteudoBase64)) throw new ErroDominio("Arquivo corrompido no envio.", 400, "ARQUIVO_INVALIDO");
  const conteudo = Buffer.from(entrada.conteudoBase64, "base64");
  if (!conteudo.length) throw new ErroDominio("Arquivo vazio.", 400, "ARQUIVO_INVALIDO");
  if (conteudo.length > TAMANHO_MAXIMO_ARQUIVO) throw new ErroDominio("O arquivo passa de 10 MB.", 413, "ARQUIVO_GRANDE");
  const tipo = tipoDoArquivo(conteudo, entrada.nome);
  if (!tipo) throw new ErroDominio("Formato não aceito. Envie imagem (JPG, PNG, WEBP, GIF, HEIC), áudio (WebM, Ogg, M4A, MP3), PDF, Word, Excel, PowerPoint, TXT ou CSV.", 415, "ARQUIVO_FORMATO");
  const id = await repo.inserirArquivo({
    empresaId: perfil.empresa.id, compromissoId, enviadoPor: perfil.usuarioId, papel, nome: entrada.nome, tipo,
    tamanho: conteudo.length, sha256: createHash("sha256").update(conteudo).digest("hex"), conteudo
  });
  const salvo = await repo.obterArquivo(perfil.empresa.id, id, false);
  return arquivo(salvo!, perfil, acesso.gestor);
}

export async function baixarArquivo(perfil: PerfilSessao, id: string) {
  const a = await repo.obterArquivo(perfil.empresa.id, id, true);
  if (!a) throw new ErroDominio("Arquivo não encontrado.", 404, "ARQUIVO_NAO_ENCONTRADO");
  await exigirAcesso(perfil, a.compromissoId);
  return a as typeof a & { conteudo: Buffer };
}

export async function excluirArquivo(perfil: PerfilSessao, id: string) {
  const a = await repo.obterArquivo(perfil.empresa.id, id, false);
  if (!a) throw new ErroDominio("Arquivo não encontrado.", 404, "ARQUIVO_NAO_ENCONTRADO");
  const { acesso } = await exigirAcesso(perfil, a.compromissoId);
  if (!podeExcluir(perfil, a.enviadoPor, acesso.gestor)) throw proibido("Só quem enviou ou o gestor exclui o arquivo.", "AGENDA_SEM_ACESSO");
  await repo.excluirArquivo(perfil.empresa.id, id);
}
