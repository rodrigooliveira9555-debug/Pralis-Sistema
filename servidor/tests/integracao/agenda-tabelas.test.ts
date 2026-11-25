import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as Conexao from "../../api/src/banco/conexao.ts";
import { criarConta } from "./ajuda.ts";

// Migration 0007 (tabelas da Agenda): o banco recusa sozinho o que a regra não deixa, mesmo sem passar pela API.
// Dados fictícios.

let pool: typeof Conexao.pool;
let A: { empresaId: string; gestor: string; resp: string };
let foraId: string;

beforeAll(async () => {
  ({ pool } = await import("../../api/src/banco/conexao.ts"));
  const gestor = await criarConta("administrador");
  const resp = await criarConta("usuario", gestor.empresaNome);
  const fora = await criarConta("administrador");
  A = { empresaId: gestor.empresaId, gestor: gestor.usuarioId, resp: resp.usuarioId };
  foraId = fora.usuarioId;
  const q = (sql: string, v: unknown[]) => pool.query(sql, v);
  await q(`INSERT INTO agenda_grupos (empresa_id, id, nome, cor, dono_id, criado_por, atualizado_por) VALUES ($1, 'lista-1', 'Loja', '#1a2b3c', $2, $2, $2)`, [A.empresaId, A.gestor]);
  await q(`INSERT INTO agenda_compromissos (empresa_id, id, grupo_id, gestor_id, titulo, data, hora, repeticao_tipo, criado_por, atualizado_por)
           VALUES ($1, 'ag-1', 'lista-1', $2, 'Fechar o caixa', '2026-11-05', '10:00', 'mes', $2, $2)`, [A.empresaId, A.gestor]);
  await q(`INSERT INTO agenda_compromissos (empresa_id, id, grupo_id, gestor_id, titulo, data, concluida, concluida_em, origem_id, ocorrencia, criado_por, atualizado_por)
           VALUES ($1, 'ag-1-c1', 'lista-1', $2, 'Fechar o caixa', '2026-11-05', true, now(), 'ag-1', '2026-11-05', $2, $2)`, [A.empresaId, A.gestor]);
  await q(`INSERT INTO agenda_avaliacoes (empresa_id, compromisso_id, avaliado_id, por_id, papel, tipo, valor) VALUES ($1, 'ag-1', $2, $3, 'gestor', 'estrelas', 4)`, [A.empresaId, A.resp, A.gestor]);
});

afterAll(async () => {
  await pool.end();
});

const recusa = async (sql: string, v: unknown[], motivo: RegExp) => {
  await expect(pool.query(sql, v)).rejects.toThrow(motivo);
};

