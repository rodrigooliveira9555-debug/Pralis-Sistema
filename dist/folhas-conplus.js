/* Documentos de pagamento (esboço): DES - Folha de Pagamento Dia 05, Dia 20, Rescisão e Férias.
   Só consulta: lista por colaborador, visualização do documento, navegação entre documentos. Nada é editado, calculado,
   aprovado, assinado ou enviado. Os campos seguem as abas CONPLUS da planilha de referência (extrato "Relação de Cálculo").
   Os dados vêm de uma FONTE (CicluzFolhas.fonte): hoje os dados fictícios de folhas-conplus-demo.js; quando a API da
   Conplus existir basta chamar CicluzFolhas.usarFonte({listar, obter}) com as mesmas formas, sem mexer nas telas. */
(()=>{
'use strict';
const U=window.CicluzUniformUI;if(!U)return;
const {el,button}=U;
const GROUP='Cadastros Geral Colaboradores',ACCENT='#7c3aed';
const fmt=n=>n==null||n===''?'—':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const NATUREZA={1:'Provento',2:'Vantagem',3:'Desconto',4:'Informativo'};

/* ---------- Fonte de dados (trocável) ---------- */
const demoSource={
 async listar(tipo){const d=window.CicluzFolhasDemo;return d?structuredClone(d[tipo]||[]):[]},
 async obter(tipo,id){const d=window.CicluzFolhasDemo;const x=d?(d[tipo]||[]).find(y=>y.id===id):null;return x?structuredClone(x):null}};
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
const dl=rows=>{const d=el('dl','profiles-info');for(const [k,v] of rows)d.append(el('dt',null,k),el('dd',null,v==null||v===''?'—':String(v)));return d};
function table(heads,numCols=[]){const t=el('table','uniforms-table'),hr=el('tr');heads.forEach((h,i)=>{const th=el('th',numCols.includes(i)?'uniforms-num':null,h);hr.append(th)});const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);return {w,tb}}
const row=(tb,cells,numCols=[])=>{const tr=el('tr');cells.forEach((c,i)=>tr.append(el('td',numCols.includes(i)?'uniforms-num':null,c==null||c===''?'—':String(c))));tb.append(tr)};
const pill=()=>el('span','pill p-yellow','Demonstrativo — não oficial');
const section=(title,...nodes)=>{const s=el('section','profiles-section folhas-section');s.append(el('h3',null,title),...nodes);return s};

/* Visualização por tipo */
function viewFolha(d){const box=el('div');
 box.append(section('Identificação do colaborador',dl([['Func (código do funcionário)',d.codigo],['Nome',d.nome],['Adm (data de admissão)',d.adm],['Dem (data de demissão)',d.dem],['Dep.IR (dependentes IR)',d.depIR],['Dedução IR',fmt(d.deducaoIR)],['Dep.SF (dependentes salário-família)',d.depSF],['Cargo',d.cargo],['C.H.M. (carga horária mensal)',d.chm],['Salário',fmt(d.salario)],['CBO',d.cbo],['Sind (sindicato)',d.sind],['FReg (forma de registro)',d.freg],['Situação',d.situacao],['Filial',d.filial],['CNPJ/CPF (documento da empresa)',d.cnpj],['Organograma',d.organograma]])));
 const {w,tb}=table(['Código — Evento','Natureza','Referência','Valor'],[3]);for(const e of d.eventos)row(tb,[e.cod+' — '+e.nome,NATUREZA[e.nat]||e.nat,e.ref,fmt(e.valor)],[3]);
 box.append(section('Eventos da folha',w));
 const tot=el('div','folhas-totais');for(const [k,v] of [['Proventos',d.totais.proventos],['Vantagens',d.totais.vantagens],['Descontos',d.totais.descontos],['Líquido',d.totais.liquido]]){const t=el('div','folhas-total');t.append(el('small',null,k),el('b',null,fmt(v)));tot.append(t)}
 box.append(section('Totais',tot));
 const b=d.bases,bt=table(['Base de impostos','Normal','13°','Férias','Lucro'],[1,2,3,4]);
 for(const [n,x] of [['IRRF (imposto de renda retido na fonte)',b.irrf],['INSS (Instituto Nacional do Seguro Social)',b.inss],['INSS Empresa (cota patronal)',b.inssEmpresa]])row(bt.tb,[n,fmt(x.normal),fmt(x['13']),fmt(x.ferias),fmt(x.lucro)],[1,2,3,4]);
 const ft=table(['FGTS, GRRF e PIS','Base','Valor'],[1,2]);row(ft.tb,['FGTS GFIP (guia do FGTS)',fmt(b.fgts.base),fmt(b.fgts.valor)],[1,2]);row(ft.tb,['FGTS GRRF (guia rescisória)',fmt(b.grrf.base),fmt(b.grrf.valor)],[1,2]);row(ft.tb,['PIS',fmt(b.pis.base),fmt(b.pis.valor)],[1,2]);
 box.append(section('Base de impostos',bt.w,dl([['Base Dif. Teto VA.',fmt(b.difTeto)]]),ft.w),section('Dados adicionais',el('p',null,d.adicionais||'Nenhum dado adicional.')));return box}
function viewRescisao(d){const box=el('div');
 box.append(section('Identificação',dl([['Código (funcionário)',d.codigo],['Nome',d.nome],['Cargo',d.cargo],['Empresa',d.empresa],['Causa da demissão',d.causa]])),
  section('Datas',dl([['Adm (data de admissão)',d.adm],['Aviso prévio',d.avisoPrevio],['Dem (data de demissão)',d.dem],['Seq',d.seq]])));
 const tot=el('div','folhas-totais');for(const [k,v] of [['Proventos',d.proventos],['Descontos',d.descontos],['Líquido',d.liquido]]){const t=el('div','folhas-total');t.append(el('small',null,k),el('b',null,fmt(v)));tot.append(t)}
 box.append(section('Valores do relatório da contabilidade',dl([['Salário',fmt(d.salario)],['Saldo FGTS',fmt(d.saldoFgts)],['FGTS-GRRF',fmt(d.fgtsGrrf)]]),tot));return box}
function viewFerias(d){return section('Período aquisitivo de férias',dl([['Mês',d.mes],['Código',d.codigo],['Colaborador',d.nome],['Cargo',d.cargo],['Empresa',d.empresa],['Limite s/ dobra',d.limiteSemDobra],['Admissão',d.adm],['Período inicial',d.periodoInicial],['Período final',d.periodoFinal],['Faltas',d.faltas],['Afastamentos (Afast.)',d.afastamentos],['Saldo',d.saldo],['Pago',d.pago],['Tipo',d.tipo],['Quantidade (Qtd.)',d.qtd]]))}
const VIEWERS={folha05:viewFolha,folha20:viewFolha,rescisao:viewRescisao,ferias:viewFerias};

/* ---------- Telas ---------- */
const views={};
function makeScreen(key){const T=TIPOS[key];
 const view=el('section','view');view.id='folhas-'+key+'-view';view.style.setProperty('--menu-accent',ACCENT);
 const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
 const head=el('div','head'),heading=el('div');heading.append(el('h2',null,T.titulo),el('p',null,menuCrumb(2,GROUP,T.titulo)));head.append(heading);
 const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
 let detail=false;addShortcuts(view.id,()=>{if(detail)list();else menuBack(2,GROUP)()});
 const note=el('div','form-note','Esboço de consulta com dados fictícios. Aqui só se visualiza: não há edição, cálculo, aprovação, assinatura ou envio. Os documentos oficiais virão da Conplus (referência: aba "'+T.aba+'" da planilha).');
 let docs=[],comp='';
 async function list(){detail=false;body.replaceChildren(note);docs=await fonte.listar(key);
  const f=el('div','form-fields uniforms-form'),cs=el('select');cs.setAttribute('aria-label','Competência');cs.add(new Option('Todas as competências',''));
  for(const c of [...new Set(docs.map(T.competencia))].sort((a,b)=>b.slice(3).localeCompare(a.slice(3))||b.localeCompare(a)))cs.add(new Option(c,c));cs.value=comp;
  const l2=el('label',null,'Competência');l2.append(cs);f.append(l2);
  const out=el('div');body.append(f,out);
  const draw=()=>{out.replaceChildren();const shown=docs.filter(d=>!comp||T.competencia(d)===comp);
   out.append(el('p','profiles-note',shown.length?shown.length+' documento(s) demonstrativo(s).':''));
   if(!shown.length){out.append(el('p','profiles-note folhas-empty',docs.length?'Nenhum documento para este filtro.':'Nenhum documento disponível. Quando a Conplus enviar os documentos, eles aparecem aqui.'));return}
   const {w,tb}=table(['Colaborador','Cargo','Empresa','Competência / período','Documento','Status','']);
   for(const d of shown){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions'),emp=d.empresa||window.CicluzFolhasDemo?.empresa?.nome||'—';st.append(pill());
    const ver=button('Visualizar',()=>open(d.id),'btn');ver.setAttribute('aria-label','Visualizar documento de '+T.nomeDe(d));a.append(ver);
    tr.append(el('td',null,T.nomeDe(d)),el('td',null,T.cargoDe(d)),el('td',null,emp),el('td',null,T.periodo(d)),el('td',null,T.doc),st,a);tb.append(tr)}
   out.append(w)};
  cs.addEventListener('change',()=>{comp=cs.value;draw()});draw()}
 async function open(id){const d=await fonte.obter(key,id);if(!d){return}detail=true;body.replaceChildren();
  const shown=docs.filter(x=>!comp||T.competencia(x)===comp),i=shown.findIndex(x=>x.id===id);
  body.append(el('h3','uniforms-heading',T.doc+' — '+T.nomeDe(d)),el('p','profiles-note',T.periodo(d)+' · '+(d.empresa||window.CicluzFolhasDemo?.empresa?.nome||'')));
  const tag=el('p','people-alert folhas-demo-note');tag.append(pill(),document.createTextNode(' Documento demonstrativo com dados fictícios. Não é um documento oficial e não deve ser usado para pagamento.'));body.append(tag);
  const nav=el('div','people-banner-tools');nav.append(button('Voltar para a lista',()=>list(),'btn'));
  const prev=button('Documento anterior',()=>open(shown[i-1].id)),next=button('Próximo documento',()=>open(shown[i+1].id));prev.disabled=i<=0;next.disabled=i<0||i>=shown.length-1;nav.append(prev,next,el('span','profiles-note',(i+1)+' de '+shown.length));const foot=el('div','people-banner-tools');foot.append(button('Voltar para a lista',()=>list(),'btn'));body.append(nav,VIEWERS[key](d),foot)}
 return views[key]={view,list,title:T.titulo}}
for(const k of Object.keys(TIPOS))makeScreen(k);

function show(key){const v=views[key];if(!v)return;document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));v.view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,v.title);const t=document.getElementById('title');if(t)t.textContent=v.title;v.list();normalizeHeaderActions?.(v.view)}
window.showFolhaConplus=show;
window.CicluzFolhas={TIPOS:Object.fromEntries(Object.entries(TIPOS).map(([k,t])=>[k,{titulo:t.titulo,desc:t.desc}])),usarFonte:f=>{if(f&&typeof f.listar==='function'&&typeof f.obter==='function')fonte=f},get fonte(){return fonte}};
})();
