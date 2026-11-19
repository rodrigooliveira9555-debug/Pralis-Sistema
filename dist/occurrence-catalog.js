/* DES - Tipos de Ocorrência — cadastro único: tipo de ocorrência + categoria + subcategoria + tipo de documento + status,
   com as configurações disciplinares (gravidade, consulta do histórico, reincidências, revisão do DP e jurídica) dentro do próprio
   cadastro, numa seção recolhível. O cadastro alimenta o Lançamento de Ocorrências (tipo → categorias → subcategorias → documento).
   Os tipos continuam fixos em occurrences.js porque definem os campos do formulário. Categorias e subcategorias são listas do DP
   (CicluzMatrix guarda só os nomes). O documento é escolhido entre os modelos que já existem em Documentações: nada é duplicado.
   Nada aqui inventa prazo, categoria ou penalidade e nada é aplicado automaticamente: as regras só geram alerta para conferência.
   `cicluz-ocorrencias-catalogo-v1`: cada linha é um cadastro (id, type, name = categoria, subcategory, catId/subId, docCatId, config, active). */
(()=>{
'use strict';
const U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!U||!DB)return;
const {el,button,iconButton,ICON,fold,newId,dialog,confirmDialog}=U;
const KEY='cicluz-ocorrencias-catalogo-v1',ACCENT='var(--section-accent,#ef4444)',TITLE='DES - Tipos de Ocorrência',GROUP='Cadastros Geral Colaboradores';
const SEVERITY=['Leve','Moderado','Grave'];
const types=()=>window.CicluzOccurrences?.types||[];
const MX=()=>window.CicluzMatrix;

let data={version:1,categories:[],rules:[],suspensionDays:[],disc:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.categories)||!Array.isArray(s.rules))throw Error('format');s.suspensionDays=Array.isArray(s.suspensionDays)?s.suspensionDays:[];s.disc=Array.isArray(s.disc)?s.disc:[];data=s}loadError=false}catch{loadError=true}link();seed()}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
const now=()=>new Date().toISOString();
/* Cadastros antigos (só com nome e subcategoria em texto) ganham o vínculo com as listas de categoria e subcategoria, uma vez (campos novos, nada é apagado). */
function link(){if(loadError||data.linked||!MX())return;const M=MX();let changed=false;
 for(const c of data.categories){if(c.catId&&(c.subId||!c.subcategory))continue;const cid=M.addCategory(c.name);if(!cid)continue;c.catId=cid;if(c.subcategory){const sid=M.addSub(cid,c.subcategory);if(sid)c.subId=sid}changed=true}
 data.linked=true;try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}void changed}
/* Carga inicial (uma vez, flag `seeded`): as categorias e subcategorias iniciais para Advertência, Suspensão e Justa causa, mais as duas faltas.
   Documento 'sem documento associado' e configurações vazias: nada é inventado, o DP ajusta cada cadastro. */
