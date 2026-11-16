/*
 * RET - Patrimônios — regras puras do cadastro em seis etapas (17/11/2026). Sem DOM e sem armazenamento; testado em
 * tests/patrimonio-dominio.cjs. O registro do bem (cicluz-patrimonio-v1 → bens) ganha campos opcionais; os de hoje (nome,
 * categoria, marca, modelo, numeroSerie, numeroPatrimonio, valor, localId, capacidade, medidas, energia, consumoHora, pecas,
 * revisao, audio, ativo) continuam como estão, e a Produção segue lendo o mesmo dado. Só informação cadastral: nada aqui
 * gera lançamento contábil, depreciação oficial, baixa contábil ou pagamento.
 * Dinheiro em reais com 2 casas, como o valor do bem. Datas em ISO (AAAA-MM-DD) ou ''.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CicluzPatrimonioDominio = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Listas ---------- */
  /** Categorias acrescentadas às 4 de hoje (Utensílio, Máquina, Equipamento, Mobiliário, que ficam como estão). */
  const CATEGORIAS_NOVAS = [['informatica', 'Equipamentos de informática'], ['veiculo', 'Veículos'], ['imovel', 'Imóveis'], ['instalacao', 'Instalações'], ['ferramenta', 'Ferramentas'],
    ['industrial', 'Equipamentos industriais'], ['cozinha', 'Equipamentos de cozinha'], ['seguranca', 'Equipamentos de segurança'], ['refrigeracao', 'Equipamentos de refrigeração'],
    ['eletrico', 'Equipamentos elétricos'], ['eletronico', 'Equipamentos eletrônicos'], ['outros', 'Outros']];
  const TIPOS_BEM = [['movel', 'Bem móvel'], ['imovel', 'Bem imóvel'], ['outro', 'Outro']];
  const NATUREZAS = [['tangivel', 'Tangível'], ['intangivel', 'Intangível']];
  const SITUACOES = [['ativo', 'Ativo'], ['inativo', 'Inativo'], ['manutencao', 'Em manutenção'], ['estoque', 'Em estoque'], ['emprestado', 'Emprestado'], ['baixado', 'Baixado']];
  const CONSERVACAO = [['novo', 'Novo'], ['excelente', 'Excelente'], ['bom', 'Bom'], ['regular', 'Regular'], ['ruim', 'Ruim'], ['inutilizavel', 'Inutilizável']];
  const TIPOS_IMAGEM = [['frontal', 'Foto frontal'], ['traseira', 'Foto traseira'], ['lateral', 'Foto lateral'], ['etiqueta', 'Etiqueta patrimonial'], ['serie', 'Número de série'],
    ['placa', 'Placa de identificação'], ['componentes', 'Foto de componentes'], ['avarias', 'Foto de avarias'], ['outra', 'Outras imagens']];
  const TIPOS_DOCUMENTO = [['nota-fiscal', 'Nota fiscal'], ['comprovante', 'Comprovante de compra'], ['garantia', 'Certificado de garantia'], ['manual', 'Manual técnico'], ['contrato', 'Contrato'],
    ['laudo', 'Laudo'], ['inspecao', 'Certificado de inspeção'], ['propriedade', 'Documento de propriedade'], ['manutencao', 'Documento de manutenção'], ['outro', 'Outros documentos']];
  const TIPOS_RESPONSABILIDADE = [['uso', 'Responsável pelo uso'], ['guarda', 'Responsável pela guarda'], ['tecnico', 'Responsável técnico'], ['administrativo', 'Responsável administrativo']];
  const TIPOS_MOVIMENTACAO = [['transf-unidade', 'Transferência entre unidades'], ['transf-setor', 'Transferência entre setores'], ['responsavel', 'Mudança de responsável'], ['emprestimo', 'Empréstimo'],
    ['devolucao', 'Devolução'], ['envio-manutencao', 'Envio para manutenção'], ['retorno-manutencao', 'Retorno da manutenção']];
  const TIPOS_AQUISICAO = [['compra', 'Compra'], ['doacao', 'Doação'], ['transferencia', 'Transferência'], ['producao', 'Produção própria'], ['permuta', 'Permuta'], ['arrendamento', 'Arrendamento'], ['outros', 'Outros']];
  const METODOS_DEPRECIACAO = [['linear', 'Linear'], ['outro', 'Outro método'], ['nao', 'Não depreciável']];
  const TIPOS_MANUTENCAO = [['preventiva', 'Preventiva'], ['corretiva', 'Corretiva'], ['preditiva', 'Preditiva'], ['inspecao', 'Inspeção'], ['calibracao', 'Calibração'], ['limpeza', 'Limpeza técnica'], ['outros', 'Outros']];
  const SITUACOES_MANUTENCAO = [['agendada', 'Agendada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']];
  const SITUACOES_PECA = [['ativo', 'Ativa'], ['substituido', 'Substituída'], ['baixado', 'Baixada']];
  const MOTIVOS_BAIXA = [['venda', 'Venda'], ['doacao', 'Doação'], ['descarte', 'Descarte'], ['perda', 'Perda'], ['furto', 'Roubo ou furto'], ['sinistro', 'Sinistro'], ['obsolescencia', 'Obsolescência'],
    ['sucateamento', 'Sucateamento'], ['outros', 'Outras baixas']];
  const RESULTADOS_INSPECAO = [['aprovado', 'Aprovado'], ['ressalvas', 'Aprovado com ressalvas'], ['reprovado', 'Reprovado'], ['pendente', 'Pendente']];
  const TIPOS_ARQUIVO_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];
  const TIPOS_ARQUIVO_DOCUMENTO = ['application/pdf', ...TIPOS_ARQUIVO_IMAGEM];
  const LIMITES = { imagens: 20, documentos: 30, tamanhoArquivo: 10 * 1024 * 1024 };

  /** Características técnicas que fazem sentido por categoria (as demais ficam fora da tela). */
  const TECNICAS = [
    ['fabricante', 'Fabricante'], ['modeloTecnico', 'Modelo técnico'], ['serieTecnica', 'Número de série'], ['anoFabricacao', 'Ano de fabricação'], ['capacidade', 'Capacidade nominal'],
    ['potencia', 'Potência'], ['voltagem', 'Voltagem'], ['frequencia', 'Frequência elétrica'], ['dimensoes', 'Dimensões'], ['peso', 'Peso'], ['material', 'Material'], ['cor', 'Cor'],
    ['consumo', 'Consumo energético'], ['especificacoes', 'Especificações técnicas'], ['observacoes', 'Observações técnicas'],
  ];
  const BASE_TECNICA = ['fabricante', 'modeloTecnico', 'especificacoes', 'observacoes'];
  const POR_CATEGORIA = {
    informatica: ['serieTecnica', 'anoFabricacao', 'voltagem', 'potencia', 'consumo', 'cor', 'peso', 'dimensoes'],
    eletronico: ['serieTecnica', 'anoFabricacao', 'voltagem', 'potencia', 'consumo', 'cor', 'peso', 'dimensoes'],
    veiculo: ['serieTecnica', 'anoFabricacao', 'capacidade', 'potencia', 'peso', 'cor', 'dimensoes'],
    imovel: ['anoFabricacao', 'dimensoes', 'material', 'capacidade'],
    instalacao: ['anoFabricacao', 'dimensoes', 'material', 'capacidade', 'potencia', 'voltagem'],
    mobiliario: ['dimensoes', 'peso', 'material', 'cor'],
    utensilio: ['dimensoes', 'peso', 'material', 'cor', 'capacidade'],
    ferramenta: ['serieTecnica', 'peso', 'material', 'potencia', 'voltagem', 'dimensoes'],
    seguranca: ['serieTecnica', 'anoFabricacao', 'voltagem', 'potencia', 'dimensoes'],
    maquina: ['serieTecnica', 'anoFabricacao', 'capacidade', 'potencia', 'voltagem', 'frequencia', 'consumo', 'dimensoes', 'peso', 'material'],
    equipamento: ['serieTecnica', 'anoFabricacao', 'capacidade', 'potencia', 'voltagem', 'frequencia', 'consumo', 'dimensoes', 'peso', 'material'],
    industrial: ['serieTecnica', 'anoFabricacao', 'capacidade', 'potencia', 'voltagem', 'frequencia', 'consumo', 'dimensoes', 'peso', 'material'],
    cozinha: ['serieTecnica', 'anoFabricacao', 'capacidade', 'potencia', 'voltagem', 'frequencia', 'consumo', 'dimensoes', 'peso', 'material'],
    refrigeracao: ['serieTecnica', 'anoFabricacao', 'capacidade', 'potencia', 'voltagem', 'frequencia', 'consumo', 'dimensoes', 'peso'],
    eletrico: ['serieTecnica', 'anoFabricacao', 'potencia', 'voltagem', 'frequencia', 'consumo', 'dimensoes', 'peso'],
  };
  /** Chaves das características técnicas relevantes para a categoria; categoria desconhecida ou "Outros" mostra todas. */
  function camposTecnicos(categoria) {
    const extra = POR_CATEGORIA[categoria];
    if (!extra) return TECNICAS.map(([k]) => k);
    return TECNICAS.map(([k]) => k).filter((k) => BASE_TECNICA.includes(k) || extra.includes(k));
  }

  /* ---------- Utilidades ---------- */
  const txt = (v) => String(v == null ? '' : v).trim();
  const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const centavos = (n) => Math.round(Number(n) * 100);
  const dataValida = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return false;
    const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3];
  };
  const naLista = (lista, v) => lista.some(([id]) => id === v);
  const inteiroPositivo = (n) => Number.isInteger(n) && n >= 1;
  const dinheiroRuim = (n) => n != null && !(typeof n === 'number' && Number.isFinite(n) && n >= 0);
  const diasEntre = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);

  /* ---------- Totais ---------- */
  /** Total da linha de peça: quantidade × valor unitário, em centavos exatos (sem erro de ponto flutuante). */
  const totalPeca = (p) => (p && p.valor != null ? r2((centavos(p.valor) * (Number(p.quantidade) || 1)) / 100) : null);
  /** Indicadores: tipos de componentes (linhas) ≠ unidades físicas (soma das quantidades). Situação vazia vale como ativa. */
  function totaisComponentes(pecas) {
    const l = Array.isArray(pecas) ? pecas : [];
    const sit = (p) => p.situacao || 'ativo';
    return {
      tipos: l.length,
      unidades: l.reduce((s, p) => s + (inteiroPositivo(Number(p.quantidade)) ? Number(p.quantidade) : 1), 0),
      ativos: l.filter((p) => sit(p) === 'ativo').length,
      substituidos: l.filter((p) => sit(p) === 'substituido').length,
      valor: r2(l.reduce((s, p) => s + (totalPeca(p) || 0), 0)),
    };
  }
  /** Valor total de aquisição = aquisição + frete + instalação + custos adicionais − descontos (informativo; não lança nada). */
  function valorTotalAquisicao(f) {
    const x = f || {};
    return r2(((centavos(x.valorAquisicao || 0) + centavos(x.frete || 0) + centavos(x.instalacao || 0) + centavos(x.custosAdicionais || 0)) - centavos(x.descontos || 0)) / 100);
  }
  /** Prazo restante de garantia ou seguro: { dias, texto } ou null sem datas válidas. */
  function prazoRestante(inicio, fim, hoje) {
    if (!dataValida(fim) || !dataValida(hoje)) return null;
    if (inicio && dataValida(inicio) && hoje < inicio) return { dias: diasEntre(hoje, inicio), texto: 'Começa em ' + diasEntre(hoje, inicio) + ' dia(s)' };
    const d = diasEntre(hoje, fim);
    if (d < 0) return { dias: d, texto: 'Vencida há ' + Math.abs(d) + ' dia(s)' };
    if (d === 0) return { dias: 0, texto: 'Vence hoje' };
    return { dias: d, texto: 'Vence em ' + d + ' dia(s)' };
  }
  /** Próximo número de patrimônio livre (PAT-000001…), a partir dos já existentes: nunca repete. */
  function proximoNumero(bens, prefixo = 'PAT-') {
    const usados = new Set((bens || []).map((b) => txt(b.numeroPatrimonio)));
    let maior = 0;
    (bens || []).forEach((b) => { const m = new RegExp('^' + prefixo + '(\\d+)$').exec(txt(b.numeroPatrimonio)); if (m) maior = Math.max(maior, +m[1]); });
    let n = maior + 1; let s = prefixo + String(n).padStart(6, '0');
    while (usados.has(s)) { n++; s = prefixo + String(n).padStart(6, '0'); }
    return s;
  }

  /* ---------- Composição por outros bens ---------- */
  /** true se vincular `filhos` ao bem `id` criaria um ciclo (o bem se alcança por seus vinculados) ou vínculo consigo mesmo. */
  function criaCiclo(bens, id, filhos) {
    const por = new Map((bens || []).map((b) => [b.id, b]));
    const visto = new Set();
    const pilha = [...(filhos || [])];
    while (pilha.length) {
      const x = pilha.pop();
      if (x === id) return true;
      if (visto.has(x)) continue;
      visto.add(x);
      const b = por.get(x);
      if (b && Array.isArray(b.vinculados)) pilha.push(...b.vinculados);
    }
    return false;
  }
  /** Valor de um conjunto sem dupla contagem: o valor dos bens vinculados é só informativo; não entra no valor do bem. */
  const valorDoConjunto = (b) => (b && b.valor != null ? r2(b.valor) : 0);

  /* ---------- Normalização (formato salvo) ---------- */
  const lista = (v) => (Array.isArray(v) ? v : []);
  function normalizar(b) {
    const o = { ...b };
    const inteiro = (v) => (txt(v) === '' ? null : Number(v));
    const din = (v) => (v == null || txt(v) === '' ? null : r2(Number(v)));
    o.nomeTecnico = txt(o.nomeTecnico); o.descricao = txt(o.descricao); o.codigoInterno = txt(o.codigoInterno); o.observacoes = txt(o.observacoes);
    o.unidade = txt(o.unidade); o.quantidade = inteiro(o.quantidade);
    o.conjunto = Boolean(o.conjunto); o.composto = Boolean(o.composto);
    o.vinculados = [...new Set(lista(o.vinculados).filter(Boolean))];
    o.imagens = lista(o.imagens).map((i) => ({ id: i.id, name: txt(i.name), type: i.type || '', size: i.size || 0, tipo: i.tipo || '', principal: Boolean(i.principal) })).filter((i) => i.id);
    if (o.imagens.length && !o.imagens.some((i) => i.principal)) o.imagens[0].principal = true;
    if (o.imagens.filter((i) => i.principal).length > 1) { let achou = false; o.imagens.forEach((i) => { if (i.principal && achou) i.principal = false; else if (i.principal) achou = true; }); }
    o.documentos = lista(o.documentos).map((d) => ({ id: d.id, name: txt(d.name), type: d.type || '', size: d.size || 0, tipo: d.tipo || '', data: txt(d.data), descricao: txt(d.descricao) })).filter((d) => d.id);
    o.movimentacoes = lista(o.movimentacoes).map((m) => ({ id: m.id, tipo: m.tipo || '', data: txt(m.data), origem: txt(m.origem), destino: txt(m.destino), responsavel: txt(m.responsavel), motivo: txt(m.motivo), obs: txt(m.obs) }));
    o.manutencoes = lista(o.manutencoes).map((m) => ({ id: m.id, data: txt(m.data), tipo: m.tipo || '', descricao: txt(m.descricao), responsavel: txt(m.responsavel), pecas: txt(m.pecas), custo: din(m.custo),
      documento: m.documento && m.documento.id ? { id: m.documento.id, name: txt(m.documento.name), type: m.documento.type || '', size: m.documento.size || 0 } : null, proxima: txt(m.proxima), situacao: m.situacao || 'realizada' }));
    o.pecas = lista(o.pecas).map((p) => ({ ...p, codigo: txt(p.codigo), tipo: txt(p.tipo), serie: txt(p.serie), unidade: txt(p.unidade), quantidade: p.quantidade == null || txt(p.quantidade) === '' ? 1 : Number(p.quantidade),
      situacao: p.situacao || 'ativo', obs: txt(p.obs), substituidaPor: txt(p.substituidaPor) }));
    return o;
  }

  /* ---------- Validação por etapa ---------- */
  /**
   * Uma mensagem por etapa ('' = em ordem). Obrigatórios: nome simplificado e categoria; o resto depende do que for
   * preenchido (um imóvel não precisa de marca nem série). ctx = { bens, cnpjValid, hoje }.
   */
  function validar(b, { bens = [], cnpjValid = () => true, hoje = new Date().toISOString().slice(0, 10) } = {}) {
    const o = b;
    const etapa1 = () => {
      if (!txt(o.nome)) return 'Informe o nome simplificado.';
      if (!o.categoria) return 'Escolha a categoria.';
      const np = txt(o.numeroPatrimonio);
      if (np && bens.some((x) => x.id !== o.id && txt(x.numeroPatrimonio).toLowerCase() === np.toLowerCase())) return 'Já existe um bem com o número de patrimônio ' + np + '.';
      if (dinheiroRuim(o.valor)) return 'O valor do patrimônio não pode ser negativo.';
      if (o.quantidade != null && !inteiroPositivo(o.quantidade)) return 'A quantidade deve ser um número inteiro a partir de 1.';
      if (o.quantidade != null && !txt(o.unidade)) return 'Informe a unidade de medida da quantidade.';
      if (o.tipoBem && !naLista(TIPOS_BEM, o.tipoBem)) return 'Tipo de bem inválido.';
      if (o.natureza && !naLista(NATUREZAS, o.natureza)) return 'Natureza inválida.';
      if (o.situacaoPatrimonial && !naLista(SITUACOES, o.situacaoPatrimonial)) return 'Situação patrimonial inválida.';
      if (o.conservacao && !naLista(CONSERVACAO, o.conservacao)) return 'Estado de conservação inválido.';
      if (o.dataCadastro && !dataValida(o.dataCadastro)) return 'Data de cadastro inválida.';
      if (o.situacaoPatrimonial === 'baixado' && !(o.baixa && o.baixa.motivo && dataValida(o.baixa.data))) return 'Para marcar como baixado, registre a baixa patrimonial (motivo e data) na última etapa.';
      return '';
    };
    const etapa2 = () => {
      if (o.imagens.length > LIMITES.imagens) return 'No máximo ' + LIMITES.imagens + ' imagens por patrimônio.';
      for (const i of o.imagens) {
        if (i.tipo && !naLista(TIPOS_IMAGEM, i.tipo)) return 'Tipo de imagem inválido.';
        if (i.type && !TIPOS_ARQUIVO_IMAGEM.includes(i.type)) return 'A imagem ' + i.name + ' não está em um formato aceito (JPEG, PNG ou WebP).';
        if (i.size > LIMITES.tamanhoArquivo) return 'A imagem ' + i.name + ' passa de 10 MB.';
      }
      if (o.documentos.length > LIMITES.documentos) return 'No máximo ' + LIMITES.documentos + ' documentos por patrimônio.';
      for (const d of o.documentos) {
        if (d.tipo && !naLista(TIPOS_DOCUMENTO, d.tipo)) return 'Tipo de documento inválido.';
        if (d.type && !TIPOS_ARQUIVO_DOCUMENTO.includes(d.type)) return 'O documento ' + d.name + ' não está em um formato aceito (PDF, JPEG, PNG ou WebP).';
        if (d.size > LIMITES.tamanhoArquivo) return 'O documento ' + d.name + ' passa de 10 MB.';
        if (d.data && !dataValida(d.data)) return 'Data inválida no documento ' + d.name + '.';
      }
      return '';
    };
    const etapa3 = () => {
      const l = o.localizacao || {};
      if (txt(l.cnpj) && !cnpjValid(l.cnpj)) return 'O CNPJ da empresa proprietária é inválido.';
      const r = o.responsavel || {};
      if (r.tipo && !naLista(TIPOS_RESPONSABILIDADE, r.tipo)) return 'Tipo de responsabilidade inválido.';
      if (r.dataAtribuicao && !dataValida(r.dataAtribuicao)) return 'Data de atribuição do responsável inválida.';
      let anterior = '';
      for (const m of o.movimentacoes) {
        if (!naLista(TIPOS_MOVIMENTACAO, m.tipo)) return 'Escolha o tipo de cada movimentação.';
        if (!dataValida(m.data)) return 'Data inválida em uma movimentação.';
        if (m.data > hoje) return 'A data de uma movimentação não pode ser futura.';
        if (anterior && m.data < anterior) return 'As movimentações precisam estar em ordem cronológica.';
        anterior = m.data;
      }
      return '';
    };
    const etapa4 = () => {
      const t = o.tecnicas || {};
      if (t.anoFabricacao && !(Number.isInteger(Number(t.anoFabricacao)) && +t.anoFabricacao >= 1800 && +t.anoFabricacao <= +hoje.slice(0, 4) + 1)) return 'Ano de fabricação inválido.';
      const ids = new Set();
      for (const p of o.pecas) {
        if (!txt(p.nome)) return 'Informe o nome de cada peça (ou remova a linha).';
        if (!inteiroPositivo(p.quantidade)) return 'Na peça ' + p.nome + ', a quantidade deve ser um número inteiro a partir de 1.';
        if (p.quantidade > 1 && !txt(p.unidade)) return 'Na peça ' + p.nome + ', informe a unidade de medida.';
        if (!naLista(SITUACOES_PECA, p.situacao || 'ativo')) return 'Situação inválida na peça ' + p.nome + '.';
        if (txt(p.codigo)) { const k = p.codigo.toLowerCase(); if (ids.has(k)) return 'O código ' + p.codigo + ' está repetido nas peças.'; ids.add(k); }
      }
      if (o.composto && !o.vinculados.length) return ''; // composto sem vínculo ainda é permitido (pode vincular depois)
      for (const v of o.vinculados) {
        if (v === o.id) return 'Um patrimônio não pode ser vinculado a ele mesmo.';
        if (!bens.some((x) => x.id === v)) return 'Um patrimônio vinculado não existe mais.';
      }
      if (o.id && criaCiclo(bens, o.id, o.vinculados)) return 'Vínculo circular: um dos patrimônios vinculados já contém este.';
      return '';
    };
    const etapa5 = () => {
      const f = o.financeiro || {}; const c = o.contabil || {}; const g = o.garantia || {}; const s = o.seguro || {};
      if (f.tipoAquisicao && !naLista(TIPOS_AQUISICAO, f.tipoAquisicao)) return 'Tipo de aquisição inválido.';
      for (const [k, rot] of [['dataAquisicao', 'aquisição'], ['dataRecebimento', 'recebimento'], ['dataOperacao', 'entrada em operação']]) if (f[k] && !dataValida(f[k])) return 'Data de ' + rot + ' inválida.';
      if (f.dataAquisicao && f.dataRecebimento && f.dataRecebimento < f.dataAquisicao) return 'A data de recebimento não pode ser anterior à de aquisição.';
      if (f.dataRecebimento && f.dataOperacao && f.dataOperacao < f.dataRecebimento) return 'A entrada em operação não pode ser anterior ao recebimento.';
      for (const [k, rot] of [['valorAquisicao', 'valor de aquisição'], ['frete', 'frete'], ['instalacao', 'instalação'], ['custosAdicionais', 'custos adicionais'], ['descontos', 'descontos']]) if (dinheiroRuim(f[k])) return 'O ' + rot + ' não pode ser negativo.';
      if (valorTotalAquisicao(f) < 0) return 'Os descontos não podem passar da soma dos valores de aquisição.';
      if (c.metodo && !naLista(METODOS_DEPRECIACAO, c.metodo)) return 'Método de depreciação inválido.';
      if (dinheiroRuim(c.valorResidual)) return 'O valor residual não pode ser negativo.';
      if (dinheiroRuim(c.valorContabil)) return 'O valor contábil não pode ser negativo.';
      if (c.vidaUtilMeses != null && !inteiroPositivo(c.vidaUtilMeses)) return 'A vida útil estimada deve ser um número inteiro de meses, a partir de 1.';
      if (c.inicioDepreciacao && !dataValida(c.inicioDepreciacao)) return 'Data de início de depreciação inválida.';
      if (g.possui) {
        for (const [k, rot] of [['inicio', 'início'], ['fim', 'término']]) if (g[k] && !dataValida(g[k])) return 'Data de ' + rot + ' da garantia inválida.';
        if (g.inicio && g.fim && g.fim < g.inicio) return 'O término da garantia não pode ser anterior ao início.';
      }
      if (s.possui) {
        for (const [k, rot] of [['inicio', 'início'], ['fim', 'término']]) if (s[k] && !dataValida(s[k])) return 'Data de ' + rot + ' do seguro inválida.';
        if (s.inicio && s.fim && s.fim < s.inicio) return 'O término da cobertura do seguro não pode ser anterior ao início.';
        if (dinheiroRuim(s.valorSegurado)) return 'O valor segurado não pode ser negativo.';
      }
      return '';
    };
    const etapa6 = () => {
      const m = o.manutencao || {};
      if (m.tipo && !naLista(TIPOS_MANUTENCAO, m.tipo)) return 'Tipo de manutenção inválido.';
      if (dinheiroRuim(m.custoEstimado)) return 'O custo estimado de manutenção não pode ser negativo.';
      if (o.revisao && o.revisao.ultima && o.revisao.proxima && o.revisao.proxima < o.revisao.ultima) return 'A próxima manutenção não pode ser anterior à última.';
      for (const x of o.manutencoes) {
        if (!dataValida(x.data)) return 'Data inválida em uma manutenção do histórico.';
        if (!naLista(TIPOS_MANUTENCAO, x.tipo)) return 'Escolha o tipo de cada manutenção do histórico.';
        if (!txt(x.descricao)) return 'Descreva o serviço de cada manutenção do histórico.';
        if (dinheiroRuim(x.custo)) return 'O custo de uma manutenção não pode ser negativo.';
        if (x.proxima && !dataValida(x.proxima)) return 'Data da próxima manutenção inválida no histórico.';
        if (!naLista(SITUACOES_MANUTENCAO, x.situacao)) return 'Situação inválida em uma manutenção do histórico.';
      }
      const i = o.inspecao || {};
      if (i.resultado && !naLista(RESULTADOS_INSPECAO, i.resultado)) return 'Resultado de inspeção inválido.';
      for (const [k, rot] of [['ultima', 'última'], ['proxima', 'próxima']]) if (i[k] && !dataValida(i[k])) return 'Data da ' + rot + ' inspeção inválida.';
      if (i.ultima && i.proxima && i.proxima < i.ultima) return 'A próxima inspeção não pode ser anterior à última.';
      if (o.baixa) {
        if (!naLista(MOTIVOS_BAIXA, o.baixa.motivo)) return 'Motivo de baixa inválido.';
        if (!dataValida(o.baixa.data)) return 'Data da baixa inválida.';
      }
      return '';
    };
    return [etapa1(), etapa2(), etapa3(), etapa4(), etapa5(), etapa6()];
  }

  /* ---------- Histórico de alterações ---------- */
  const IGNORAR = new Set(['historico', 'atualizadoEm', 'criadoEm', 'id', 'baixasAnteriores']);
  /** Nomes dos campos que mudaram entre o salvo e o novo (comparação por conteúdo). */
  function mudancas(antes, depois) {
    const chaves = new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})]);
    return [...chaves].filter((k) => !IGNORAR.has(k) && JSON.stringify((antes || {})[k] ?? null) !== JSON.stringify((depois || {})[k] ?? null)).sort();
  }

  const etapas = () => ['Cadastro e identificação', 'Imagens e documentação', 'Localização e responsabilidade', 'Composição e características técnicas', 'Aquisição, financeiro e depreciação', 'Manutenção, controle e revisão'];

  return {
    CATEGORIAS_NOVAS, TIPOS_BEM, NATUREZAS, SITUACOES, CONSERVACAO, TIPOS_IMAGEM, TIPOS_DOCUMENTO, TIPOS_RESPONSABILIDADE, TIPOS_MOVIMENTACAO, TIPOS_AQUISICAO, METODOS_DEPRECIACAO,
    TIPOS_MANUTENCAO, SITUACOES_MANUTENCAO, SITUACOES_PECA, MOTIVOS_BAIXA, RESULTADOS_INSPECAO, TIPOS_ARQUIVO_IMAGEM, TIPOS_ARQUIVO_DOCUMENTO, LIMITES, TECNICAS,
    camposTecnicos, totalPeca, totaisComponentes, valorTotalAquisicao, prazoRestante, proximoNumero, criaCiclo, valorDoConjunto, normalizar, validar, mudancas, etapas, dataValida, r2,
  };
});
