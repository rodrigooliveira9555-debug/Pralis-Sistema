import { createHash } from "node:crypto";
import {
  acessoAgenda,
  TAMANHO_MAXIMO_ARQUIVO,
  type ArquivoEnvio,
  type ArquivoResposta,
  type CompromissoAgenda,
  type MensagemResposta,
  type PapelArquivo,
  type PerfilSessao
} from "@cicluz/shared";
import { ErroDominio, proibido } from "../erros.ts";
import * as repo from "./agenda.repository.ts";
import { tipoDoArquivo } from "./agenda.regras.ts";

// A permissão vem do compromisso no documento da agenda. Cache por empresa, trocado quando a versão
// do documento muda (o chat confere a cada 5 s; não precisa ler 4 MB de JSON toda vez).
const cache = new Map<string, { versao: number; itens: Map<string, CompromissoAgenda> }>();

async function compromissos(empresaId: string) {
  const versao = await repo.versaoAgenda(empresaId);
  const guardado = cache.get(empresaId);
  if (guardado && guardado.versao === versao) return guardado.itens;
  const doc = await repo.documentoAgenda(empresaId);
  const itens = new Map<string, CompromissoAgenda>();
  try {
    const dados = doc ? (JSON.parse(doc.valor) as { itens?: CompromissoAgenda[] }) : null;
    (dados?.itens ?? []).forEach((i) => { if (i && typeof i.id === "string") itens.set(i.id, i); });
  } catch {
    // Documento ilegível: ninguém acessa (melhor negar do que liberar sem conferir).
  }
  if (cache.size > 500) cache.clear();
  cache.set(empresaId, { versao: doc?.versao ?? versao, itens });
  return itens;
}

async function exigirAcesso(perfil: PerfilSessao, compromissoId: string) {
  const item = (await compromissos(perfil.empresa.id)).get(compromissoId);
  if (!item) throw new ErroDominio("Compromisso não encontrado. Se acabou de criar, espere alguns segundos para ele chegar ao servidor.", 404, "AGENDA_COMPROMISSO_NAO_ENCONTRADO");
  const acesso = acessoAgenda(item, perfil.usuarioId);
  if (!acesso.ver) throw proibido("Você não participa deste compromisso.", "AGENDA_SEM_ACESSO");
  return { item, acesso };
}

const mensagem = (m: { id: string; autorId: string; autorNome: string; texto: string; criadoEm: Date }): MensagemResposta => ({ ...m, criadoEm: m.criadoEm.toISOString() });

export async function listarMensagens(perfil: PerfilSessao, compromissoId: string, depois?: string) {
  await exigirAcesso(perfil, compromissoId);
  return (await repo.listarMensagens(perfil.empresa.id, compromissoId, depois)).map(mensagem);
}

export async function enviarMensagem(perfil: PerfilSessao, compromissoId: string, texto: string) {
  await exigirAcesso(perfil, compromissoId);
  const m = await repo.inserirMensagem(perfil.empresa.id, compromissoId, perfil.usuarioId, texto);
  await repo.marcarLido(perfil.empresa.id, compromissoId, perfil.usuarioId);
  return mensagem({ ...m, autorNome: perfil.nome });
}

export async function marcarLido(perfil: PerfilSessao, compromissoId: string) {
  await exigirAcesso(perfil, compromissoId);
  await repo.marcarLido(perfil.empresa.id, compromissoId, perfil.usuarioId);
}

/** Não lidas de cada compromisso que a pessoa pode ver. */
export async function naoLidas(perfil: PerfilSessao) {
  const itens = await compromissos(perfil.empresa.id);
  const saida: Record<string, number> = {};
  for (const l of await repo.contarNaoLidas(perfil.empresa.id, perfil.usuarioId)) {
    const item = itens.get(l.compromissoId);
    if (item && acessoAgenda(item, perfil.usuarioId).ver) saida[l.compromissoId] = l.total;
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
  if (!tipo) throw new ErroDominio("Formato não aceito. Envie imagem (JPG, PNG, WEBP, GIF, HEIC), PDF, Word, Excel, PowerPoint, TXT ou CSV.", 415, "ARQUIVO_FORMATO");
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
