// Verificação de navegador do módulo Compras (Playwright + Chromium, isolado, sem dados reais).
// Rodar: npm run test:telas
// 1) Fluxo completo pela interface: agenda → pedido → envio → resposta na página do fornecedor
//    → decisão na cotação → recebimento → estoque.
// 2) Matriz de layout: todas as telas de Compras em 320, 390 e 1024 px, temas claro e escuro:
//    sem erro de página, sem rolagem lateral, cabeçalho e um único rodapé visíveis.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { iniciar, SESSAO_LOCAL } from './servidor.mjs';

const { servidor, url } = await iniciar();
const navegador = await chromium.launch();
const erros = [];
let verificacoes = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); verificacoes++; };

async function abrirPagina(largura) {
  const contexto = await navegador.newContext({ viewport: { width: largura, height: 844 } });
  // Porteiro da main (cicluz-sessao.js): sessão de aba de teste, sem chaves sincronizadas.
  await contexto.addInitScript((s) => sessionStorage.setItem('cicluz-sync-aba', s), JSON.stringify(SESSAO_LOCAL));
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => erros.push(largura + 'px: ' + e.message));
  await pagina.route('https://fonts.googleapis.com/**', (r) => r.abort());
  await pagina.route('https://fonts.gstatic.com/**', (r) => r.abort());
  await pagina.goto(url, { waitUntil: 'load' });
  await pagina.waitForFunction(() => window.CicluzCompras && window.CicluzComprasCotacao);
  await pagina.evaluate(() => { if (document.body.classList.contains('mobile-menu-visible')) document.getElementById('toggleMenu').click(); });
  return pagina;
}
const clicarTexto = (pagina, seletor, texto) => pagina.locator(seletor, { hasText: texto }).first().click();
const dialogo = (pagina) => pagina.locator('dialog.compras-dialog[open]').last();

