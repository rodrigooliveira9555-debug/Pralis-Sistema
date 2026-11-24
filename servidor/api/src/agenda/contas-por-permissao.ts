import { PERMISSOES, type AreaPermissao, type ChavePermissao } from "@cicluz/shared";
import { acessosDoUsuario } from "../acessos/acessos.repository.ts";
import { efetivasDe } from "../acessos/acessos.service.ts";
import { listarUsuariosDaEmpresa } from "../usuarios/usuarios.repository.ts";

// Quem tem qual permissão, entre as contas ATIVAS da empresa (P-46 itens 1, 2 e 3). Mesma regra da tela de
// acessos (efetivasDe: administrador tem tudo; cargo libera; exceção libera ou bloqueia; conta antiga segue o
// papel). Poucas contas por empresa: calcula e guarda 30 s; quem muda acesso ou conta chama esquecerPermissoes.

// Memória curta por empresa: a Agenda pergunta a cada 30 s por aparelho; permissão nova vale em até 30 s.
const MEMORIA_MS = 30_000;
const memoria = new Map<string, { em: number; valor: Promise<Map<string, Set<ChavePermissao>>> }>();

export function permissoesDasContas(empresaId: string, agora = Date.now()): Promise<Map<string, Set<ChavePermissao>>> {
  const m = memoria.get(empresaId);
  if (m && agora - m.em < MEMORIA_MS) return m.valor;
  const valor = calcular(empresaId);
  memoria.set(empresaId, { em: agora, valor });
  valor.catch(() => memoria.delete(empresaId));
  return valor;
}

/** Esquece o cálculo guardado (testes e mudanças que precisam valer na hora). */
export const esquecerPermissoes = (empresaId?: string) => (empresaId ? memoria.delete(empresaId) : memoria.clear());

async function calcular(empresaId: string): Promise<Map<string, Set<ChavePermissao>>> {
  const contas = (await listarUsuariosDaEmpresa(empresaId)).filter((c) => c.ativo);
  const saida = new Map<string, Set<ChavePermissao>>();
  await Promise.all(
    contas.map(async (c) => {
      saida.set(c.id, new Set(efetivasDe(c, await acessosDoUsuario(c.id)).keys()));
    })
  );
  return saida;
}

/** Contas ativas com a permissão (ex.: producao_lancar). */
export async function contasComPermissao(empresaId: string, chave: ChavePermissao): Promise<string[]> {
  return [...(await permissoesDasContas(empresaId))].filter(([, p]) => p.has(chave)).map(([id]) => id);
}

const CHAVES_DA_AREA = new Map<AreaPermissao, ChavePermissao[]>();
for (const p of PERMISSOES) CHAVES_DA_AREA.set(p.area, [...(CHAVES_DA_AREA.get(p.area) ?? []), p.chave]);

/** Contas ativas com alguma permissão da área (membros de uma lista ligada à área). */
export async function contasDaArea(empresaId: string, area: AreaPermissao): Promise<string[]> {
  const chaves = CHAVES_DA_AREA.get(area) ?? [];
  return [...(await permissoesDasContas(empresaId))].filter(([, p]) => chaves.some((k) => p.has(k))).map(([id]) => id);
}