function seed(){if(loadError||data.seeded||!MX())return;const M=MX();M.load?.();const cats=M.activeCats();if(!cats.length)return;
 const have=new Set(data.categories.map(c=>c.type+'|'+c.catId+'|'+c.subId)),at=new Date().toISOString();
 const add=(type,c,sub)=>{const k=type+'|'+c.id+'|'+sub.id;if(have.has(k))return;have.add(k);data.categories.push({id:newId(),type,name:c.name,subcategory:sub.name,catId:c.id,subId:sub.id,docCatId:'none',active:true,config:{severity:'',lookbackDays:null,alertRecurrences:null,needsDP:false,needsLegal:false,guidance:''},model:null,createdAt:at,history:[],initial:true})};
 for(const type of ['ADVERTÊNCIA','SUSPENSÃO','JUSTA CAUSA'])for(const c of cats)for(const sub of c.subs.filter(x=>x.active))add(type,c,sub);
 const c1=cats.find(c=>fold(c.name)===fold('Cumprimento de Horários e Disciplina'));if(c1)for(const [type,name] of [['FALTA INJUSTIFICADA','Falta injustificada'],['FALTA JUSTIFICADA','Falta justificada']]){const sub=c1.subs.find(x=>fold(x.name)===fold(name));if(sub)add(type,c1,sub)}
 data.seeded=true;try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
load();
const catById=id=>data.categories.find(c=>c.id===id);
const catsOf=(type,all)=>data.categories.filter(c=>c.type===type&&(all||c.active)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||(a.subcategory||'').localeCompare(b.subcategory||'','pt-BR'));
const catText=c=>c?c.name+(c.subcategory?' · '+c.subcategory:''):'—';
const docs=()=>window.CicluzDocuments?.CATS||[];
const docName=c=>{if(!c)return '';if(c.docCatId==='none')return 'Sem documento associado';if(c.docCatId)return docs().find(d=>d.id===c.docCatId)?.name||'Documento não encontrado';return c.model?'Modelo enviado: '+c.model.name:''};
/* Documento associado: modelo em Documentações (quando a empresa já enviou o PDF) ou o modelo antigo enviado nesta tela. */
function docInfo(c){const D=window.CicluzDocuments;if(!c)return null;if(c.docCatId&&c.docCatId!=='none'){const m=D?.MODELS?.[c.docCatId];return {name:docName(c),url:m?new URL('modelos/'+m.pdf,document.baseURI).href:null,note:m?'':'Sem modelo da empresa em Documentações: anexe o documento assinado.'}}
 if(c.model)return {name:'Modelo enviado: '+c.model.name,legacy:c.model,url:null,note:''};return null}

/* Previous warnings for a suspension: one line per active rule of the category, with what was found. */
function ruleCheck(records,personId,categoryId,dateIso){load();const out=[];if(!personId||!categoryId||!dateIso)return out;
 for(const r of data.rules.filter(x=>x.active&&x.suspensionCategoryId===categoryId)){const w=catById(r.warningCategoryId);
  if(!Number.isInteger(r.periodDays)||r.periodDays<1){out.push({rule:r,warning:w,configured:false,found:[]});continue}
  const from=new Date(Date.parse(dateIso+'T12:00:00')-r.periodDays*864e5).toISOString().slice(0,10);
  const found=records.filter(x=>x.collaboratorId===personId&&x.type==='ADVERTÊNCIA'&&!/^Cancelad/.test(x.status)&&x.categoryId===r.warningCategoryId&&x.date>=from&&x.date<=dateIso).sort((a,b)=>b.date.localeCompare(a.date));
  out.push({rule:r,warning:w,configured:true,from,found})}return out}
/* Regras disciplinares configuráveis: contam advertências/suspensões do colaborador na mesma categoria/subcategoria dentro do período. Só geram ALERTA para análise humana; nada é aplicado. */
const discMatch=(r,catId)=>r.active&&r.catId===catId;
const discOf=c=>c?data.disc.find(r=>r.catId===c.catId&&r.active)||data.disc.find(r=>r.catId===c.catId)||null:null;
function discCheck(records,personId,row,type,dateIso,excludeId){load();const out=[];if(!personId||!row||!row.catId||!dateIso)return out;
 for(const r of data.disc.filter(x=>discMatch(x,row.catId))){const from=r.lookbackDays?new Date(Date.parse(dateIso+'T12:00:00')-r.lookbackDays*864e5).toISOString().slice(0,10):'0000-01-01';
  /* só o mesmo colaborador, a mesma categoria e o período configurado; categorias diferentes nunca se somam */
  const mine=records.filter(x=>x.id!==excludeId&&x.collaboratorId===personId&&!/^Cancelad/.test(x.status||'')&&x.date>=from&&x.date<=dateIso&&x.classification?.catId===r.catId);
  const adv=mine.filter(x=>x.type==='ADVERTÊNCIA').length+(type==='ADVERTÊNCIA'?1:0),susp=mine.filter(x=>x.type==='SUSPENSÃO').length+(type==='SUSPENSÃO'?1:0);
  out.push({rule:r,from,adv,susp,suspAlert:!!r.warnCount&&adv>=r.warnCount,justaAlert:!!r.suspCount&&susp>=r.suspCount})}return out}
const ruleOf=id=>data.rules.find(r=>r.active&&r.suspensionCategoryId===id)||null;

/* ---------- Tela ---------- */
const view=el('section','view');view.id='occurrence-catalog-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','var(--section-text,#9c1c1c)');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,GROUP)());
/* Tela inicial enxuta (18/11/2026, Rodrigo): uma nota curta, como nas outras listas, e sem o filtro por tipo — as colunas da lista e a busca do rodapé fazem esse papel. */
body.append(el('p','profiles-note','Cada linha liga um tipo de ocorrência a uma categoria, uma subcategoria e um documento. Nada é aplicado automaticamente.'));
const warn=el('p','people-alert');warn.hidden=true;body.append(warn);
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const pill=a=>el('span','pill '+(a?'p-green':'p-red'),a?'Ativo':'Inativo');
function table(heads){const t=el('table','uniforms-table'),hr=el('tr');for(const h of heads)hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);return {w,tb}}

/* Parte superior: tabela */
const tableBox=el('div'),flash=el('p','profiles-note');flash.setAttribute('role','status');
/* Cadastro de Regras Disciplinares (alerta para análise humana; não aplica suspensão nem justa causa) */
body.append(flash,tableBox);
const discBox=el('div'),discFlash=el('p','profiles-note');discFlash.setAttribute('role','status');
/* Cadastro de Regras Disciplinares: painel recolhido por padrão, abaixo da tabela; abre e fecha na vertical */
const rulesPanel=el('section','rules-panel'),rulesToggle=el('button','tree-toggle rules-toggle'),rulesBody=el('div','rules-panel-body'),rulesInner=el('div','rules-panel-inner');
rulesToggle.type='button';rulesToggle.id='rules-toggle';rulesBody.id='rules-body';rulesToggle.setAttribute('aria-controls','rules-body');rulesToggle.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const rulesTitle=el('span','tree-name','Regras Disciplinares');rulesToggle.append(rulesTitle);
function setRules(on){rulesToggle.setAttribute('aria-expanded',String(on));rulesPanel.classList.toggle('is-open',on);rulesInner.inert=!on}
rulesToggle.onclick=()=>setRules(rulesToggle.getAttribute('aria-expanded')!=='true');setRules(false);
rulesInner.append(el('p','profiles-note','Valores configuráveis pela empresa: servem para o sistema avisar o DP de que vale analisar uma medida mais séria. A suspensão ou a justa causa nunca são aplicadas automaticamente: a decisão é humana, conforme as normas aplicáveis.'),discFlash,discBox);rulesBody.append(rulesInner);rulesPanel.append(rulesToggle,rulesBody);body.append(rulesPanel);

