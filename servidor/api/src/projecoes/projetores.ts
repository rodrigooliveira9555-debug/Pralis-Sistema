import type { ChaveSincronizada } from "@cicluz/shared";
import type { TransacaoBanco } from "../banco/conexao.ts";
import catalogoCargosReferencia from "@cicluz/db/dados/cargos-referencia.json" with { type: "json" };
import { lerCargos, lerContas, lerIdentidade, lerLocais, lerOrganograma, lerPerfis, lerSalarios } from "./estrutura.leitura.ts";
import {
  substituirCargos,
  substituirContas,
  substituirIdentidade,
  substituirLocais,
  substituirOrganograma,
  substituirPerfis,
  substituirSalarios
} from "./estrutura.repository.ts";
import { lerFinanceiro } from "./financeiro.leitura.ts";
import { substituirFinanceiro } from "./financeiro.repository.ts";
import { ErroProjecao } from "./leitura.ts";

// Um projetor por assunto: de quais documentos ele depende e como reconstrói as tabelas.
export type Projetor = {
  assunto: string;
  chaves: ChaveSincronizada[];
  projetar(tx: TransacaoBanco, empresaId: string, valores: Map<string, string>): Promise<void>;
};

export function lerJson(valor: string | undefined, assunto: string): unknown {
  if (valor === undefined) return null;
  try {
    return JSON.parse(valor);
  } catch {
    throw new ErroProjecao(`${assunto}: o dado salvo não é um JSON válido`);
  }
}

const financeiro: Projetor = {
  assunto: "financeiro",
  chaves: ["cicluz-financial-hierarchy-v1"],
  async projetar(tx, empresaId, valores) {
    const documento = lerJson(valores.get("cicluz-financial-hierarchy-v1"), "Financeiro");
    await substituirFinanceiro(tx, empresaId, documento === null ? null : lerFinanceiro(documento));
  }
};

const contas: Projetor = {
  assunto: "contas",
  chaves: ["cicluz-ti-groups-v1", "cicluz-ti-account-details-v1"],
  async projetar(tx, empresaId, valores) {
    const grupos = lerJson(valores.get("cicluz-ti-groups-v1"), "Contas");
    const detalhes = lerJson(valores.get("cicluz-ti-account-details-v1"), "Detalhes das contas");
    await substituirContas(tx, empresaId, lerContas(grupos, detalhes));
  }
};

// O catálogo de referência não é salvo pela tela (está no código dela): a cópia do servidor vem de
// db/dados/cargos-referencia.json, conferida contra o index.html por teste.
const cargos: Projetor = {
  assunto: "cargos",
  chaves: ["cicluz-cargos-v1", "cicluz-cargos-referencia-v1"],
  async projetar(tx, empresaId, valores) {
    const locais = lerJson(valores.get("cicluz-cargos-v1"), "Cargos");
    const alteracoes = lerJson(valores.get("cicluz-cargos-referencia-v1"), "Cargos de referência");
    await substituirCargos(tx, empresaId, lerCargos(catalogoCargosReferencia, locais, alteracoes));
  }
};

const salarios: Projetor = {
  assunto: "salarios",
  chaves: ["cicluz-salarios-vigencias-v1"],
  async projetar(tx, empresaId, valores) {
    await substituirSalarios(tx, empresaId, lerSalarios(lerJson(valores.get("cicluz-salarios-vigencias-v1"), "Salários")));
  }
};

const perfis: Projetor = {
  assunto: "ficha-de-cargos",
  chaves: ["cicluz-job-profiles-v1"],
  async projetar(tx, empresaId, valores) {
    await substituirPerfis(tx, empresaId, lerPerfis(lerJson(valores.get("cicluz-job-profiles-v1"), "Ficha de cargos")));
  }
};

const locais: Projetor = {
  assunto: "locais",
  chaves: ["cicluz-location-tree-v1"],
  async projetar(tx, empresaId, valores) {
    await substituirLocais(tx, empresaId, lerLocais(lerJson(valores.get("cicluz-location-tree-v1"), "Locais")));
  }
};

const organograma: Projetor = {
  assunto: "organograma",
  chaves: ["cicluz-organogram-positions-v1"],
  async projetar(tx, empresaId, valores) {
    await substituirOrganograma(tx, empresaId, lerOrganograma(lerJson(valores.get("cicluz-organogram-positions-v1"), "Organograma")));
  }
};

const identidade: Projetor = {
  assunto: "identidade",
  chaves: ["cicluz-icon-library-v1", "cicluz-custom-colors-v1"],
  async projetar(tx, empresaId, valores) {
    const biblioteca = lerJson(valores.get("cicluz-icon-library-v1"), "Biblioteca de ícones");
    const cores = lerJson(valores.get("cicluz-custom-colors-v1"), "Cores");
    await substituirIdentidade(tx, empresaId, lerIdentidade(biblioteca, cores));
  }
};

export const PROJETORES: Projetor[] = [financeiro, contas, cargos, salarios, perfis, locais, organograma, identidade];
