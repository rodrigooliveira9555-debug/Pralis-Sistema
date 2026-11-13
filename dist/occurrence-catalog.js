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
const KEY='cicluz-ocorrencias-catalogo-v1',ACCENT='#7c3aed',TITLE='DES - Tipos de Ocorrência',GROUP='Cadastros Geral Colaboradores';
const SEVERITY=['Leve','Moderado','Grave'];
const types=()=>window.CicluzOccurrences?.types||[];
const MX=()=>window.CicluzMatrix;

let data={version:1,categories:[],rules:[],suspensionDays:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.categories)||!Array.isArray(s.rules))throw Error('format');s.suspensionDays=Array.isArray(s.suspensionDays)?s.suspensionDays:[];data=s}loadError=false}catch{loadError=true}link();seed()}
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
const ruleOf=id=>data.rules.find(r=>r.active&&r.suspensionCategoryId===id)||null;

/* ---------- Tela ---------- */
const view=el('section','view');view.id='occurrence-catalog-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Cadastro único usado em Lançamentos Colaboradores → DES - Ocorrências: cada linha liga um tipo de ocorrência a uma categoria, uma subcategoria e um documento de Documentações. As configurações disciplinares ficam na seção "Configurações adicionais" de cada cadastro e são só administrativas: nada é aplicado automaticamente e nenhum prazo jurídico é definido pela plataforma.'));
const warn=el('p','people-alert');warn.hidden=true;body.append(warn);
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const pill=a=>el('span','pill '+(a?'p-green':'p-red'),a?'Ativo':'Inativo');
function table(heads){const t=el('table','uniforms-table'),hr=el('tr');for(const h of heads)hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);return {w,tb}}

/* Parte superior: tabela */
const topBar=el('div','people-banner-tools'),newBtn=button('Novo Cadastro',()=>openForm(null),'btn');topBar.append(newBtn);
const tableBox=el('div'),flash=el('p','profiles-note'),fFilter=el('select');fFilter.setAttribute('aria-label','Filtrar por tipo de ocorrência');fFilter.addEventListener('change',()=>renderTable());const filterLbl=lbl('Filtrar por tipo de ocorrência',fFilter);flash.setAttribute('role','status');
body.append(el('h3','uniforms-heading','Tipos de ocorrência cadastrados'),topBar,filterLbl,flash,tableBox);

/* Parte inferior: formulário */
const form=el('form','form-fields uniforms-form');form.noValidate=true;form.hidden=true;const formTitle=el('h3','uniforms-wide uniforms-heading','Novo cadastro');
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
const act=el('div','uniforms-wide actions'),save=el('button','btn','Salvar');save.type='submit';let editing=null;act.append(button('Cancelar',()=>closeForm(),'btn'),save);
form.append(formTitle,lbl('Tipo de ocorrência *',fType),lbl('Nome da categoria *',fCat),catNewLbl,lbl('Subcategoria *',fSub),subNewLbl,lbl('Tipo de documento *',fDoc),lbl('Status *',fActive),more,fe,fs,act);
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

function openForm(c){editing=c?c.id:null;load();fillTypeSel(c?.type);fillCatSel(c?.catId);fillSubSel(c?.subId);fillDocSel(c?(c.docCatId||(c.model?'legacy':'')):'',c?.model);fActive.value=c?(c.active?'1':'0'):'1';fCatNew.value=fSubNew.value='';
 const cf=c?.config||{};mSev.value=cf.severity||'';mLook.value=cf.lookbackDays||'';mRec.value=cf.alertRecurrences||'';mDP.checked=!!cf.needsDP;mLegal.checked=!!cf.needsLegal;mGuide.value=cf.guidance||'';
 const r=c?ruleOf(c.id):null;fillWarnSel(r?.warningCategoryId||'');mWarnDays.value=r?.periodDays||'';paintMore();more.open=!!(c&&(cf.severity||cf.lookbackDays||cf.alertRecurrences||cf.needsDP||cf.needsLegal||r));
 formTitle.textContent=c?'Editar cadastro: '+catText(c):'Novo cadastro';save.textContent='Salvar';fe.textContent=fs.textContent='';form.hidden=false;form.scrollIntoView({block:'start',behavior:'smooth'})}
