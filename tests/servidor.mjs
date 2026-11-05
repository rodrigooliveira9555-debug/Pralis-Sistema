// Servidor estático mínimo para revisar o S2 localmente (sem dependências).
// Uso: node tests/servidor.mjs [porta]  → http://localhost:8000/local.html
// /local.html existe só aqui (não está em dist/ nem no deploy): prepara uma sessão de aba de teste
// para o porteiro (dist/cicluz-sessao.js) liberar as telas sem o backend. Chamadas a /api/ respondem 503;
// nada é enviado a servidor nenhum.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp' };

/** Sessão de aba de teste: sem chaves sincronizadas (nada entra na fila de envio). */
export const SESSAO_LOCAL = { perfil: { usuarioId: 'local', nome: 'Revisão local', empresa: { id: 'local', nome: 'Local' } }, chaves: [], versoes: {} };
const paginaLocal = '<!doctype html><meta charset="utf-8"><title>Revisão local</title><script>sessionStorage.setItem("cicluz-sync-aba",'
  + JSON.stringify(JSON.stringify(SESSAO_LOCAL)) + ');location.replace("index.html")</script>';

export function iniciar(porta = 0) {
  const servidor = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/local.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(paginaLocal);
    }
    if (p.startsWith('/api/')) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end('{"erro":"Sem backend na revisão local"}');
    }
    if (p.endsWith('/')) p += 'index.html';
    const arquivo = path.join(raiz, p);
    if (!arquivo.startsWith(raiz)) return res.writeHead(403).end();
    fs.readFile(arquivo, (erro, corpo) => {
      if (erro) return res.writeHead(404).end('404');
      res.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(corpo);
    });
  });
  return new Promise((ok) => servidor.listen(porta, () => ok({ servidor, url: 'http://localhost:' + servidor.address().port + '/' })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await iniciar(Number(process.argv[2]) || 8000);
  console.log('S2 em ' + url + 'local.html (revisão local, sem backend)');
}