/* Parte inferior: formulário */
const form=el('form','form-fields uniforms-form');form.noValidate=true;form.hidden=true;form.dataset.quadro='Dados do tipo de ocorrência';const formTitle=el('h3','uniforms-wide uniforms-heading','Novo cadastro');formTitle.hidden=true; /* o título vai no cabeçalho da janela; o quadro leva o nome fixo na moldura */
const fType=el('select'),fCat=el('select'),fCatNew=el('input'),fSub=el('select'),fSubNew=el('input'),fDoc=el('select'),fActive=el('select');
fCatNew.maxLength=80;fSubNew.maxLength=80;fActive.add(new Option('Ativo','1'));fActive.add(new Option('Inativo','0'));
const catNewLbl=lbl('Nome da nova categoria *',fCatNew),subNewLbl=lbl('Nome da nova subcategoria *',fSubNew);catNewLbl.hidden=subNewLbl.hidden=true;
/* Configurações adicionais (matriz disciplinar dentro do cadastro) */
const more=el('details','uniforms-wide occurrence-more');more.append(el('summary',null,'Configurações adicionais'));
const mSev=el('select'),mLook=el('input'),mRec=el('input'),mDP=el('input'),mLegal=el('input'),mGuide=el('textarea'),mWarn=el('select'),mWarnDays=el('input');
mSev.add(new Option('Não definido',''));for(const s of SEVERITY)mSev.add(new Option(s,s));for(const i of [mLook,mRec,mWarnDays]){i.type='number';i.min='1';i.step='1';i.inputMode='numeric';i.placeholder='Definido pela empresa'}mDP.type=mLegal.type='checkbox';mGuide.rows=2;mGuide.maxLength=300;mGuide.addEventListener('focusout',e=>e.stopPropagation());
const chk=(text,box)=>{box.setAttribute('aria-label',text);const l=el('label','jornada-check');l.append(box,el('span',null,text));return l};
const warnBox=el('div','uniforms-wide');warnBox.append(el('h4',null,'Conferência de advertências anteriores (suspensão)'),el('p','profiles-note','Ao lançar esta suspensão, a tela procura advertências do colaborador na categoria escolhida dentro do período e mostra um alerta para conferência do DP. Não impede o lançamento nem aplica a suspensão. O período deve vir da orientação da empresa/jurídico.'),lbl('Advertência anterior a conferir',mWarn),lbl('Período de referência (dias)',mWarnDays));
const moreBody=el('div','form-fields');moreBody.append(lbl('Nível de gravidade',mSev),lbl('Período de consulta do histórico (dias)',mLook),lbl('Quantidade de reincidências para alerta',mRec),chk('Exige revisão pelo DP',mDP),chk('Exige revisão jurídica',mLegal),lbl('Orientação recomendada',mGuide,'uniforms-wide'),warnBox,el('p','uniforms-wide profiles-note','Classificação administrativa: leve, moderado e grave não autorizam penalidade automática e nada aqui define prazo jurídico.'));more.append(moreBody);
const fe=el('p','uniforms-wide profiles-error'),fs=el('p','uniforms-wide profiles-note');fe.setAttribute('role','alert');fs.setAttribute('role','status');
const act=el('div','uniforms-wide actions'),save=el('button','btn','Salvar');save.type='submit';let editing=null;act.append(button('Cancelar',()=>closeForm(),'btn ghost'),save); /* padrão: Cancelar · Salvar por extenso, à direita, fora do quadro */
/* Situação no interruptor padrão (no lugar do seletor Ativo/Inativo). O seletor fActive continua guardando o valor; o interruptor só o mostra e altera. */
const statusSlot=el('div','uniforms-wide');let sitBox=null;
/* Campo obrigatório vazio (18/11/2026, Rodrigo): o mesmo aviso do cadastro de cliente — a borda do campo na cor do cabeçalho e a mensagem embaixo (CicluzComprasUI.sinalizarObrigatorios). Para isso os rótulos ganham o formato dos cadastros novos (.compras-campo > .compras-rotulo), uma vez só. */
let camposPadronizados=false;function padronizarCampos(){if(camposPadronizados)return;camposPadronizados=true;for(const l of form.querySelectorAll(':scope>label')){const t=[...l.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());if(!t)continue;const r=el('span','compras-rotulo',t.textContent.trim());t.replaceWith(r);l.classList.add('compras-campo')}}
function pintarSituacao(){const cu=window.CicluzComprasUI;if(!cu){statusSlot.replaceChildren(lbl('Status *',fActive));return}sitBox=cu.quadroSituacao('Situação do cadastro',fActive.value==='1',{dica:'Cadastro inativo continua guardado.',aoMudar:()=>{fActive.value=sitBox.ativo?'1':'0'}});statusSlot.replaceChildren(sitBox)}
form.append(formTitle,lbl('Tipo de ocorrência *',fType),lbl('Nome da categoria *',fCat),catNewLbl,lbl('Subcategoria *',fSub),subNewLbl,lbl('Tipo de documento *',fDoc),statusSlot,more,fe,fs,act);
body.append(form);
const dayBox=el('details','uniforms-wide occurrence-more'),dayIn=el('input'),dm=el('p','profiles-note');dm.setAttribute('role','status');dayIn.placeholder='Ex.: 1, 2, 3 (em branco = sem restrição)';
dayBox.append(el('summary',null,'Dias de suspensão permitidos'),lbl('Quantidades permitidas',dayIn,'uniforms-wide'),el('p','profiles-note','Opcional. Quando preenchido, o lançamento mostra atalhos com essas quantidades; o valor continua editável.'),button('Salvar dias permitidos',saveDays,'btn'),dm);body.append(dayBox);