function closeForm(){editing=null;form.hidden=true;fe.textContent=fs.textContent=''}

form.onsubmit=e=>{e.preventDefault();fe.textContent=fs.textContent='';load();const M=MX(),errs=[],type=fType.value;
 if(!type)errs.push('Selecione o tipo de ocorrência.');if(!fCat.value)errs.push('Selecione ou cadastre a categoria.');if(fCat.value===NEW&&!fCatNew.value.trim())errs.push('Informe o nome da nova categoria.');
 if(!fSub.value)errs.push('Selecione ou cadastre a subcategoria.');if(fSub.value===NEW&&!fSubNew.value.trim())errs.push('Informe o nome da nova subcategoria.');if(!fDoc.value)errs.push('Selecione o tipo de documento (ou "Sem documento associado").');
 const look=mLook.value===''?null:Number(mLook.value),recur=mRec.value===''?null:Number(mRec.value),wd=mWarnDays.value===''?null:Number(mWarnDays.value);
 if([look,recur,wd].some(x=>x!==null&&!(Number.isInteger(x)&&x>=1)))errs.push('Nas configurações adicionais, use números inteiros a partir de 1.');if(type==='SUSPENSÃO'&&!!mWarn.value!==(wd!==null))errs.push('Para conferir advertências anteriores, informe a categoria e o período juntos.');
 if(errs.length){fe.textContent=errs.join(' ');return}
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

function renderTable(){tableBox.replaceChildren();const curF=fFilter.value;fFilter.replaceChildren(new Option('Todos os tipos',''));for(const t of types())fFilter.add(new Option(t,t));fFilter.value=curF;
 const list=data.categories.filter(c=>!fFilter.value||c.type===fFilter.value).sort((a,b)=>a.type.localeCompare(b.type,'pt-BR')||a.name.localeCompare(b.name,'pt-BR')||(a.subcategory||'').localeCompare(b.subcategory||'','pt-BR'));
 if(!list.length){tableBox.append(el('p','profiles-note',fFilter.value?'Nenhum cadastro para este tipo.':'Nenhum cadastro ainda. Use "Novo Cadastro" para ligar um tipo de ocorrência a uma categoria, uma subcategoria e um documento.'));return}
 const {w,tb}=table(['Tipo de ocorrência','Categoria','Subcategoria','Tipo de documento','Status','Ações']);
 for(const c of list){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions');st.append(pill(c.active));if(!c.active)tr.classList.add('is-cancelled');
  a.append(iconButton('Visualizar '+catText(c),ICON.eye,()=>viewRow(c)),iconButton('Editar '+catText(c),ICON.edit,()=>openForm(c),'is-accent'),iconButton((c.active?'Desativar ':'Ativar ')+catText(c),c.active?ICON.ban:ICON.ok,()=>toggleRow(c)));
  tr.append(el('td',null,c.type),el('td',null,c.name),el('td',null,c.subcategory||'—'),el('td',null,docName(c)||'—'),st,a);tb.append(tr)}tableBox.append(w)}
function render(){load();warn.hidden=!loadError;warn.textContent='Não foi possível ler o cadastro salvo neste navegador. Nada será gravado para não sobrescrever os dados.';dayIn.value=data.suspensionDays.join(', ');renderTable()}
function show(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const t=document.getElementById('title');if(t)t.textContent=TITLE;closeForm();flash.textContent='';render();normalizeHeaderActions(view)}
window.showOccurrenceCatalog=show;
window.CicluzOccurrenceCatalog={load,catsOf:(t,all)=>{load();return catsOf(t,all)},byId:id=>{load();return catById(id)},catText,ruleCheck,suspensionDays:()=>{load();return [...data.suspensionDays]},openModel,docInfo,docName};
})();