/* ---------- 1) Fluxo pela interface ---------- */
{
  const p = await abrirPagina(1024);
  // Menu de Mercadorias (vídeo do Rodrigo, 06/11/2026): sem o item "Compras (revisar)"; rotina em Lançamentos,
  // cadastros em Cadastros Geral, estoque em Estoques e o agendamento em Agenda.
  const subMercadorias = await p.evaluate(() => sections[3][1].join('|'));
  ok(subMercadorias === 'Lançamentos|Lançamentos Produção|Relatórios|Cadastros Geral|Cadastros Geral Produção|Estoques|Pastas Documentos', 'Mercadorias sem "Compras (revisar)": ' + subMercadorias);
  const cardsDe = async (sub) => { await p.evaluate((x) => menuBack(3, x)(), sub); return p.locator('#sector-content .section-card b').allTextContents(); };
  const lanc = await cardsDe('Lançamentos');
  ok(lanc.join('|') === 'MER - Mercadorias|MER - Pedido de Compra|MER - Cotação por Fornecedor|MER - Pedidos a Receber|MER - Contagem de Estoque', 'Lançamentos: pede → cota → recebe → conta, sem os espaços reservados MER - Pedidos e MER - Estoque: ' + lanc.join('|'));
  const cad = await cardsDe('Cadastros Geral');
  ok(cad.join('|') === 'MER - Grupos de Mercadorias|MER - Fornecedores|MER - Produtos|Unidades de Medida|MER - Catálogo e Preço-Base', 'Cadastros Geral com o Catálogo e Preço-Base: ' + cad.join('|'));
  ok((await cardsDe('Estoques')).join('|') === 'MER - Grupo Mercadorias', 'Estoques só com o estoque');
  ok(await p.locator('#sector-content .card-inherited-icon.revisar').count() === 0, 'Nenhuma exclamação de revisar nas linhas de Mercadorias');
  for (const [sub, titulo, id] of [['Lançamentos', 'MER - Pedido de Compra', 'solicitacao'], ['Lançamentos', 'MER - Cotação por Fornecedor', 'cotacao'], ['Lançamentos', 'MER - Pedidos a Receber', 'pedidos'], ['Lançamentos', 'MER - Contagem de Estoque', 'conferencias'], ['Cadastros Geral', 'MER - Catálogo e Preço-Base', 'cadastro']]) {
    await p.evaluate((x) => menuBack(3, x)(), sub);
    await p.locator('#sector-content .section-card', { hasText: titulo }).click();
    ok(await p.locator('#compras-' + id + '.show').count() === 1 && (await p.locator('#compras-' + id + ' .head h2').first().textContent()).trim() === titulo, sub + ' → ' + titulo + ' abre a tela com o mesmo nome');
    ok((await p.locator('#compras-' + id + ' .head p').first().textContent()).includes('Saídas · Mercadorias / ' + sub + ' / ' + titulo), 'Caminho de ' + titulo + ' mostra ' + sub);
  }
  const agendaBotao = await p.evaluate(() => [...document.querySelectorAll('.nav button')].map((b) => b.textContent.trim()).filter((t) => t.includes('Agenda de Pedidos')));
  ok(agendaBotao.join() === 'MER - Agenda de Pedidos', 'Agenda → MER - Agenda de Pedidos, sem "(revisar)": ' + agendaBotao.join());

  // "+" fixo do menu rápido aciona a criação da tela (header-add-circle)
  for (const [tela, titulo] of [['produtos', 'Cadastro produto'], ['fornecedores', 'Cadastro fornecedor'], ['cotacao', 'Pedido urgente'], ['conferencias', 'Agendar conferência']]) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    await p.locator('.view.show .people-add-control').click();
    ok(await p.locator('dialog.compras-dialog[open]', { hasText: titulo }).count() === 1, '"+" abre ' + titulo);
    await p.locator('dialog.compras-dialog[open] .people-close-control').click();
  }
  // Fornecedores tem a bolinha "+" no cabeçalho da lista (pedido do Rodrigo, 15/11/2026); as outras telas seguem sem repetir o "+".
  for (const [tela, rotulo] of [['agendamento', 'Novo agendamento'], ['cotacao', 'Pedido urgente'], ['conferencias', 'Agendar conferência'], ['unidades', 'Nova unidade']]) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    ok(await p.locator('#compras-' + tela + ' .content button', { hasText: rotulo }).count() === 0, 'Sem botão repetido do "+" em ' + tela);
  }
  // Cadastro novo de fornecedor (15/11/2026): categoria da lista, CNPJ (sem tipo de pessoa) com dígito
  // verificador e WhatsApp obrigatórios; nascimento só para pessoa física. Dados fictícios.
  ok(await p.evaluate(() => CicluzComprasDados.fornecedor('f-ambev').ramo === 'Bebidas' && !CicluzComprasDados.dados.fornecedores.some((f) => 'categoria' in f)), 'O texto livre antigo virou o ramo');
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.every((f) => ((f.categorias || []).join() === 'produto') === (CicluzComprasDominio.vinculosComProdutos(CicluzComprasDados.dados, f.id) > 0))), 'Fornecedor antigo ligado a produto virou Produto; sem vínculo, fica sem categoria');
  await p.evaluate(() => CicluzCompras.abrir('fornecedores'));
  await p.locator('#compras-fornecedores .compras-secao-cab button[aria-label="Cadastrar fornecedor"]').click();
  const df = p.locator('dialog.compras-dialog[open]').last();
  const erroF = async () => (await df.locator('.profiles-error').allTextContents()).join(' ');
  const etapaF = (d) => d.locator('.stepper-summary').textContent();
  const avancar = (d) => d.locator('.compras-etapas-nav button', { hasText: 'Avançar' }).click();
  // Cadastro em 4 etapas, com a barra de etapas do sistema
  ok((await etapaF(df)).includes('Etapa 1 de 6') && await df.locator('.stepper-item').count() === 6, 'Cadastro de fornecedor abre na etapa 1 de 6');
  // As consultas de CNPJ e CEP não saem para a rede no teste: a resposta é simulada aqui, com dados fictícios.
  await p.route('https://brasilapi.com.br/**', (r) => {
    const u = r.request().url();
    if (u.includes('/cnpj/')) return r.fulfill({ json: { razao_social: 'RAZAO DA CONSULTA LTDA', nome_fantasia: 'FANTASIA DA CONSULTA', cep: '70000000', descricao_tipo_de_logradouro: 'QUADRA', logradouro: 'TESTE', numero: '100', complemento: 'SALA 1', bairro: 'BAIRRO UM', municipio: 'CIDADE UM', uf: 'DF' } });
    if (u.includes('/cep/v2/01001000')) return r.fulfill({ json: { cep: '01001000', state: 'SP', city: 'Cidade Dois', neighborhood: 'Bairro Dois', street: 'Praça Teste' } });
    return r.abort();
  });
  ok((await etapaF(df)).includes('Dados da empresa') && await df.getByLabel('Tipo de fornecedor *', { exact: true }).count() === 0 && await df.getByLabel('CPF *', { exact: true }).count() === 0 && await df.getByLabel('CNPJ *', { exact: true }).isVisible() && await df.getByLabel('CEP', { exact: true }).isVisible(), 'Etapa 1 é Dados da empresa: só CNPJ (sem tipo de pessoa nem CPF) e o endereço por CEP');
  ok(await df.locator('.compras-etapas-nav button', { hasText: 'Salvar' }).count() === 0, 'No cadastro novo o Salvar só aparece na última etapa');
  await avancar(df);
  ok((await erroF()).includes('categoria') && (await etapaF(df)).includes('Etapa 1'), 'Avançar confere a etapa: categoria é obrigatória');
  // Categoria em cartões de escolha única (rádio): marcar um desmarca o outro. Fica no mesmo quadro branco da Situação.
  ok(await df.locator('.compras-situacao-quadro', { hasText: 'Categoria do fornecedor *' }).locator('.compras-cartao-escolha').count() === 2, 'Categoria do fornecedor no quadro branco, com os dois cartões dentro');
  const cartaoF = (d, nome) => d.locator('.compras-cartao-escolha', { hasText: nome });
  ok(await df.locator('.compras-cartao-escolha').count() === 2 && await cartaoF(df, 'Produto').getAttribute('aria-checked') === 'false' && await df.locator('[role=radiogroup] [role=radio]').count() === 2 && await df.locator('input[type=checkbox][aria-label=Produto]').count() === 0, 'Categoria em dois cartões, sem as caixinhas antigas');
  await cartaoF(df, 'Serviço').click();
  ok(await cartaoF(df, 'Serviço').getAttribute('aria-checked') === 'true' && (await df.locator('.stepper-item').nth(1).textContent()).includes('Dados do prestador de serviço'), 'Serviço marcado: a 2ª etapa vira Dados do prestador');
  await cartaoF(df, 'Produto').click();
  ok(await cartaoF(df, 'Produto').getAttribute('aria-checked') === 'true' && await cartaoF(df, 'Serviço').getAttribute('aria-checked') === 'false' && (await df.locator('.stepper-item').nth(1).textContent()).includes('Dados do Vendedor'), 'Marcar Produto desmarca Serviço (escolha única) e a 2ª etapa volta a Dados do vendedor');
  ok(await df.getByLabel('CNPJ *', { exact: true }).isVisible() && await df.getByLabel('Razão social', { exact: true }).isVisible() && await df.getByLabel('Regime tributário', { exact: true }).isVisible() && await df.locator('fieldset').first().getByLabel('Regime tributário', { exact: true }).count() === 1, 'Pessoa jurídica: razão social, nome fantasia, CNPJ e regime tributário');
  await df.getByLabel('Razão social', { exact: true }).fill('Fornecedor CNPJ Teste Comércio Ltda');
  await df.getByLabel('Nome fantasia', { exact: true }).fill('Fornecedor CNPJ Teste');
  await df.getByLabel('Regime tributário', { exact: true }).selectOption('simples');
  // Ativo/inativo no quadro padrão "Situação do fornecedor" (interruptor), não em caixa de marcar.
  const chaveF = df.getByRole('switch', { name: 'Situação do fornecedor' });
  ok(await chaveF.getAttribute('aria-checked') === 'true' && (await df.locator('.compras-situacao-quadro .account-status-text').textContent()) === 'Ativo' && await df.getByLabel('Fornecedor ativo').count() === 0, 'Situação do fornecedor: interruptor ligado em Ativo, sem a caixa antiga');
  await chaveF.click();
  ok(await chaveF.getAttribute('aria-checked') === 'false' && (await df.locator('.compras-situacao-quadro .account-status-text').textContent()) === 'Inativo', 'O interruptor desliga e o texto vira Inativo');
  await chaveF.click();
  await df.getByLabel('Ramo', { exact: true }).fill('Bebidas');
  await df.getByLabel('CNPJ *', { exact: true }).pressSequentially('11222333000180');
  ok((await df.getByLabel('CNPJ *', { exact: true }).inputValue()) === '11.222.333/0001-80', 'CNPJ com máscara (14 dígitos, sem cortar em 11)');
  await avancar(df);
  ok((await erroF()).includes('CNPJ válido'), 'CNPJ com dígito verificador errado é recusado');
  await df.getByLabel('CNPJ *', { exact: true }).fill('11222333000181');
  // Consulta do CNPJ: preenche o endereço, sem trocar o que foi digitado (razão social e nome fantasia).
  await df.getByLabel('UF', { exact: true }).evaluate((s) => new Promise((ok2) => { const t = setInterval(() => { if (s.value) { clearInterval(t); ok2(); } }, 50); }));
  ok(await df.getByLabel('UF', { exact: true }).inputValue() === 'DF' && await df.getByLabel('Número', { exact: true }).inputValue() === '100' && await df.getByLabel('Razão social', { exact: true }).inputValue() === 'Fornecedor CNPJ Teste Comércio Ltda', 'A consulta do CNPJ preenche o endereço e não troca o que foi digitado');
  // Trocar o CEP: rua, bairro, cidade e UF mudam juntos; número e complemento da consulta anterior saem; o que foi digitado à mão fica.
  await df.getByLabel('Bairro', { exact: true }).fill('Bairro digitado');
  await df.getByLabel('CEP', { exact: true }).fill('01001000');
  await df.getByLabel('UF', { exact: true }).evaluate((s) => new Promise((ok2) => { const t = setInterval(() => { if (s.value === 'SP') { clearInterval(t); ok2(); } }, 50); }));
  ok(await df.getByLabel('Cidade', { exact: true }).inputValue() === 'Cidade Dois' && await df.getByLabel('Rua / logradouro', { exact: true }).inputValue() === 'Praça Teste' && await df.getByLabel('Número', { exact: true }).inputValue() === '' && await df.getByLabel('Complemento', { exact: true }).inputValue() === '' && await df.getByLabel('Bairro', { exact: true }).inputValue() === 'Bairro digitado', 'Trocar o CEP troca rua, cidade e UF em bloco, esvazia número e complemento da consulta anterior e mantém o bairro digitado');
  await avancar(df);
  ok((await etapaF(df)).includes('Etapa 2 de 6'), 'Etapa 2: vendedor ou prestador');
  await avancar(df);
  ok((await erroF()).includes('WhatsApp'), 'WhatsApp do vendedor é obrigatório');
  await df.getByLabel('Nome do vendedor', { exact: true }).fill('Responsável Teste');
  await df.getByLabel('WhatsApp do vendedor *', { exact: true }).pressSequentially('31999990000');
  await avancar(df);
  ok(await df.getByLabel('O mesmo da etapa anterior (financeiro)', { exact: true }).isVisible(), 'Etapa 3: financeiro, com "O mesmo da etapa anterior" em primeiro');
  await df.getByLabel('Nome do financeiro', { exact: true }).fill('Financeiro Teste');
  await df.getByLabel('E-mail do financeiro', { exact: true }).fill('financeiro@exemplo.test');
  // Contrato dentro do financeiro: interruptor "Tem contrato?" (Sim / Não); com Sim aparecem os dados.
  const chaveC = df.getByRole('switch', { name: 'Tem contrato?' });
  ok(await chaveC.getAttribute('aria-checked') === 'false' && await df.getByLabel('Forma de pagamento', { exact: true }).isHidden(), 'Sem contrato, os dados do contrato ficam escondidos');
  await chaveC.click();
  await df.getByLabel('Forma de pagamento', { exact: true }).selectOption('boleto');
  await df.getByLabel('Recorrência', { exact: true }).selectOption('mes');
  ok(await df.getByLabel('Dia do vencimento', { exact: true }).isVisible() && await df.getByLabel('Data de vencimento', { exact: true }).isHidden(), 'Contrato por mês pede o dia do vencimento');
  await df.getByLabel('Dia do vencimento', { exact: true }).fill('10');
  await df.getByLabel('Valor', { exact: true }).fill('1.500,00');
  await df.getByLabel('Início da vigência', { exact: true }).fill('01/01/26');
  await df.getByLabel('Término da vigência', { exact: true }).fill('31/12/25');
  await df.getByLabel('Reajuste', { exact: true }).selectOption('percentual');
  await avancar(df);
  ok((await erroF()).includes('antes do início'), 'Término do contrato antes do início é recusado');
  await df.getByLabel('Término da vigência', { exact: true }).fill('31/12/26');
  await avancar(df);
  ok((await erroF()).includes('percentual'), 'Reajuste por percentual fixo pede o percentual');
  await df.getByLabel('Percentual do reajuste (%) *', { exact: true }).fill('4,5');
  await avancar(df);
  await df.getByLabel('O mesmo da etapa anterior (representante)', { exact: true }).check();
  ok(await df.getByLabel('Nome do representante', { exact: true }).inputValue() === 'Financeiro Teste' && await df.getByLabel('Nome do representante', { exact: true }).getAttribute('readonly') !== null && await df.getByLabel('Cargo na empresa', { exact: true }).isEditable(), '"O mesmo da etapa anterior" preenche nome, WhatsApp e e-mail (só leitura) e deixa o Cargo na empresa para escolher');
  await df.getByLabel('Cargo na empresa', { exact: true }).selectOption('gerente-comercial');
  // Etapa 5, Vínculos (Produto): marcar um produto cria o vínculo no mesmo catálogo do Compras.
  await avancar(df);
  ok((await etapaF(df)).includes('Vínculos') && await df.locator('button', { hasText: 'Produtos' }).isVisible() && await df.locator('.compras-chip', { hasText: 'inativo' }).count() === 0, 'Etapa 5: Vínculos, com os produtos para a categoria Produto');
  // O botão Produtos abre a lista em outra janela: busca, marcar e confirmar; a etapa mostra o escolhido.
  await df.locator('button', { hasText: 'Produtos' }).click();
  const seletorF = p.locator('dialog.compras-dialog[open]').last();
  await seletorF.locator('.compras-vinculos-lista input[type=checkbox]:not(:disabled)').first().check();
  await seletorF.locator('.people-save-control').click();
  ok(await df.locator('.compras-chip.ativo').count() === 1, 'O produto escolhido aparece na etapa, com opção de remover');
  // Etapa 6, Contrato (o documento): mostra o que foi combinado no financeiro.
  await avancar(df);
  ok((await etapaF(df)).includes('Contrato') && (await df.locator('fieldset', { has: p.locator('legend', { hasText: /^Contrato$/ }) }).textContent()).includes('Todo dia 10'), 'Etapa 6: Contrato, com o resumo do financeiro');
  // As duas formas de assinatura existem, mas estão desligadas: só avisam.
  for (const forma of ['Impressão / assinatura manual', 'Envio / assinatura digital']) {
    await df.locator('button', { hasText: forma }).click();
    ok((await df.locator('fieldset', { has: p.locator('legend', { hasText: /^Contrato$/ }) }).locator('[role=status]').textContent()).includes('ainda não está ativa') && p.context().pages().length === 1, forma + ': desligada, só avisa');
  }
  await df.locator('.compras-etapas-nav button', { hasText: 'Salvar' }).click();
  await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'));
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.some((f) => f.documento === '11.222.333/0001-81' && f.contrato.tem === true && f.contrato.formaPagamento === 'boleto' && f.contrato.recorrencia === 'mes' && f.contrato.vencimentoDia === 10 && f.contrato.reajuste === 'percentual' && f.contrato.reajustePercentual === 4.5 && f.contrato.valorCentavos === 150000 && f.contrato.inicio === '2026-01-01' && f.contrato.fim === '2026-12-31' && CicluzComprasDados.dados.catalogo.filter((v) => v.fornecedorId === f.id && v.status === 'aprovado').length === 1 && f.tipoPessoa === 'juridica' && f.categorias.join() === 'produto' && f.ramo.toUpperCase() === 'BEBIDAS' && f.nome.toUpperCase() === 'FORNECEDOR CNPJ TESTE' && f.razaoSocial.toUpperCase().includes('LTDA') && f.regimeTributario === 'simples' && f.contatoNome && f.financeiro.email === 'financeiro@exemplo.test' && f.representante.mesmo && f.representante.email === 'financeiro@exemplo.test' && f.representante.cargo === 'gerente-comercial' && !('vendedorCpf' in f))), 'Fornecedor pessoa jurídica salvo com as 4 etapas (o representante copia o financeiro e guarda o cargo)');
  // Segundo fornecedor, só Serviço; aniversário do prestador (mês e ano) é opcional
  await p.locator('.view.show .people-add-control').click();
  const dp = p.locator('dialog.compras-dialog[open]').last();
  await dp.locator('.compras-cartao-escolha', { hasText: 'Serviço' }).click();
  await dp.getByLabel('Nome fantasia', { exact: true }).fill('Prestador Serviço Teste');
  await dp.getByLabel('CNPJ *', { exact: true }).pressSequentially('11444777000161');
  await avancar(dp);
  await dp.getByLabel('WhatsApp do prestador *', { exact: true }).pressSequentially('31988880000');
  // Serviço: Prestador 1 com funções (seleção múltipla), "Acrescentar opção" na janelinha e um segundo prestador.
  ok((await dp.locator('fieldset legend', { hasText: 'Prestador 1' }).count()) === 1 && await dp.locator('.compras-chip', { hasText: 'Pintor' }).first().isVisible(), 'Serviço: a etapa 2 é o Prestador 1, com as funções');
  await dp.locator('.compras-chip', { hasText: 'Pintor' }).first().click();
  await dp.locator('.compras-chip-mais').first().click();
  await dp.getByLabel('Nova função', { exact: true }).first().fill('Vidraceiro Teste');
  await dp.getByLabel('Nova função', { exact: true }).first().press('Enter');
  ok(await p.evaluate(() => CicluzComprasDados.dados.funcoesPrestador.some((x) => x.nome === 'Vidraceiro Teste')) && await dp.locator('.compras-chip[aria-pressed=true]', { hasText: 'Vidraceiro Teste' }).count() === 1 && await dp.isVisible(), 'Acrescentar opção cria a função, já marcada, sem fechar o cadastro');
  await dp.locator('button', { hasText: 'Adicionar prestador' }).click();
  await dp.locator('fieldset', { has: p.locator('legend', { hasText: 'Prestador 2' }) }).getByLabel('Nome do prestador *', { exact: true }).fill('Segundo Prestador Teste');
  await dp.getByLabel('Aniversário', { exact: true }).pressSequentially('1503');
  await avancar(dp); await avancar(dp); await avancar(dp);
  ok(await dp.locator('button', { hasText: 'Grupo de despesas' }).isVisible() && await dp.locator('button', { hasText: 'Produtos' }).isHidden(), 'Etapa 5 na categoria Serviço: botão Grupo de despesas, sem o de produtos');
  await avancar(dp);
  await dp.locator('.compras-etapas-nav button', { hasText: 'Salvar' }).click();
  await p.waitForFunction(() => !document.querySelector('dialog.compras-dialog[open]'));
  ok(await p.evaluate(() => CicluzComprasDados.dados.fornecedores.some((f) => f.documento === '11.444.777/0001-61' && f.tipoPessoa === 'juridica' && f.vendedorAniversario === '03-15' && f.categorias.join() === 'servico' && f.prestadores.length === 2 && f.prestadores[0].funcoes.length === 2 && f.prestadores[0].whatsapp === f.whatsapp && f.prestadores[1].nome.toUpperCase() === 'SEGUNDO PRESTADOR TESTE')), 'Segundo fornecedor salvo com CNPJ, categoria Serviço e dois prestadores (o 1º espelha o contato, com duas funções)');
  // Enviar link para cadastro (P-29): o botão e o painel existem; o envio fica desligado, sem abrir nada.
  const enviarF = p.locator('.view.show button[aria-label="Enviar link para cadastro"]');
  await enviarF.click();
  const painelF = p.locator('.view.show .compras-enviar-painel');
  ok(await painelF.isVisible() && await painelF.locator('.compras-enviar-canais button').count() === 4 && await painelF.locator('select').inputValue() === '3', 'Enviar abre o painel com fechar, WhatsApp, e-mail e SMS e o prazo padrão de 3 dias úteis');
  // Trocar o prazo guarda o novo padrão para os próximos envios (preferência do aparelho); data e hora não vira padrão.
  await painelF.locator('select').selectOption('5');
  ok(await p.evaluate(() => localStorage.getItem('cicluz-fornecedores-prazo-convite')) === '5' && (await painelF.textContent()).includes('Tipo de envio'), 'O prazo escolhido fica guardado como padrão e o painel mostra o Tipo de envio');
  await painelF.locator('select').selectOption('data');
  ok(await p.evaluate(() => localStorage.getItem('cicluz-fornecedores-prazo-convite')) === '5', 'Data e hora não troca o padrão guardado');
  await p.evaluate(() => localStorage.removeItem('cicluz-fornecedores-prazo-convite'));
  ok(await painelF.getByLabel('Hora', { exact: true }).isVisible(), 'O prazo aceita data e hora');
  for (const canal of ['WhatsApp', 'E-mail', 'SMS']) {
    await painelF.locator('button[aria-label="Enviar por ' + canal + '"]').click();
    ok((await painelF.locator('[role=status]').textContent()).includes('ainda não está ativo') && p.context().pages().length === 1, canal + ': o envio está desligado e nada é aberto');
  }
  await painelF.locator('button[aria-label="Fechar"]').click();
  ok(await painelF.isHidden(), 'A seta fecha o painel');
  // DES - Fornecedores abre o mesmo cadastro, na cor de Despesas
  await p.evaluate(() => CicluzCompras.abrir('fornecedores-des'));
  ok(await p.locator('#despesas-fornecedores.show').count() === 1 && (await p.locator('#despesas-fornecedores .head h2').textContent()) === 'DES - Fornecedores' && await p.locator('#despesas-fornecedores .compras-linha', { hasText: 'Prestador Serviço Teste' }).count() === 1, 'DES - Fornecedores mostra os mesmos fornecedores');
  ok(await p.locator('#despesas-fornecedores .compras-content button.btn').count() === 1 && (await p.locator('#despesas-fornecedores .compras-secao-cab h3 button.btn').textContent()).trim() === 'Fornecedores' && await p.locator('#despesas-fornecedores .compras-secao-cab .compras-redondo').count() === 1 && await p.locator('#despesas-fornecedores .compras-content input[type=search]').count() === 0, 'No topo só o botão Cadastrar fornecedor; a busca é a do rodapé');
  ok((await p.locator('#despesas-fornecedores .compras-linha.com-acoes', { hasText: 'Prestador Serviço Teste' }).locator('.c-categoria').textContent()) === 'Serviço', 'A linha mostra a categoria marcada');
  // Setinha do título oculta e mostra a coluna (preferência do aparelho)
  const setaRamo = p.locator('#despesas-fornecedores .compras-linha-cabecalho .c-ramo .compras-coluna-seta');
  await setaRamo.click();
  ok(await setaRamo.getAttribute('aria-expanded') === 'false' && await p.locator('#despesas-fornecedores .compras-linha.com-acoes .c-ramo').first().isHidden(), 'A setinha do título oculta a coluna');
  await setaRamo.click();
  ok(await setaRamo.getAttribute('aria-expanded') === 'true' && await p.locator('#despesas-fornecedores .compras-linha.com-acoes .c-ramo').first().isVisible(), '...e mostra de novo');
  await p.evaluate(() => CicluzCompras.abrir('estoque'));
  ok(await p.locator('#compras-estoque button', { hasText: 'Extrato completo' }).isVisible(), 'Extrato completo visível no Estoque');
  for (const tela of ['cadastro', 'pedidos']) {
    await p.evaluate((n) => CicluzCompras.abrir(n), tela);
    const altura = (await p.locator('#compras-' + tela + ' .compras-abas').boundingBox()).height;
    ok(altura < 60, 'Abas com a altura dos chips em ' + tela + ' (' + Math.round(altura) + 'px)');
  }
  // Agendamento pela interface: fica no menu Agenda → "MER - Agenda de Pedidos" (Rodrigo, 05/11 e 06/11)
  await p.evaluate(() => [...document.querySelectorAll('.nav button')].find((b) => b.textContent.includes('MER - Agenda de Pedidos')).click());
  ok(await p.locator('#compras-agendamento.show').count() === 1, 'Agenda → MER - Agenda de Pedidos abre o agendamento do Compras');
  await p.locator('.view.show .people-add-control').click(); // "+" do rodapé fixo
  const d1 = dialogo(p);
  await d1.locator('select[aria-label="Grupo *"]').selectOption({ label: 'BEBIDAS' });
  await d1.getByRole('checkbox', { name: 'Marcar REFRIGERANTE COLA 2 LT' }).check();
  await d1.getByRole('checkbox', { name: 'Marcar REFRIGERANTE GUARANÁ 2 LT' }).check();
  await d1.locator('select[aria-label="Responsável por executar *"]').selectOption('u-jose');
  ok(await d1.locator('.compras-dialog-acoes').isHidden() || (await d1.locator('.compras-dialog-acoes').boundingBox()).width <= 1, 'Diálogo de salvar sem a linha Cancelar/Salvar duplicada');
  await d1.locator('.people-save-control').click();
  ok(await p.locator('#compras-agendamento .compras-agenda').count() === 1, 'Agendamento salvo e listado');

  // Gera o pedido da próxima data (simulação do agendador)
  await p.locator('#compras-agendamento .compras-datas .compras-chip').first().click();
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Gerar o pedido agora');
  await p.evaluate(() => CicluzCompras.abrir('solicitacao'));
  ok(await p.locator('#compras-solicitacao button', { hasText: 'Fazer o pedido' }).count() === 1, 'Pedido aparece em Para enviar');

  // Fazer o pedido
  await clicarTexto(p, '#compras-solicitacao button', 'Fazer o pedido');
  const d2 = dialogo(p);
  await d2.getByLabel('Quantidade de REFRIGERANTE COLA 2 LT').fill('24');
  await d2.getByLabel('Quantidade de REFRIGERANTE GUARANÁ 2 LT').fill('12');
  await d2.locator('.people-save-control').click();
  const convites = p.locator('dialog.compras-dialog[open]', { hasText: 'Enviado aos fornecedores' });
  await convites.waitFor();
  ok(await convites.locator('.compras-linha').count() === 2, 'Convites enviados a 2 fornecedores');
  const tokens = await p.evaluate(() => CicluzComprasDados.dados.convites.map((c) => ({ f: c.fornecedorId, t: c.token })));
  await convites.locator('.people-close-control').click();

  // Fornecedor responde na página pública (outra aba, mesmo navegador)
  const forn = await p.context().newPage();
  forn.on('pageerror', (e) => erros.push('fornecedor: ' + e.message));
  await forn.goto(url + 'rodada.html?t=' + tokens.find((x) => x.f === 'f-ambev').t);
  const valores = forn.locator('.rodada-item');
  await valores.nth(0).getByLabel('Valor unitário (R$) *').fill('8,00');
  await valores.nth(1).getByLabel('Valor unitário (R$) *').fill('7,50');
  await forn.getByRole('button', { name: 'Enviar resposta' }).click();
  ok(await forn.getByText('Comprado: pode entregar').count() === 1, 'Coca dentro da referência foi comprada automaticamente');
  ok(await forn.getByText('Aguardando o comprador').count() === 1, 'Guaraná acima da base ficou para o comprador');

  // Separação: ajustar a quantidade comprada ao estoque, dentro da faixa (24 ± 10% → 21,6 a 26,4)
  const separacao = forn.locator('.rodada-separacao');
  ok(await separacao.getByText('Compramos estes produtos de você').count() === 1, 'Seu pedido aparece depois de comprado');
  const campo = separacao.getByLabel('Quantidade que vou entregar');
  await campo.fill('30');
  ok(await separacao.getByRole('button', { name: 'Salvar ajuste' }).isDisabled(), 'Quantidade fora da faixa bloqueia o ajuste');
  await campo.fill('25');
  await separacao.getByRole('button', { name: 'Salvar ajuste' }).click();
  ok(await forn.getByText('Ajuste salvo. O comprador vê a quantidade nova no pedido.').count() === 1, 'Ajuste salvo');
  ok(await p.evaluate(() => CicluzComprasDados.dados.pedidos[0].eventos.some((e) => e.obs.includes('Fornecedor ajustou ao estoque dele'))), 'Ajuste registrado no histórico do pedido');

  // Produtos que também vendo: vínculo nasce aprovado
  await forn.getByRole('button', { name: 'Ver lista' }).click();
  const vendo = forn.locator('.rodada-vendo');
  ok(await vendo.getByText('Já é seu').count() === 4, 'Produtos liberados que já são do fornecedor aparecem marcados (Água não está liberada)');
  await vendo.getByLabel('Buscar produto').fill('farinha');
  await vendo.locator('label', { hasText: 'Farinha de Trigo' }).locator('input').check();
  await vendo.getByRole('button', { name: 'Salvar 1 produto(s)' }).click();
  ok(await forn.getByText('1 produto(s) a mais.').count() === 1, 'Produto a mais salvo');
  ok(await p.evaluate(() => CicluzComprasDados.dados.catalogo.some((v) => v.fornecedorId === 'f-ambev' && v.produtoId === 'p-farinha' && v.status === 'aprovado' && v.origem === 'fornecedor')), 'Vínculo do fornecedor nasce aprovado');
  await forn.close();

  // Comprador decide na cotação
  await p.evaluate(() => CicluzCompras.abrir('cotacao'));
  await p.locator('#compras-cotacao tbody tr', { hasText: 'Guaraná' }).click();
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Aceitar');
  await p.locator('dialog.compras-dialog[open]').last().locator('.people-save-control').click();
  const pedidos = await p.evaluate(() => CicluzComprasDados.dados.pedidos.map((x) => x.itens.length));
  ok(pedidos.length === 1 && pedidos[0] === 2, 'Pedido "Comprado" com 2 itens');

  // Recebimento → estoque
  const saldoAntes = await p.evaluate(() => CicluzComprasDados.produto('p-coca2l').saldo);
  await p.evaluate(() => CicluzCompras.abrir('pedidos'));
  await p.locator('#compras-pedidos .compras-linha').first().click();
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Conferir recebimento');
  await clicarTexto(p, 'dialog.compras-dialog[open] button', 'Recebi tudo');
  await p.locator('dialog.compras-dialog[open]').last().locator('.people-save-control').click();
  const saldoDepois = await p.evaluate(() => CicluzComprasDados.produto('p-coca2l').saldo);
  ok(saldoDepois === saldoAntes + 25, 'Recebimento somou ao estoque a quantidade ajustada pelo fornecedor (25)');
  ok(await p.evaluate(() => CicluzComprasDados.dados.movimentos.length) === 2, 'Extrato com uma entrada por item');
  await p.close();
}