/* listas dependentes */
const NEW='__new__';
function fillTypeSel(cur){fType.replaceChildren(new Option('Selecione o tipo',''));for(const t of types())fType.add(new Option(t,t));fType.value=cur||''}
function fillCatSel(cur){const list=MX()?.activeCats()||[],own=cur&&!list.some(c=>c.id===cur)&&MX()?.catById(cur);fCat.replaceChildren(new Option('Selecione a categoria',''));for(const c of [...list,...(own?[own]:[])])fCat.add(new Option(c.name+(c.active?'':' (inativa)'),c.id));fCat.add(new Option('+ Cadastrar nova categoria',NEW));fCat.value=[...fCat.options].some(o=>o.value===cur)?cur:'';catNewLbl.hidden=fCat.value!==NEW;fillSubSel('')}
function fillSubSel(cur){const c=MX()?.catById(fCat.value);fSub.replaceChildren(new Option(c?'Selecione a subcategoria':fCat.value===NEW?'Cadastre a subcategoria abaixo':'Escolha a categoria primeiro',''));
 if(c){const own=cur&&!c.subs.some(s=>s.id===cur&&s.active)&&c.subs.find(s=>s.id===cur);for(const s of [...c.subs.filter(x=>x.active),...(own?[own]:[])])fSub.add(new Option(s.name+(s.active?'':' (inativa)'),s.id))}
 if(c||fCat.value===NEW)fSub.add(new Option('+ Cadastrar nova subcategoria',NEW));fSub.value=[...fSub.options].some(o=>o.value===cur)?cur:(fCat.value===NEW?NEW:'');subNewLbl.hidden=fSub.value!==NEW}
function fillDocSel(cur,legacy){fDoc.replaceChildren(new Option('Selecione o documento',''));for(const d of docs())fDoc.add(new Option(d.name,d.id));if(legacy)fDoc.add(new Option('Modelo enviado antes: '+legacy.name,'legacy'));fDoc.add(new Option('Sem documento associado (anexar o assinado)','none'));fDoc.value=[...fDoc.options].some(o=>o.value===cur)?cur:''}
function fillWarnSel(cur){mWarn.replaceChildren(new Option('Não conferir',''));for(const c of catsOf('ADVERTÊNCIA',true).filter(x=>x.id!==editing))mWarn.add(new Option(catText(c)+(c.active?'':' (inativo)'),c.id));mWarn.value=[...mWarn.options].some(o=>o.value===cur)?cur:''}
const paintMore=()=>{warnBox.hidden=fType.value!=='SUSPENSÃO'};
fCat.addEventListener('change',()=>{catNewLbl.hidden=fCat.value!==NEW;fillSubSel('')});fSub.addEventListener('change',()=>{subNewLbl.hidden=fSub.value!==NEW});fType.addEventListener('change',()=>{paintMore();fillWarnSel('')});

function openForm(c){editing=c?c.id:null;load();fillTypeSel(c?.type);fillCatSel(c?.catId);fillSubSel(c?.subId);fillDocSel(c?(c.docCatId||(c.model?'legacy':'')):'',c?.model);padronizarCampos();fActive.value=c?(c.active?'1':'0'):'1';pintarSituacao();fCatNew.value=fSubNew.value='';
 const cf=c?.config||{};mSev.value=cf.severity||'';mLook.value=cf.lookbackDays||'';mRec.value=cf.alertRecurrences||'';mDP.checked=!!cf.needsDP;mLegal.checked=!!cf.needsLegal;mGuide.value=cf.guidance||'';
 const r=c?ruleOf(c.id):null;fillWarnSel(r?.warningCategoryId||'');mWarnDays.value=r?.periodDays||'';paintMore();more.open=!!(c&&(cf.severity||cf.lookbackDays||cf.alertRecurrences||cf.needsDP||cf.needsLegal||r));
 formTitle.textContent=c?'Editar cadastro: '+catText(c):'Novo cadastro';save.textContent='Salvar';fe.textContent=fs.textContent='';form.hidden=false;{const want=more.open;U.openEditor(form,formTitle.textContent,closeForm);more.open=want}}
function closeForm(){U.closeEditor(form);editing=null;form.hidden=true;fe.textContent=fs.textContent=''}

