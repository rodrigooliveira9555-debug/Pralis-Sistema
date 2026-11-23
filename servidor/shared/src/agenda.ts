import { z } from "zod";
import type { Compromisso } from "./agenda/regras.ts";

// Agenda: chat e arquivos de cada compromisso (decisão do Zé, 05/11/2026). O compromisso em si mora
// no documento sincronizado "cicluz-agenda-v1"; aqui ficam só as mensagens e os arquivos, ligados
// pelo id do compromisso. A permissão é a do compromisso (gestor = quem criou; os outros, o que o
// gestor marcou) — a regra única de ./agenda/regras.ts (acesso), conferida no servidor.

export const CHAVE_AGENDA = "cicluz-agenda-v1";
export const TAMANHO_MAXIMO_ARQUIVO = 10 * 1024 * 1024;
export const LIMITE_CORPO_ARQUIVO = 15 * 1024 * 1024; // base64 de 10 MB + folga
export const PAPEIS_ARQUIVO = ["material", "evidencia"] as const;
export type PapelArquivo = (typeof PAPEIS_ARQUIVO)[number];

export const compromissoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/, "Compromisso inválido");

export const mensagemSchema = z.object({
  texto: z.string().trim().min(1, "Escreva a mensagem").max(2000, "A mensagem passa de 2000 letras")
});
export const listarMensagensSchema = z.object({
  depois: z.string().datetime({ offset: true }).optional()
});
export const arquivoSchema = z.object({
  nome: z.string().trim().min(1, "Arquivo sem nome").max(200, "Nome do arquivo comprido demais"),
  conteudoBase64: z.string().min(4).max(LIMITE_CORPO_ARQUIVO)
});

export type Mensagem = z.infer<typeof mensagemSchema>;
export type ArquivoEnvio = z.infer<typeof arquivoSchema>;

export type MensagemResposta = { id: string; autorId: string; autorNome: string; texto: string; criadoEm: string };
export type ArquivoResposta = { id: string; nome: string; tipo: string; tamanho: number; papel: PapelArquivo; enviadoPor: string; enviadoPorNome: string; criadoEm: string; podeExcluir: boolean };

/** O compromisso como está no documento da agenda (só o que a permissão usa). */
export type CompromissoAgenda = { id: string } & Pick<Compromisso, "titulo" | "criadoPor" | "pessoas">;
