/* Documentos de pagamento (esboço): DES - Folha de Pagamento Dia 05, Dia 20, Rescisão e Férias.
   Só consulta: lista por colaborador, visualização do documento, navegação entre documentos. Nada é editado, calculado,
   aprovado, assinado ou enviado. Os campos seguem as abas CONPLUS da planilha de referência (extrato "Relação de Cálculo").
   Os dados vêm de uma FONTE (CicluzFolhas.fonte): hoje os dados fictícios de folhas-conplus-demo.js; quando a API da
   Conplus existir basta chamar CicluzFolhas.usarFonte({listar, obter}) com as mesmas formas, sem mexer nas telas. */
(()=>{
'use strict';
const U=window.CicluzUniformUI;if(!U)return;
const {el,button}=U;
const GROUP='Cadastros Geral Colaboradores',ACCENT='var(--section-accent,#ef4444)';
const fmt=n=>n==null||n===''?'—':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const NATUREZA={1:'Provento',2:'Vantagem',3:'Desconto',4:'Informativo'};

/* ---------- Fonte de dados (trocável) ---------- */
const demoSource={
 async listar(tipo){const c=window.CicluzFolhasCsv;if(c?.has(tipo))return c.listar(tipo);const d=window.CicluzFolhasDemo;return d?structuredClone(d[tipo]||[]):[]},
 async obter(tipo,id){const c=window.CicluzFolhasCsv;if(c?.has(tipo))return c.obter(tipo,id);const d=window.CicluzFolhasDemo;const x=d?(d[tipo]||[]).find(y=>y.id===id):null;return x?structuredClone(x):null}};
let fonte=demoSource;

/* ---------- Definição das quatro telas (campos conforme as abas CONPLUS) ---------- */
const TIPOS={
 folha05:{titulo:'DES - Folha de Pagamento Dia 05',doc:'Folha de pagamento — dia 05',aba:'CONPLUS FOLHA DE PAGAMENTO 05',desc:'Folhas mensais por colaborador (modelo do dia 5)',
  periodo:d=>d.competencia,competencia:d=>d.competencia,nomeDe:d=>d.nome,cargoDe:d=>d.cargo},
 folha20:{titulo:'DES - Folha de Pagamento Dia 20',doc:'Adiantamento salarial — dia 20',aba:'CONPLUS FOLHA DE PAGAMENTO ADIANTAMENTO 20',desc:'Adiantamentos salariais por colaborador (modelo do dia 20)',
  periodo:d=>d.competencia,competencia:d=>d.competencia,nomeDe:d=>d.nome,cargoDe:d=>d.cargo},
 rescisao:{titulo:'DES - Rescisão',doc:'Rescisão calculada',aba:'CONPLUS FOLHA DE PAGAMENTO RESCISÃO (rescisões calculadas)',desc:'Documentos rescisórios para consulta',
  periodo:d=>'Demissão em '+d.dem,competencia:d=>d.competencia,nomeDe:d=>d.nome,cargoDe:d=>d.cargo},
 ferias:{titulo:'DES - Férias',doc:'Período aquisitivo de férias',aba:'CONPLUS FOLHA DE PAGAMENTO FÉRIAS (períodos aquisitivos abertos)',desc:'Períodos aquisitivos e documentos de férias',
  periodo:d=>d.periodoInicial+' a '+d.periodoFinal,competencia:d=>d.competencia,nomeDe:d=>d.nome,cargoDe:d=>d.cargo}};

/* ---------- Componentes ---------- */
const empresaDe=d=>d.empresa||(d.origem==='csv'?'—':window.CicluzFolhasDemo?.empresa?.nome||'—');
const dl=rows=>{const d=el('dl','profiles-info');for(const [k,v] of rows)d.append(el('dt',null,k),el('dd',null,v==null||v===''?'—':String(v)));return d};
function table(heads,numCols=[]){const t=el('table','uniforms-table'),hr=el('tr');heads.forEach((h,i)=>{const th=el('th',numCols.includes(i)?'uniforms-num':null,h);hr.append(th)});const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);return {w,tb}}
const row=(tb,cells,numCols=[])=>{const tr=el('tr');cells.forEach((c,i)=>tr.append(el('td',numCols.includes(i)?'uniforms-num':null,c==null||c===''?'—':String(c))));tb.append(tr)};
const pill=()=>el('span','pill p-yellow','Demonstrativo — não oficial');
const section=(title,...nodes)=>{const s=el('section','profiles-section folhas-section');s.append(el('h3',null,title),...nodes);return s};

/* Partes de cada documento (mesmos campos e ordem de sempre). A tela e o demonstrativo para impressão leem as mesmas partes. */
const totBox=(arr)=>arr.map(([k,v])=>[k,fmt(v)]);
function partsFolha(d){const b=d.bases||{},g=k=>b[k]||{};
 return [
  {title:'Identificação do colaborador',blocks:[{dl:[['Func (código do funcionário)',d.codigo],['Nome',d.nome],['Adm (data de admissão)',d.adm],['Dem (data de demissão)',d.dem],['Dep.IR (dependentes IR)',d.depIR],['Dedução IR',fmt(d.deducaoIR)],['Dep.SF (dependentes salário-família)',d.depSF],['Cargo',d.cargo],['C.H.M. (carga horária mensal)',d.chm],['Salário',fmt(d.salario)],['CBO',d.cbo],['Sind (sindicato)',d.sind],['FReg (forma de registro)',d.freg],['Situação',d.situacao],['Filial',d.filial],['CNPJ/CPF (documento da empresa)',d.cnpj],['Organograma',d.organograma]]}]},
  {title:'Eventos da folha',blocks:[{table:{heads:['Código — Evento','Natureza','Referência','Valor'],num:[3],rows:(d.eventos||[]).map(e=>[e.cod+' — '+e.nome,NATUREZA[e.nat]||e.nat,e.ref,fmt(e.valor)])}}]},
  {title:'Totais',blocks:[{totais:totBox([['Proventos',d.totais?.proventos],['Vantagens',d.totais?.vantagens],['Descontos',d.totais?.descontos],['Líquido',d.totais?.liquido]])}]},
  {title:'Base de impostos',blocks:[
   {table:{heads:['Base de impostos','Normal','13°','Férias','Lucro'],num:[1,2,3,4],rows:[['IRRF (imposto de renda retido na fonte)',g('irrf')],['INSS (Instituto Nacional do Seguro Social)',g('inss')],['INSS Empresa (cota patronal)',g('inssEmpresa')]].map(([n,x])=>[n,fmt(x.normal),fmt(x['13']),fmt(x.ferias),fmt(x.lucro)])}},
   {dl:[['Base Dif. Teto VA.',fmt(b.difTeto)]]},
   {table:{heads:['FGTS, GRRF e PIS','Base','Valor'],num:[1,2],rows:[['FGTS GFIP (guia do FGTS)',g('fgts')],['FGTS GRRF (guia rescisória)',g('grrf')],['PIS',g('pis')]].map(([n,x])=>[n,fmt(x.base),fmt(x.valor)])}}]},
  {title:'Dados adicionais',blocks:[{p:d.adicionais||'Nenhum dado adicional.'}]}]}
function partsRescisao(d){return [
 {title:'Identificação',blocks:[{dl:[['Código (funcionário)',d.codigo],['Nome',d.nome],['Cargo',d.cargo],['Empresa',d.empresa],['Causa da demissão',d.causa]]}]},
 {title:'Datas',blocks:[{dl:[['Adm (data de admissão)',d.adm],['Aviso prévio',d.avisoPrevio],['Dem (data de demissão)',d.dem],['Seq',d.seq]]}]},
 {title:'Valores do relatório da contabilidade',blocks:[{dl:[['Salário',fmt(d.salario)],['Saldo FGTS',fmt(d.saldoFgts)],['FGTS-GRRF',fmt(d.fgtsGrrf)]]},{totais:totBox([['Proventos',d.proventos],['Descontos',d.descontos],['Líquido',d.liquido]])}]}]}
function partsFerias(d){return [{title:'Período aquisitivo de férias',blocks:[{dl:[['Mês',d.mes],['Código',d.codigo],['Colaborador',d.nome],['Cargo',d.cargo],['Empresa',d.empresa],['Limite s/ dobra',d.limiteSemDobra],['Admissão',d.adm],['Período inicial',d.periodoInicial],['Período final',d.periodoFinal],['Faltas',d.faltas],['Afastamentos (Afast.)',d.afastamentos],['Saldo',d.saldo],['Pago',d.pago],['Tipo',d.tipo],['Quantidade (Qtd.)',d.qtd]]}]}]}
const PARTS={folha05:partsFolha,folha20:partsFolha,rescisao:partsRescisao,ferias:partsFerias};
/* Colunas do arquivo sem campo correspondente: ficam numa área de detalhes adicionais, sem mexer no layout principal. */
function parts(key,d){const out=PARTS[key](d);const ex=Object.entries(d.extras||{});if(ex.length)out.push({title:'Detalhes adicionais (colunas do arquivo sem campo correspondente)',blocks:[{dl:ex}]});return out}
function renderBlock(bl){if(bl.dl)return dl(bl.dl);if(bl.table){const {w,tb}=table(bl.table.heads,bl.table.num);for(const r of bl.table.rows)row(tb,r,bl.table.num);return w}if(bl.totais){const tot=el('div','folhas-totais');for(const [k,v] of bl.totais){const t=el('div','folhas-total');t.append(el('small',null,k),el('b',null,v));tot.append(t)}return tot}return el('p',null,bl.p)}
const VIEWERS=Object.fromEntries(Object.keys(PARTS).map(k=>[k,d=>{const box=el('div');for(const pt of parts(k,d))box.append(section(pt.title,...pt.blocks.map(renderBlock)));return box}]));

/* ---------- Telas ---------- */
const views={};
function makeScreen(key){const T=TIPOS[key];
 const view=el('section','view');view.id='folhas-'+key+'-view';view.style.setProperty('--menu-accent',ACCENT);
 const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','var(--section-text,#9c1c1c)');
 const head=el('div','head'),heading=el('div');heading.append(el('h2',null,T.titulo),el('p',null,menuCrumb(2,GROUP,T.titulo)));head.append(heading);
 const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
 let detail=false;addShortcuts(view.id,()=>{if(detail)list();else menuBack(2,GROUP)()});
 const noteDemo='Esboço de consulta com dados fictícios. Aqui só se visualiza: não há edição, cálculo, aprovação, assinatura ou envio. Os documentos oficiais virão da Conplus (referência: aba "'+T.aba+'" da planilha).';
 const noteCsv='Dados importados de arquivo CSV nesta sessão (ficam só na memória do navegador: ao recarregar a página, importe de novo). Aqui só se visualiza: nenhum valor é recalculado. Demonstrativo não oficial; não é documento emitido pela Conplus.';
 const note=el('div','form-note');
 let docs=[],comp='';
 async function list(){detail=false;body.replaceChildren(note);docs=await fonte.listar(key);note.textContent=window.CicluzFolhasCsv?.has(key)?noteCsv:noteDemo;{const tools=window.CicluzFolhasCsv?.toolbar(key,()=>list());if(tools)body.append(tools)}
  const f=el('div','form-fields uniforms-form'),cs=el('select');cs.setAttribute('aria-label','Competência');cs.add(new Option('Todas as competências',''));
  for(const c of [...new Set(docs.map(T.competencia))].sort((a,b)=>b.slice(3).localeCompare(a.slice(3))||b.localeCompare(a)))cs.add(new Option(c,c));cs.value=comp;
  const l2=el('label',null,'Competência');l2.append(cs);f.append(l2);
  const out=el('div');body.append(f,out);
  const draw=()=>{out.replaceChildren();const shown=docs.filter(d=>!comp||T.competencia(d)===comp);
   out.append(el('p','profiles-note',shown.length?shown.length+' documento(s) demonstrativo(s).':''));
   if(!shown.length){out.append(el('p','profiles-note folhas-empty',docs.length?'Nenhum documento para este filtro.':'Nenhum documento disponível. Quando a Conplus enviar os documentos, eles aparecem aqui.'));return}
   const {w,tb}=table(['Colaborador','Cargo','Empresa','Competência / período','Documento','Status','']);
   for(const d of shown){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions'),emp=empresaDe(d);st.append(pill());if(d.origem==='csv')st.append(el('span','pill '+(d.vinculo?.ok?'p-green':'p-red'),d.vinculo?.ok?'Vinculado':'Sem vínculo (conferir)'));
    const ver=button('Visualizar',()=>open(d.id),'btn');ver.setAttribute('aria-label','Visualizar documento de '+T.nomeDe(d));a.append(ver);
    tr.append(el('td',null,T.nomeDe(d)),el('td',null,T.cargoDe(d)),el('td',null,emp),el('td',null,T.periodo(d)),el('td',null,T.doc),st,a);tb.append(tr)}
   out.append(w)};
  cs.addEventListener('change',()=>{comp=cs.value;draw()});draw()}
 async function open(id){const d=await fonte.obter(key,id);if(!d){return}detail=true;body.replaceChildren();
  const shown=docs.filter(x=>!comp||T.competencia(x)===comp),i=shown.findIndex(x=>x.id===id);
  body.append(el('h3','uniforms-heading',T.doc+' — '+T.nomeDe(d)),el('p','profiles-note',T.periodo(d)+' · '+(empresaDe(d)==='—'?'':empresaDe(d))));
  const tag=el('p','people-alert folhas-demo-note');tag.append(pill(),document.createTextNode(d.origem==='csv'?' Dados importados de CSV nesta sessão (arquivo '+(d.arquivo||'sem nome')+'). Demonstrativo não oficial, não emitido pela Conplus; não deve ser usado para pagamento.':' Documento demonstrativo com dados fictícios. Não é um documento oficial e não deve ser usado para pagamento.'));body.append(tag);if(d.origem==='csv')body.append(el('p','profiles-note','Vínculo com o cadastro: '+(d.vinculo?.ok?'confirmado por '+d.vinculo.por+' ('+d.vinculo.nome+').':'sem correspondência confiável. O cadastro do colaborador não foi alterado; confira o registro.')));
  const nav=el('div','people-banner-tools');nav.append(button('Voltar para a lista',()=>list(),'btn'));
  const prev=button('Documento anterior',()=>open(shown[i-1].id)),next=button('Próximo documento',()=>open(shown[i+1].id));prev.disabled=i<=0;next.disabled=i<0||i>=shown.length-1;nav.append(prev,next,el('span','profiles-note',(i+1)+' de '+shown.length));{const db=window.CicluzFolhasCsv?.docButton(key,d,T);if(db)nav.append(db)}const foot=el('div','people-banner-tools');foot.append(button('Voltar para a lista',()=>list(),'btn'));body.append(nav,VIEWERS[key](d),foot)}
 return views[key]={view,list,title:T.titulo}}
for(const k of Object.keys(TIPOS))makeScreen(k);

function show(key){const v=views[key];if(!v)return;document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));v.view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,v.title);const t=document.getElementById('title');if(t)t.textContent=v.title;v.list();normalizeHeaderActions?.(v.view)}
window.showFolhaConplus=show;
window.CicluzFolhas={parts,TIPOS:Object.fromEntries(Object.entries(TIPOS).map(([k,t])=>[k,{titulo:t.titulo,desc:t.desc}])),usarFonte:f=>{if(f&&typeof f.listar==='function'&&typeof f.obter==='function')fonte=f},get fonte(){return fonte}};
})();