form.onsubmit=e=>{e.preventDefault();fe.textContent=fs.textContent='';load();const M=MX(),errs=[],type=fType.value;
 if(!type)errs.push('Selecione o tipo de ocorrência.');if(!fCat.value)errs.push('Selecione ou cadastre a categoria.');if(fCat.value===NEW&&!fCatNew.value.trim())errs.push('Informe o nome da nova categoria.');
 if(!fSub.value)errs.push('Selecione ou cadastre a subcategoria.');if(fSub.value===NEW&&!fSubNew.value.trim())errs.push('Informe o nome da nova subcategoria.');if(!fDoc.value)errs.push('Selecione o tipo de documento (ou "Sem documento associado").');
 const look=mLook.value===''?null:Number(mLook.value),recur=mRec.value===''?null:Number(mRec.value),wd=mWarnDays.value===''?null:Number(mWarnDays.value);
 if([look,recur,wd].some(x=>x!==null&&!(Number.isInteger(x)&&x>=1)))errs.push('Nas configurações adicionais, use números inteiros a partir de 1.');if(type==='SUSPENSÃO'&&!!mWarn.value!==(wd!==null))errs.push('Para conferir advertências anteriores, informe a categoria e o período juntos.');
 if(errs.length){fe.textContent=errs[0];window.CicluzComprasUI?.sinalizarObrigatorios(form);return}
 const catId=fCat.value===NEW?M.addCategory(fCatNew.value):fCat.value;if(!catId){fe.textContent='Não foi possível cadastrar a categoria.';return}
 const subId=fSub.value===NEW?M.addSub(catId,fSubNew.value):fSub.value;if(!subId){fe.textContent='Não foi possível cadastrar a subcategoria.';return}
 const cat=M.catById(catId),sub=M.subById(catId,subId);load();
 if(data.categories.some(c=>c.id!==editing&&c.type===type&&c.catId===catId&&c.subId===subId)){fe.textContent='Já existe um cadastro de '+type+' para esta categoria e subcategoria. Edite o existente.';return}
 const rec={type,name:cat.name,subcategory:sub.name,catId,subId,docCatId:fDoc.value==='legacy'?'':fDoc.value,active:fActive.value==='1',config:{severity:mSev.value,lookbackDays:look,alertRecurrences:recur,needsDP:mDP.checked,needsLegal:mLegal.checked,guidance:mGuide.value.trim()}};
 let savedId=editing;
 const ok=transact(d=>{let row;if(editing){row=d.categories.find(x=>x.id===editing);(row.history=row.history||[]).push({at:now(),before:{type:row.type,name:row.name,subcategory:row.subcategory,docCatId:row.docCatId||'',active:row.active,config:row.config||null}});Object.assign(row,rec,{updatedAt:now()})}else{row={id:newId(),...rec,model:null,createdAt:now(),history:[]};d.categories.push(row);savedId=row.id}
  const old=d.rules.find(r=>r.active&&r.suspensionCategoryId===row.id);
  if(type==='SUSPENSÃO'&&mWarn.value){if(old){if(old.warningCategoryId!==mWarn.value||old.periodDays!==wd){old.active=false;old.updatedAt=now();d.rules.push({id:newId(),suspensionCategoryId:row.id,warningCategoryId:mWarn.value,periodDays:wd,note:'',active:true,createdAt:now()})}}else d.rules.push({id:newId(),suspensionCategoryId:row.id,warningCategoryId:mWarn.value,periodDays:wd,note:'',active:true,createdAt:now()})}
  else if(old){old.active=false;old.updatedAt=now()}});
 if(!ok){fe.textContent='Não foi possível salvar neste navegador.';return}
 const wasEditing=!!editing;closeForm();render();announce((wasEditing?'Cadastro atualizado: ':'Cadastro salvo: ')+type+' · '+catText({name:cat.name,subcategory:sub.name})+'.',savedId)};
function announce(text,id){flash.replaceChildren(document.createTextNode(text+' '));const c=catById(id);if(c){flash.append(button('Visualizar',()=>viewRow(c),'btn secondary'),button('Editar',()=>openForm(c),'btn secondary'))}}
function toggleRow(c){const run=()=>{transact(d=>{const x=d.categories.find(y=>y.id===c.id);(x.history=x.history||[]).push({at:now(),before:{active:x.active}});x.active=!x.active;x.updatedAt=now()});render();announce((c.active?'Desativado: ':'Ativado: ')+catText(c)+'.',c.id);return null};
 if(c.active)confirmDialog('Desativar cadastro?',catText(c)+' ('+c.type+') deixa de aparecer em novos lançamentos. Ocorrências já registradas e o histórico continuam como estão.','Desativar',run,()=>{});else run()}
function viewRow(c){load();c=catById(c.id)||c;const r=ruleOf(c.id),cf=c.config||{},di=docInfo(c);
 dialog('Tipo de ocorrência — '+catText(c),(f,form)=>{const dl=el('dl','profiles-info');for(const [k,v] of [['Tipo de ocorrência',c.type],['Categoria',c.name],['Subcategoria',c.subcategory||'—'],['Tipo de documento',docName(c)||'—'],['Status',c.active?'Ativo':'Inativo'],['Nível de gravidade',cf.severity||'Não definido'],['Período de consulta do histórico',cf.lookbackDays?cf.lookbackDays+' dia(s)':'Não definido'],['Reincidências para alerta',cf.alertRecurrences?String(cf.alertRecurrences):'Não definido'],['Revisão pelo DP',cf.needsDP?'Sim':'Não'],['Revisão jurídica',cf.needsLegal?'Sim':'Não'],['Orientação recomendada',cf.guidance||'—'],...(c.type==='SUSPENSÃO'?[['Conferência de advertências anteriores',r?catText(catById(r.warningCategoryId))+' nos últimos '+r.periodDays+' dia(s)':'Não configurada']]:[]),['Alterações',String((c.history||[]).length)]])dl.append(el('dt',null,k),el('dd',null,v));form.append(dl);
  if(di?.url)form.append(button('Ver modelo do documento',()=>window.open(di.url,'_blank','noopener'),'btn secondary'));else if(di?.legacy)form.append(button('Ver modelo enviado',()=>openModel(c),'btn secondary'))})}
function openModel(c){window.CicluzDocuments?.files.view('Modelo — '+catText(c),c.model,false)}
function saveDays(){dm.textContent='';const parts=dayIn.value.split(/[,;\s]+/).filter(Boolean),nums=parts.map(Number);if(nums.some(x=>!(Number.isInteger(x)&&x>=1))){dm.textContent='Use números inteiros a partir de 1, separados por vírgula.';return}
 const list=[...new Set(nums)].sort((a,b)=>a-b);if(!transact(d=>{d.suspensionDays=list})){dm.textContent='Não foi possível salvar neste navegador.';return}dm.textContent=list.length?'Dias permitidos: '+list.join(', ')+'.':'Sem restrição de dias.'}

