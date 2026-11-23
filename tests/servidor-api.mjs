// Liga a API de verdade (Postgres limpo + site de dist/) para os testes de tela que precisam do servidor.
// Usa servidor/tests/ambiente-e2e.ts (tsx). Devolve { url, email, senha, entrar(contexto), parar() }.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pastaServidor = fileURLToPath(new URL('../servidor', import.meta.url));

export async function iniciarApi() {
  const filho = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['tsx', 'tests/ambiente-e2e.ts'], {
    cwd: pastaServidor, stdio: ['pipe', 'pipe', 'pipe'], shell: process.platform === 'win32',
  });
  let saidaErro = '';
  filho.stderr.on('data', (b) => { saidaErro += b; });
  const dados = await new Promise((ok, falha) => {
    let acumulado = '';
    const tempo = setTimeout(() => falha(new Error('API de teste não subiu em 3 min. ' + saidaErro.slice(-800))), 180000);
    filho.stdout.on('data', (b) => {
      acumulado += b;
      const linha = acumulado.split('\n').find((l) => l.startsWith('{"url"'));
      if (linha) { clearTimeout(tempo); ok(JSON.parse(linha)); }
    });
    filho.on('exit', (c) => { clearTimeout(tempo); falha(new Error('API de teste saiu (' + c + '). ' + saidaErro.slice(-800))); });
  });
  let importado = false;
  /**
   * Entra pela rota real de login e deixa o cookie de sessão no contexto do navegador. Na primeira vez faz a
   * importação inicial da empresa (como o administrador faz na tela de entrada) com os documentos dados.
   */
  async function entrar(contexto, documentos = {}) {
    const r = await contexto.request.post(dados.url + '/api/auth/sign-in/email', { data: { email: dados.email, password: dados.senha }, headers: { origin: dados.url } });
    if (!r.ok()) throw new Error('Login de teste falhou: ' + r.status() + ' ' + (await r.text()));
    if (importado) return;
    const itens = Object.entries(documentos).map(([chave, valor]) => ({ chave, valor: typeof valor === 'string' ? valor : JSON.stringify(valor) }));
    const i = await contexto.request.post(dados.url + '/api/documentos/importacao', { data: { itens }, headers: { origin: dados.url } });
    if (!i.ok()) throw new Error('Importação inicial de teste falhou: ' + i.status() + ' ' + (await i.text()));
    importado = true;
  }
  function parar() {
    filho.stdin.end();
    setTimeout(() => { try { filho.kill(); } catch (e) { /* já saiu */ } }, 15000).unref();
  }
  return { ...dados, entrar, parar };
}