/* ---------- 2) Matriz de layout ---------- */
const telas = ['agendamento', 'solicitacao', 'cotacao', 'pedidos', 'conferencias', 'estoque', 'cadastro', 'unidades', 'fornecedores', 'produtos'];
let combinacoes = 0;
for (const largura of [320, 390, 1024]) {
  const p = await abrirPagina(largura);
  for (const escuro of [false, true]) {
    await p.evaluate((e) => document.body.classList.toggle('dark-theme', e), escuro);
    for (const t of telas) {
      await p.evaluate((nome) => CicluzCompras.abrir(nome), t);
      await p.waitForTimeout(80);
      const m = await p.evaluate(() => {
        const v = document.querySelector('.view.show');
        const visivel = (el) => el && el.getBoundingClientRect().height > 0 && getComputedStyle(el).display !== 'none';
        return {
          id: v && v.id,
          lateral: document.documentElement.scrollWidth - innerWidth,
          cabecalho: visivel(v && v.querySelector('.head')),
          rodapes: v ? [...v.querySelectorAll('.people-bottom-header')].filter(visivel).length : 0,
        };
      });
      const rotulo = t + ' ' + largura + 'px ' + (escuro ? 'escuro' : 'claro');
      ok(m.id === 'compras-' + t, 'Tela aberta: ' + rotulo);
      ok(m.lateral <= 0, 'Sem rolagem lateral: ' + rotulo + ' (' + m.lateral + 'px)');
      ok(m.cabecalho, 'Cabeçalho visível: ' + rotulo);
      ok(m.rodapes === 1, 'Um rodapé: ' + rotulo + ' (' + m.rodapes + ')');
      combinacoes++;
    }
  }
  await p.close();
}

await navegador.close();
servidor.close();
assert.deepEqual(erros, [], 'Erros de página: ' + erros.join(' | '));
console.log(verificacoes + ' verificações de Compras no navegador passaram (fluxo + ' + combinacoes + ' combinações de tela × largura × tema)');
