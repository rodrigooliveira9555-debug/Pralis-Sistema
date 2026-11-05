// Entrada: chave nova na lista que o servidor ainda não tem (Compras) — o aparelho da mesma empresa
// fica com a dele e a põe na fila com versão base 0; aparelho de outra empresa não adota; e, quando o
// servidor já tem o documento, vale o do servidor. API simulada (sem servidor real, sem dados reais).
// Rodar: node tests/entrar-adocao.mjs
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar } from './servidor.mjs';

const { servidor, url } = await iniciar();
const base = url.replace(/\/[^/]*$/, '/');
const navegador = await chromium.launch();
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

const PERFIL = { usuarioId: 'u-teste', nome: 'Teste', papel: 'administrador', empresa: { id: 'emp-1', nome: 'Empresa de teste', dadosImportados: true } };
const CHAVES = ['cicluz-location-tree-v1', 'cicluz-compras-v1'];
const COMPRAS_LOCAL = JSON.stringify({ fornecedores: [{ id: 'f-1', nome: 'FORNECEDOR DE TESTE' }] });

async function entrar({ dono, documentos }) {
  const ctx = await navegador.newContext();
  const p = await ctx.newPage();
  await p.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await p.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await p.route('**/api/**', (r) => {
    const caminho = new URL(r.request().url()).pathname;
    if (caminho.endsWith('/api/sessao')) return r.fulfill({ status: 200, json: { data: { perfil: PERFIL, chavesSincronizadas: CHAVES, chavesAdotadas: ['cicluz-compras-v1'] } } });
    if (caminho.endsWith('/api/documentos')) return r.fulfill({ status: 200, json: { data: { documentos } } });
    if (caminho.endsWith('/api/documentos/copias')) return r.fulfill({ status: 200, json: { data: {} } });
    return r.fulfill({ status: 503, json: { codigo: 'OFFLINE', mensagem: 'fora' } });
  });
  // Prepara o aparelho numa página qualquer da origem e depois abre a entrada.
  await p.goto(base + 'entrar-tema.js');
  await p.evaluate(({ dono, compras }) => {
    localStorage.clear();
    localStorage.setItem('cicluz-compras-v1', compras);
    localStorage.setItem('cicluz-location-tree-v1', '[]');
    if (dono) localStorage.setItem('cicluz-sync-dono', JSON.stringify(dono));
  }, { dono, compras: COMPRAS_LOCAL });
  await p.route('**/index.html*', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>aberto</p>' }));
  await p.goto(base + 'entrar.html?voltar=index.html');
  await p.waitForURL('**/index.html*');
  const r = await p.evaluate(() => ({ compras: localStorage.getItem('cicluz-compras-v1'), locais: localStorage.getItem('cicluz-location-tree-v1'), fila: JSON.parse(localStorage.getItem('cicluz-sync-pendentes') || 'null'), aba: JSON.parse(sessionStorage.getItem('cicluz-sync-aba') || 'null') }));
  await ctx.close();
  return r;
}

// 1) Mesma empresa, servidor sem Compras: mantém e põe na fila desta aba com base 0.
{
  const r = await entrar({ dono: { usuarioId: 'u-teste', empresaId: 'emp-1', nome: 'Teste' }, documentos: [{ chave: 'cicluz-location-tree-v1', valor: '[{"id":"a"}]', versao: 3 }] });
  ok(r.compras === COMPRAS_LOCAL, 'Compras do aparelho é mantido quando o servidor ainda não tem');
  ok(r.fila && r.fila.itens['cicluz-compras-v1'] && r.fila.itens['cicluz-compras-v1'].versaoBase === 0, 'Compras entra na fila com versão base 0');
  ok(r.fila.itens['cicluz-compras-v1'].aba === r.aba.id, 'A fila é da aba aberta, que envia ao carregar');
  ok(r.locais === '[{"id":"a"}]', 'As outras chaves continuam vindo do servidor');
}
// 2) Aparelho de outra empresa: não adota (apaga, como as demais chaves sem documento).
{
  const r = await entrar({ dono: { usuarioId: 'u-outro', empresaId: 'emp-2', nome: 'Outro' }, documentos: [] });
  ok(r.compras === null, 'Dado de outra empresa não é enviado');
  ok(!r.fila, 'Nada na fila');
}
// 3) Servidor já tem Compras: vale o do servidor.
{
  const doServidor = JSON.stringify({ fornecedores: [] });
  const r = await entrar({ dono: { usuarioId: 'u-teste', empresaId: 'emp-1', nome: 'Teste' }, documentos: [{ chave: 'cicluz-compras-v1', valor: doServidor, versao: 5 }] });
  ok(r.compras === doServidor, 'Com documento no servidor, o aparelho recebe o do servidor');
  ok(!r.fila, 'Nada na fila');
  ok(r.aba.versoes['cicluz-compras-v1'] === 5, 'A aba guarda a versão do servidor');
}

await navegador.close();
servidor.close();
console.log(verificacoes + ' verificações da entrada (chave adotada do aparelho) passaram');
