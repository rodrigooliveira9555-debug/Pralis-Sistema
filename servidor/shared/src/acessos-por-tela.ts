import { z } from "zod";

// Mesmo formato que o banco aceita no vínculo conta↔colaborador (CHECK da 0009): letras, números e _ . : -
export const idColaboradorSchema = z.string().trim().regex(/^[A-Za-z0-9_.:-]{1,100}$/, "Identificador de colaborador inválido.");

// Acesso por Tela (24/11/2026, regras do Rodrigo; espelho de dist/hierarquia-dominio.js, que roda no aparelho):
//  - vale a configuração MAIS ESPECÍFICA: a da própria pessoa, depois a do cargo (configurada numa área), depois a da área;
//  - em cada área da pessoa vale a configuração da área mais próxima (um local sem configuração segue o setor, que segue a área);
//  - a pessoa tem UM cargo e pode estar em várias áreas; com configurações diferentes, valem as permissões MAIORES (a soma);
//  - sem permissão nenhuma, a pessoa não começa a usar o sistema.
// A configuração é uma linha por coluna da tela, com a chave 'area:ID', 'cargo:ÁREA|CARGO' ou 'pessoa:ID'.

export type ConfigTela = { telas: Record<string, string[]>; acoes: string[]; conhecidas?: string[] };
export type PessoaAcesso = { id: string; cargoId: string | null; areaIds: string[] };
export type ResolucaoAcesso = { nivel: "pessoa" | "cargo" | "area" | null; origens: string[]; config: ConfigTela };

export const configTelaSchema = z.object({
  telas: z.record(z.string().max(200), z.array(z.string().max(20)).max(20)),
  acoes: z.array(z.string().max(80)).max(200),
  conhecidas: z.array(z.string().max(200)).max(3000).optional()
});

export const CHAVE_ESTRUTURA_AREAS = "estrutura:areas";
export const chaveConfigSchema = z.string().regex(/^(area:[^|:]{1,80}|cargo:[^|:]{1,80}\|[^|:]{1,80}|pessoa:[^|:]{1,80})$/, "Chave de configuração inválida");

// Tudo que o aparelho envia de uma vez: o mínimo dos colaboradores (sem CPF nem filiação), quem é pai de quem nas áreas e as configurações.
export const sincronizarAcessosSchema = z.object({
  colaboradores: z
    .array(
      z.object({
        id: idColaboradorSchema,
        nome: z.string().trim().min(1).max(120),
        cargoId: z.string().trim().max(80).nullable(),
        areaIds: z.array(z.string().trim().min(1).max(80)).max(60),
        ativo: z.boolean()
      })
    )
    .max(5000),
  areaPais: z.record(z.string().max(80), z.string().max(80).nullable()),
  configs: z.record(chaveConfigSchema, configTelaSchema)
});
export type SincronizarAcessos = z.infer<typeof sincronizarAcessosSchema>;

export const temAcesso = (config: ConfigTela | null | undefined): boolean => {
  if (!config) return false;
  return Object.values(config.telas ?? {}).some((perms) => perms.length > 0) || (config.acoes ?? []).length > 0;
};

// Os ids da área e de todas as áreas acima dela, da mais específica para a mais geral.
export function cadeiaDaArea(areaPais: Record<string, string | null>, areaId: string): string[] {
  const saida: string[] = [];
  for (let id: string | null | undefined = areaId, guarda = 0; id && guarda < 20; id = areaPais[id], guarda++) saida.push(id);
  return saida;
}

function uniao(lista: ConfigTela[]): ConfigTela {
  const telas: Record<string, string[]> = {};
  const acoes = new Set<string>();
  for (const config of lista) {
    for (const chave of Object.keys(config.telas ?? {})) telas[chave] = [...new Set([...(telas[chave] ?? []), ...(config.telas[chave] ?? [])])];
    for (const acao of config.acoes ?? []) acoes.add(acao);
  }
  return { telas, acoes: [...acoes] };
}

export function resolverConfig(pessoa: PessoaAcesso, configs: Record<string, ConfigTela>, areaPais: Record<string, string | null>): ResolucaoAcesso {
  const propria = configs[`pessoa:${pessoa.id}`];
  if (propria) return { nivel: "pessoa", origens: [`pessoa:${pessoa.id}`], config: uniao([propria]) };
  const cadeias = pessoa.areaIds.map((area) => cadeiaDaArea(areaPais, area));
  const doNivel = (chaveDe: (areaId: string) => string) => {
    const achadas = new Set<string>();
    for (const cadeia of cadeias) {
      for (const area of cadeia) {
        const chave = chaveDe(area);
        if (configs[chave]) {
          achadas.add(chave);
          break;
        }
      }
    }
    return [...achadas];
  };
  if (pessoa.cargoId) {
    const cargoId = pessoa.cargoId;
    const chaves = doNivel((area) => `cargo:${area}|${cargoId}`);
    if (chaves.length) return { nivel: "cargo", origens: chaves, config: uniao(chaves.map((c) => configs[c] as ConfigTela)) };
  }
  const chaves = doNivel((area) => `area:${area}`);
  if (chaves.length) return { nivel: "area", origens: chaves, config: uniao(chaves.map((c) => configs[c] as ConfigTela)) };
  return { nivel: null, origens: [], config: { telas: {}, acoes: [] } };
}

export type PodeUsar = { ok: boolean; nivel: ResolucaoAcesso["nivel"]; origens: string[]; motivo: string };

// Pode começar a usar o sistema? Precisa de cargo e de permissão (a dele, a do cargo ou a da área).
export function podeUsar(pessoa: PessoaAcesso | null, configs: Record<string, ConfigTela>, areaPais: Record<string, string | null>): PodeUsar {
  if (!pessoa?.cargoId) return { ok: false, nivel: null, origens: [], motivo: "O colaborador precisa estar ligado a um cargo." };
  const r = resolverConfig(pessoa, configs, areaPais);
  if (!r.nivel) return { ok: false, nivel: null, origens: [], motivo: "Nenhuma permissão foi configurada para o colaborador, para o cargo dele ou para a área dele." };
  if (!temAcesso(r.config)) return { ok: false, nivel: r.nivel, origens: r.origens, motivo: "A configuração que vale para o colaborador não libera nenhuma tela." };
  return { ok: true, nivel: r.nivel, origens: r.origens, motivo: "" };
}