const CU=()=>window.CicluzComprasUI,DOC_ICON='M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6';
function ruleLines(c){const r=discOf(c);if(!r)return ['Sem regra configurada.'];const o=[];if(r.warnCount)o.push(r.warnCount+(r.warnCount===1?' advertência':' advertências')+' → avaliar suspensão');if(r.suspCount)o.push(r.suspCount+(r.suspCount===1?' suspensão':' suspensões')+' → avaliar justa causa');if(!r.active)o.push('Regra inativa');return o}
function leafRow(c,linhas){const stack=lines=>lines.map(t=>el('span',null,t));
 const row=CU().linhaLista({icones:[{icone:'<path d="'+DOC_ICON+'"/>',rotulo:c.type}],grade:'grade-ocorrencia',
  colunas:[{chave:'nome',conteudo:typeof formatSystemName==='function'?formatSystemName(c.type):c.type},{chave:'categoria',conteudo:c.name},{chave:'subcategoria',conteudo:c.subcategory||'—'},{chave:'tipodoc',conteudo:docName(c)||'—'},{chave:'regra',conteudo:stack(ruleLines(c))}],
  estado:c.active?'Ativo':'Inativo',
  acoes:{rotulo:catText(c),lista:linhas,aoEditar:()=>openForm(c),aoExcluir:()=>toggleRow(c)}});
 if(!c.active)row.classList.add('inativo');
 /* tocar na linha mostra os detalhes; a seta revela o lápis (editar) e o botão de ativar/desativar (não há exclusão de cadastro: o histórico depende dele) */
 const arrow=row.querySelector('.account-action-toggle'),drawer=row.querySelector('.account-row-actions'),off=[...drawer.children].find(b=>/^Excluir/.test(b.getAttribute('aria-label')||'')),label=(c.active?'Desativar ':'Ativar ')+catText(c);
 off.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(c.active?ICON.ban:ICON.ok)+'"/></svg>';off.title=label;off.setAttribute('aria-label',label);
 row.onclick=e=>{if(e.target.closest('button'))return;if(!drawer.hidden){drawer.hidden=true;arrow.setAttribute('aria-expanded','false');return}viewRow(c)};
 row.onkeydown=e=>{if(e.target===row&&e.key==='Enter'){e.preventDefault();viewRow(c)}};
 row.setAttribute('aria-label','Visualizar '+catText(c));return row}
function renderTable(){tableBox.replaceChildren();
 const list=[...data.categories].sort((a,b)=>a.type.localeCompare(b.type,'pt-BR')||a.name.localeCompare(b.name,'pt-BR')||(a.subcategory||'').localeCompare(b.subcategory||'','pt-BR'));
 const cu=CU();if(!cu){tableBox.append(el('p','profiles-note','Não foi possível carregar a lista padrão do sistema. Recarregue a página.'));return}
 const ativos=data.categories.filter(c=>c.active).length,ponta=cu.pontaDaLista(ativos,ativos+(ativos===1?' cadastro ativo':' cadastros ativos'));
 const sec=cu.secao('Tipos de Ocorrência',undefined,ponta),linhas=el('div','compras-lista compras-lista-grade');cu.arrastarParaRolar(linhas);
 sec.querySelector('.compras-secao-cab h3').replaceChildren(cu.botaoTitulo('Novo Cadastro','Novo cadastro de tipo de ocorrência',()=>openForm(null)),cu.botaoTitulo('Nova regra','Nova regra disciplinar',()=>editDisc(null)));
 sec.append(linhas);
 if(!list.length)linhas.append(cu.vazio('Nenhum cadastro ainda.','Use "Novo Cadastro" para ligar um tipo de ocorrência a uma categoria, uma subcategoria e um documento.'));
 else{const cab=cu.cabecalhoColunas('grade-ocorrencia',[{chave:'nome',rotulo:'Tipo de ocorrência'},{chave:'categoria',rotulo:'Categoria',ocultavel:true},{chave:'subcategoria',rotulo:'Subcategoria',ocultavel:true},{chave:'tipodoc',rotulo:'Tipo de documento',ocultavel:true},{chave:'regra',rotulo:'Regra para suspensão ou justa causa',ocultavel:true},{chave:'estado',rotulo:'Status'}],{lista:linhas,preferencia:'cicluz-ocorrencias-colunas'});
  linhas.append(cab);ponta.append(cab.botaoGeral);for(const c of list)linhas.append(leafRow(c,linhas))}
 tableBox.append(sec)}