describe("agenda: tabelas da 0007 se defendem", () => {
  it("cor só #rrggbb e nome de lista sem repetir", async () => {
    const sql = `INSERT INTO agenda_grupos (empresa_id, id, nome, cor, dono_id, criado_por, atualizado_por) VALUES ($1, $2, $3, $4, $5, $5, $5)`;
    await recusa(sql, [A.empresaId, "lista-2", "Outra", '"><script>', A.gestor], /agenda_grupos_cor_check/);
    await recusa(sql, [A.empresaId, "lista-3", " loja ", "#000000", A.gestor], /agenda_grupos_nome_uq/);
  });

  it("pessoa e lista de outra empresa não entram", async () => {
    await recusa(`INSERT INTO agenda_participantes (empresa_id, compromisso_id, usuario_id, criado_por) VALUES ($1, 'ag-1', $2, $3)`,
      [A.empresaId, foraId, A.gestor], /agenda_participantes_usuario_fk/);
    await recusa(`INSERT INTO agenda_compromissos (empresa_id, id, grupo_id, gestor_id, titulo, criado_por, atualizado_por) VALUES ($1, 'ag-9', 'lista-1', $2, 'x', $2, $2)`,
      [A.empresaId, foraId], /agenda_compromissos_gestor_fk/);
  });

  it("hora, repetição e endereço conferidos no banco", async () => {
    const sql = `INSERT INTO agenda_compromissos (empresa_id, id, grupo_id, gestor_id, titulo, data, hora, hora_fim, repeticao_tipo, url, criado_por, atualizado_por)
                 VALUES ($1, $2, 'lista-1', $3, 'x', $4, $5, $6, $7, $8, $3, $3)`;
    await recusa(sql, [A.empresaId, "ag-2", A.gestor, "2026-11-05", "10:00", "09:00", null, ""], /agenda_compromissos_hora_check/);
    await recusa(sql, [A.empresaId, "ag-3", A.gestor, null, null, null, "dia", ""], /agenda_compromissos_repeticao_check/);
    await recusa(sql, [A.empresaId, "ag-4", A.gestor, null, null, null, null, "javascript:alert(1)"], /agenda_compromissos_url_check/);
  });

  it("duplo toque: a mesma ocorrência vira cópia uma vez só; a cópia pode ser reaberta (como hoje)", async () => {
    await recusa(`INSERT INTO agenda_compromissos (empresa_id, id, grupo_id, gestor_id, titulo, data, concluida, concluida_em, origem_id, ocorrencia, criado_por, atualizado_por)
                  VALUES ($1, 'ag-1-c2', 'lista-1', $2, 'x', '2026-11-05', true, now(), 'ag-1', '2026-11-05', $2, $2)`,
      [A.empresaId, A.gestor], /agenda_compromissos_ocorrencia_uq/);
    const r = await pool.query(`UPDATE agenda_compromissos SET concluida = false, concluida_em = NULL WHERE empresa_id = $1 AND id = 'ag-1-c1'`, [A.empresaId]);
    expect(r.rowCount).toBe(1);
  });

  it("nota registrada não muda, não some e não se repete", async () => {
    await recusa(`UPDATE agenda_avaliacoes SET valor = 5 WHERE empresa_id = $1`, [A.empresaId], /não muda nem é apagada/);
    await recusa(`DELETE FROM agenda_avaliacoes WHERE empresa_id = $1`, [A.empresaId], /não muda nem é apagada/);
    await recusa(`INSERT INTO agenda_avaliacoes (empresa_id, compromisso_id, avaliado_id, por_id, papel, tipo, valor) VALUES ($1, 'ag-1', $2, $3, 'gestor', 'estrelas', 5)`,
      [A.empresaId, A.resp, A.gestor], /agenda_avaliacoes_uq/);
    await recusa(`INSERT INTO agenda_avaliacoes (empresa_id, compromisso_id, avaliado_id, por_id, papel, tipo, valor) VALUES ($1, 'ag-1', $2, $3, 'auto', 'nps', 3)`,
      [A.empresaId, A.resp, A.gestor], /agenda_avaliacoes_papel_check/);
  });

  it("quem edita também vê; ligação do mapa não repete nem aponta para si", async () => {
    await recusa(`INSERT INTO agenda_participantes (empresa_id, compromisso_id, usuario_id, ver, editar, criado_por) VALUES ($1, 'ag-1', $2, false, true, $2)`,
      [A.empresaId, A.resp], /agenda_participantes_ver_check/);
    const sql = `INSERT INTO agenda_relacoes (empresa_id, id, de_id, para_id, criado_por, atualizado_por) VALUES ($1, $2, $3, $4, $5, $5)`;
    await recusa(sql, [A.empresaId, "rel-1", "ag-1", "ag-1", A.gestor], /agenda_relacoes_pontas_check/);
    await pool.query(sql, [A.empresaId, "rel-2", "ag-1", "ag-1-c1", A.gestor]);
    await recusa(sql, [A.empresaId, "rel-3", "ag-1-c1", "ag-1", A.gestor], /agenda_relacoes_par_uq/);
  });
});