/* ---- Regras disciplinares: lista e edição em janela própria ---- */
function discLines(r){return [r.warnCount?'Para '+r.warnCount+(r.warnCount===1?' advertência':' advertências')+', aplicar suspensão (avaliação humana).':'',r.suspCount?'Para '+r.suspCount+(r.suspCount===1?' suspensão':' suspensões')+', aplicar justa causa (avaliação humana).':''].filter(Boolean)}
function scopeText(r){const c=data.categories.find(x=>x.catId===r.catId);return c?c.name:'Categoria não encontrada'}
function renderDisc(){discBox.replaceChildren();if(!data.disc.length){discBox.append(el('p','profiles-note','Nenhuma regra disciplinar cadastrada. Use o botão "Nova regra" no topo da lista.'));return}
 const {w,tb}=table(['Categoria','Advertências','Suspensões','Status','Ações']);
 for(const r of [...data.disc].sort((a,b)=>scopeText(a).localeCompare(scopeText(b),'pt-BR'))){const tr=el('tr','tree-leaf'),st=el('td'),a=el('td','uniforms-row-actions');st.append(pill(r.active));if(!r.active)tr.classList.add('is-cancelled');
  const sc=scopeText(r);a.append(iconButton('Visualizar regra de '+sc,ICON.eye,()=>viewDisc(r)),iconButton('Editar regra de '+sc,ICON.edit,()=>editDisc(r),'is-accent'),iconButton((r.active?'Desativar regra de ':'Ativar regra de ')+sc,r.active?ICON.ban:ICON.ok,()=>toggleDisc(r)));
  const cell=(l,t)=>{const td=el('td',null,t);td.dataset.label=l;return td};st.dataset.label='Status';a.dataset.label='Ações';
  tr.append(cell('Categoria',sc),cell('Advertências',r.warnCount?String(r.warnCount):'—'),cell('Suspensões',r.suspCount?String(r.suspCount):'—'),st,a);tb.append(tr)}discBox.append(w)}
function viewDisc(r){const sc=scopeText(r);dialog('Regra disciplinar — '+sc,(f,form)=>{const dl=el('dl','profiles-info');for(const [k,v] of [['Categoria',sc],['1 — Advertência',r.warnCount?'Para '+r.warnCount+(r.warnCount===1?' advertência':' advertências')+', aplicar suspensão.':'Não definido'],['2 — Suspensão',r.suspCount?'Para '+r.suspCount+(r.suspCount===1?' suspensão':' suspensões')+', aplicar justa causa.':'Não definido'],...(r.lookbackDays?[['Período de apuração (regra anterior)',r.lookbackDays+' dia(s)']]:[]),['Status',r.active?'Ativa':'Inativa'],...(r.notes?[['Observações',r.notes]]:[]),['Alterações',String((r.history||[]).length)]]){dl.append(el('dt',null,k),el('dd',null,v))}form.append(dl,el('p','profiles-note','Ao atingir o limite, o sistema só sinaliza: "avaliar suspensão" ou "avaliar justa causa". Nada é aplicado automaticamente: a decisão é do Departamento Pessoal e dos responsáveis autorizados.'))})}
function toggleDisc(r){const sc=scopeText(r),run=()=>{transact(d=>{const x=d.disc.find(y=>y.id===r.id);(x.history=x.history||[]).push({at:now(),before:{active:x.active}});x.active=!x.active;x.updatedAt=now()});renderDisc();renderTable();discFlash.textContent=(r.active?'Regra desativada: ':'Regra ativada: ')+sc+'.';return null};
 if(r.active)confirmDialog('Desativar regra?','A regra de '+sc+' deixa de gerar alertas em novos lançamentos. Ocorrências já registradas e o histórico continuam como estão.','Desativar',run,()=>{});else run()}
/* Regra disciplinar no padrão do sistema (19/11/2026, Rodrigo): janela dos cadastros novos (CicluzComprasUI.dialogo), com a regra
   desenhada como uma sequência — a categoria e, embaixo, 1 Advertência → 2 Suspensão → 3 Justa causa, com uma seta entre os passos
   dizendo o que leva de um ao outro. O 3º passo é só o fim da sequência: não tem campo. O que é gravado não mudou
   (catId, warnCount, suspCount, active); a situação, que antes só mudava pela lista, passa a aparecer também aqui. */
function editDisc(r){load();const cu=window.CicluzComprasUI;
 cu.dialogo({titulo:r?'Editar regra disciplinar':'Nova regra disciplinar',cor:ACCENT,corTexto:'var(--section-text,#9c1c1c)',largo:true,classe:'compras-form-padrao',rotuloSalvar:'Salvar',
  montar:(form,dlg)=>{
   const catSel2=el('select'),warnSel=el('select'),suspSel=el('select');
   catSel2.add(new Option('Selecione a categoria',''));const seen=new Set();for(const x of [...data.categories].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))){if(!x.catId||seen.has(x.catId))continue;seen.add(x.catId);catSel2.add(new Option(x.name,x.catId))}
   const nums=(sel,cur)=>{sel.add(new Option('Selecione a quantidade',''));for(let i=1;i<=Math.max(10,cur||0);i++)sel.add(new Option(String(i),String(i)))};nums(warnSel,r?.warnCount);nums(suspSel,r?.suspCount);
   if(r){catSel2.value=r.catId;warnSel.value=r.warnCount?String(r.warnCount):'';suspSel.value=r.suspCount?String(r.suspCount):''}
   const passo=(n,titulo,...nos)=>{const q=el('fieldset','compras-fieldset regra-passo');const lg=el('legend');lg.append(el('span','regra-numero',String(n)),document.createTextNode(titulo));q.append(lg,...nos);return q};
   const seta=()=>{const d=el('div','regra-seta');d.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15m0 0-6-6m6 6 6-6"/></svg>';const t=el('span');d.append(t);d.texto=t;return d};
   const warnTxt=el('p','profiles-note compras-largo'),suspTxt=el('p','profiles-note compras-largo'),resumo=el('p','regra-resumo compras-largo'),setaW=seta(),setaS=seta();resumo.setAttribute('role','status');
   const sit=cu.quadroSituacao('Situação da regra',r?r.active:true,{feminino:true,dica:'Regra inativa não gera alerta em novos lançamentos.'});sit.classList.add('compras-largo');
   const qCat=el('fieldset','compras-fieldset');qCat.append(el('legend',null,'Categoria'),cu.campo('Categoria *',catSel2),el('p','profiles-note compras-largo','A regra vale para as ocorrências desta categoria. Categorias diferentes nunca se somam.'),sit);
   const seq=el('div','regra-sequencia compras-etapa');
   seq.append(passo(1,'Advertência',cu.campo('Quantidade de advertências *',warnSel),warnTxt),setaW,
    passo(2,'Suspensão',cu.campo('Quantidade de suspensões *',suspSel),suspTxt),setaS,
    passo(3,'Justa causa',el('p','profiles-note compras-largo','Fim da sequência: aqui não há nada para preencher. Ao atingir o limite de suspensões, o sistema sinaliza "avaliar justa causa".')));
   const qRes=el('fieldset','compras-fieldset');qRes.append(el('legend',null,'Resumo da regra'),resumo,el('p','profiles-note compras-largo','O sistema apenas sinaliza ("avaliar suspensão" ou "avaliar justa causa"). Nada é aplicado automaticamente: a decisão é do Departamento Pessoal.'));
   const plural=(n,um,varios)=>n+' '+(n==='1'?um:varios);
   const paint=()=>{const w=warnSel.value,s2=suspSel.value,cat=catSel2.value?catSel2.selectedOptions[0].text:'';
    warnTxt.textContent=w?'Com '+plural(w,'advertência','advertências')+' nesta categoria, o sistema avisa para avaliar a suspensão.':'Escolha quantas advertências levam à suspensão.';
    suspTxt.textContent=s2?'Com '+plural(s2,'suspensão','suspensões')+' nesta categoria, o sistema avisa para avaliar a justa causa.':'Escolha quantas suspensões levam à justa causa.';
    setaW.texto.textContent=(w?plural(w,'advertência','advertências'):'tantas advertências')+' levam à suspensão';
    setaS.texto.textContent=(s2?plural(s2,'suspensão','suspensões'):'tantas suspensões')+' levam à justa causa';
    resumo.textContent=cat&&w&&s2?cat+': '+plural(w,'advertência','advertências')+' → suspensão → '+plural(s2,'suspensão','suspensões')+' → justa causa.':'Preencha a categoria e as duas quantidades para ver a regra completa.'};
   catSel2.onchange=warnSel.onchange=suspSel.onchange=paint;paint();
   const nav=el('div','compras-form-rodape compras-etapas-nav compras-largo'),salvar=el('button','btn','Salvar');salvar.type='submit';nav.append(cu.botao('Cancelar',()=>dlg.close(),'btn secondary footer-cancel-accent'),salvar);
   const corpo=el('div','compras-etapa compras-largo');corpo.append(qCat,seq,qRes);form.append(corpo,nav); /* a mensagem de erro é a da própria janela (CicluzComprasUI.dialogo) */
   return {catSel2,warnSel,suspSel,sit,form}},
  salvar:x=>{const catId=x.catSel2.value,warn=Number(x.warnSel.value),susp=Number(x.suspSel.value);
   const falta=!catId?'Selecione a categoria.':!x.warnSel.value?'Selecione a quantidade de advertências.':!x.suspSel.value?'Selecione a quantidade de suspensões.':'';
   if(falta){cu.sinalizarObrigatorios(x.form);return falta}
   if(!(Number.isInteger(warn)&&warn>=1&&Number.isInteger(susp)&&susp>=1))return 'As quantidades devem ser números inteiros a partir de 1.';
   const active=x.sit.ativo,catName=data.categories.find(y=>y.catId===catId)?.name||'';
   if(active&&data.disc.some(y=>y.id!==r?.id&&y.active&&y.catId===catId))return 'Já existe uma regra ativa para esta categoria. Edite a existente.';
   const rec={name:r&&r.catId===catId?r.name:catName,catId,type:'',subId:'',warnCount:warn,suspCount:susp,lookbackDays:r?r.lookbackDays:null,active,notes:r?.notes||''};
   const ok=transact(d=>{if(r){const o=d.disc.find(y=>y.id===r.id);(o.history=o.history||[]).push({at:now(),before:{name:o.name,catId:o.catId,warnCount:o.warnCount,suspCount:o.suspCount,lookbackDays:o.lookbackDays,active:o.active,notes:o.notes}});Object.assign(o,rec,{updatedAt:now()})}else d.disc.push({id:newId(),...rec,createdAt:now(),history:[]})});
   if(!ok)return 'Não foi possível salvar neste navegador.';discFlash.textContent=(r?'Regra atualizada: ':'Regra salva: ')+catName+'.';renderDisc();renderTable();setRules(true);cu.avisar(r?'Regra atualizada.':'Regra salva.');return undefined}})}
function render(){load();warn.hidden=!loadError;warn.textContent='Não foi possível ler o cadastro salvo neste navegador. Nada será gravado para não sobrescrever os dados.';dayIn.value=data.suspensionDays.join(', ');renderDisc();renderTable()}
function show(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const t=document.getElementById('title');if(t)t.textContent=TITLE;closeForm();flash.textContent='';render();normalizeHeaderActions(view)}
window.showOccurrenceCatalog=show;
window.CicluzOccurrenceCatalog={load,discCheck,catsOf:(t,all)=>{load();return catsOf(t,all)},byId:id=>{load();return catById(id)},catText,ruleCheck,suspensionDays:()=>{load();return [...data.suspensionDays]},openModel,docInfo,docName};
})();
