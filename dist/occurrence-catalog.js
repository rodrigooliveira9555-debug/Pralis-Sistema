/* Tipos de Ocorrência — catalog of categories per occurrence type, optional model document per category,
   and the configurable suspension rules (previous warnings of a category within a period set by the DP).
   The six types stay fixed in occurrences.js because they drive the form; nothing here invents a deadline,
   a category or a penalty: rules only raise an alert for the DP to check. */
(()=>{
'use strict';
const U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!U||!DB)return;
const {el,button,iconButton,ICON,fold,newId,dateBR,dialog,confirmDialog}=U;
const KEY='cicluz-ocorrencias-catalogo-v1',ACCENT='#7c3aed',TITLE='DES - Tipos de Ocorrência',GROUP='Cadastros Geral Colaboradores';
const types=()=>window.CicluzOccurrences?.types||[];

let data={version:1,categories:[],rules:[],suspensionDays:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.categories)||!Array.isArray(s.rules))throw Error('format');s.suspensionDays=Array.isArray(s.suspensionDays)?s.suspensionDays:[];data=s}loadError=false}catch{loadError=true}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
const now=()=>new Date().toISOString();
const catById=id=>data.categories.find(c=>c.id===id);
const catsOf=(type,all)=>data.categories.filter(c=>c.type===type&&(all||c.active)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
const catText=c=>c?c.name+(c.subcategory?' · '+c.subcategory:''):'—';

/* Previous warnings for a suspension: one line per active rule of the category, with what was found. */
function ruleCheck(records,personId,categoryId,dateIso){load();const out=[];if(!personId||!categoryId||!dateIso)return out;
 for(const r of data.rules.filter(x=>x.active&&x.suspensionCategoryId===categoryId)){const w=catById(r.warningCategoryId);
  if(!Number.isInteger(r.periodDays)||r.periodDays<1){out.push({rule:r,warning:w,configured:false,found:[]});continue}
  const from=new Date(Date.parse(dateIso+'T12:00:00')-r.periodDays*864e5).toISOString().slice(0,10);
  const found=records.filter(x=>x.collaboratorId===personId&&x.type==='ADVERTÊNCIA'&&x.status!=='Cancelada'&&x.categoryId===r.warningCategoryId&&x.date>=from&&x.date<=dateIso).sort((a,b)=>b.date.localeCompare(a.date));
  out.push({rule:r,warning:w,configured:true,from,found})}return out}

/* ---------- Screen ---------- */
const view=el('section','view');view.id='occurrence-catalog-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Catálogo usado em Lançamentos Colaboradores → DES - Ocorrências. Os tipos são fixos porque definem os campos do formulário; categorias, modelos e regras são cadastrados pelo DP. A plataforma não cria categorias, prazos ou modelos e nunca aplica penalidade automaticamente.'));
const warn=el('p','people-alert');warn.hidden=true;body.append(warn);
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const msgs=()=>{const e=el('p','uniforms-wide profiles-error'),s=el('p','uniforms-wide profiles-note');e.setAttribute('role','alert');s.setAttribute('role','status');return {e,s}};
function table(heads){const t=el('table','uniforms-table'),hr=el('tr');for(const h of heads)hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);return {w,tb}}
const pill=a=>el('span','pill '+(a?'p-green':'p-red'),a?'Ativa':'Inativa');

/* Tipos (read-only) */
const typesBox=el('div');body.append(el('h3','uniforms-heading','Tipos de ocorrência'),typesBox);
function renderTypes(){typesBox.replaceChildren();const {w,tb}=table(['Tipo','Campos específicos','Categorias ativas']);for(const t of types()){const c=window.CicluzOccurrences.typeConfig(t),tr=el('tr');
 tr.append(el('td',null,t),el('td',null,[c.medical&&'dados médicos',c.days&&'quantidade de dias',c.period&&'período'].filter(Boolean).join(', ')||'—'),el('td','uniforms-num',String(catsOf(t).length)));tb.append(tr)}typesBox.append(w)}

/* Categorias */
const cForm=el('form','form-fields uniforms-form');cForm.noValidate=true;const cTitle=el('h3','uniforms-wide uniforms-heading','Nova categoria');
const cType=el('select'),cName=el('input'),cSub=el('input'),cNotes=el('textarea'),cActive=el('select'),cFile=el('input'),cFileInfo=el('p','uniforms-wide profiles-note');cName.maxLength=80;cSub.maxLength=80;cNotes.rows=2;cNotes.addEventListener('focusout',e=>e.stopPropagation());
cActive.add(new Option('Ativa','1'));cActive.add(new Option('Inativa','0'));cFile.type='file';cFile.accept='application/pdf,image/jpeg,image/png,image/webp';
const cm=msgs(),cAct=el('div','uniforms-wide actions'),cSave=el('button','btn','Salvar categoria');cSave.type='submit';let cEditing=null;cAct.append(button('Cancelar',()=>{cReset();cm.s.textContent='Edição descartada.'}),cSave);
cForm.append(cTitle,lbl('Tipo de ocorrência *',cType),lbl('Nome da categoria *',cName),lbl('Subcategoria',cSub),lbl('Status',cActive),lbl('Modelo do documento (PDF ou imagem, opcional)',cFile,'uniforms-wide'),cFileInfo,lbl('Observações',cNotes,'uniforms-wide'),cm.e,cm.s,cAct);
const cList=el('div');body.append(cForm,el('h3','uniforms-heading','Categorias cadastradas'),cList);
function fillTypes(sel,cur){sel.replaceChildren(new Option('Selecione o tipo',''));for(const t of types())sel.add(new Option(t,t));sel.value=cur||''}
function cReset(){cEditing=null;fillTypes(cType,'');cName.value=cSub.value=cNotes.value='';cActive.value='1';cFile.value='';cFileInfo.textContent='Sem modelo: o lançamento orienta a anexar o documento assinado. A plataforma não gera o texto do modelo.';cTitle.textContent='Nova categoria';cSave.textContent='Salvar categoria';cm.e.textContent=''}
function cEdit(c){cEditing=c.id;fillTypes(cType,c.type);cName.value=c.name;cSub.value=c.subcategory||'';cNotes.value=c.notes||'';cActive.value=c.active?'1':'0';cFile.value='';cFileInfo.textContent=c.model?'Modelo atual: '+c.model.name+'. Escolha outro arquivo para substituir.':'Sem modelo cadastrado.';cTitle.textContent='Editar categoria: '+c.name;cSave.textContent='Salvar alterações';cm.e.textContent='';cm.s.textContent='';cForm.scrollIntoView({block:'start',behavior:'smooth'})}
cForm.onsubmit=async e=>{e.preventDefault();cm.e.textContent=cm.s.textContent='';load();const n=cName.value.trim(),t=cType.value,errs=[];if(!t)errs.push('Selecione o tipo.');if(!n)errs.push('Informe o nome da categoria.');
 if(t&&n&&data.categories.some(c=>c.id!==cEditing&&c.type===t&&fold(c.name)===fold(n)&&fold(c.subcategory||'')===fold(cSub.value.trim())))errs.push('Esta categoria já existe para '+t+'.');
 const file=cFile.files?.[0];const F=window.CicluzDocuments?.files;if(file){const bad=F?await F.inspect(file):'Armazenamento de arquivos indisponível.';if(bad)errs.push(bad)}
 if(errs.length){cm.e.textContent=errs.join(' ');return}
 let model=null;if(file){const id=newId();try{await F.put(id,file);model={id,name:file.name,type:file.type,size:file.size,at:now()}}catch{cm.e.textContent='Não foi possível guardar o modelo neste navegador.';return}}
 const rec={type:t,name:n,subcategory:cSub.value.trim(),notes:cNotes.value.trim(),active:cActive.value==='1'};
 const ok=transact(d=>{if(cEditing){const c=d.categories.find(x=>x.id===cEditing);(c.history=c.history||[]).push({at:now(),before:{type:c.type,name:c.name,subcategory:c.subcategory,active:c.active,model:c.model?.name||''}});Object.assign(c,rec,model?{model}:{},{updatedAt:now()})}else d.categories.push({id:newId(),...rec,model,createdAt:now(),history:[]})});
 if(!ok){cm.e.textContent='Não foi possível salvar neste navegador.';return}const m=(cEditing?'Categoria atualizada: ':'Categoria cadastrada: ')+t+' · '+n+'.';cReset();render();cm.s.textContent=m};
function renderCats(){cList.replaceChildren();const list=[...data.categories].sort((a,b)=>a.type.localeCompare(b.type,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'));if(!list.length){cList.append(el('p','profiles-note','Nenhuma categoria cadastrada.'));return}
 const {w,tb}=table(['Tipo','Categoria','Subcategoria','Modelo','Status','Ações']);for(const c of list){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions');st.append(pill(c.active));if(!c.active)tr.classList.add('is-cancelled');
  a.append(iconButton('Editar categoria '+c.name,ICON.edit,()=>cEdit(c),'is-accent'),iconButton((c.active?'Desativar':'Reativar')+' categoria '+c.name,c.active?ICON.ban:ICON.ok,()=>{transact(d=>{const x=d.categories.find(y=>y.id===c.id);x.active=!x.active;x.updatedAt=now()});render()}));
  if(c.model)a.append(iconButton('Ver modelo de '+c.name,ICON.eye,()=>openModel(c)));
  tr.append(el('td',null,c.type),el('td',null,c.name),el('td',null,c.subcategory||'—'),el('td',null,c.model?c.model.name:'Sem modelo'),st,a);tb.append(tr)}cList.append(w)}
function openModel(c){window.CicluzDocuments?.files.view('Modelo — '+c.name,c.model,false)}

/* Regras de suspensão */
const rForm=el('form','form-fields uniforms-form');rForm.noValidate=true;
const rSusp=el('select'),rWarn=el('select'),rDays=el('input'),rNote=el('input'),rm=msgs(),rAct=el('div','uniforms-wide actions'),rSave=el('button','btn','Salvar regra');rSave.type='submit';rDays.type='number';rDays.min='1';rDays.step='1';rDays.inputMode='numeric';rDays.placeholder='Definido pelo DP';rNote.maxLength=200;rAct.append(rSave);
const daysCfg=el('input');daysCfg.placeholder='Ex.: 1, 2, 3 (deixe em branco para não restringir)';const dm=msgs(),dAct=el('div','uniforms-wide actions'),dSave=button('Salvar dias permitidos',saveDays,'btn');dAct.append(dSave);
rForm.append(el('h3','uniforms-wide uniforms-heading','Nova regra de conferência'),el('p','uniforms-wide profiles-note','Ao lançar uma suspensão da categoria escolhida, a tela procura advertências do colaborador na categoria indicada dentro do período informado e mostra um alerta para conferência do DP. A regra não impede o lançamento nem aplica a suspensão. O período deve vir da orientação da empresa/jurídico.'),
 lbl('Categoria da suspensão *',rSusp),lbl('Categoria da advertência anterior *',rWarn),lbl('Período de referência (dias) *',rDays),lbl('Observação',rNote,'uniforms-wide'),rm.e,rm.s,rAct,
 el('h3','uniforms-wide uniforms-heading','Dias de suspensão permitidos'),lbl('Quantidades permitidas',daysCfg,'uniforms-wide'),el('p','uniforms-wide profiles-note','Opcional. Quando preenchido, o lançamento mostra atalhos com essas quantidades; o valor continua editável.'),dm.e,dm.s,dAct);
const rList=el('div');body.append(el('h3','uniforms-heading','Regras de suspensão'),rForm,rList);
function fillCats(sel,type){const cur=sel.value;sel.replaceChildren(new Option(catsOf(type).length?'Selecione a categoria':'Cadastre uma categoria de '+type+' acima',''));for(const c of catsOf(type))sel.add(new Option(catText(c),c.id));sel.value=cur}
rForm.onsubmit=e=>{e.preventDefault();rm.e.textContent=rm.s.textContent='';load();const n=Number(rDays.value),errs=[];if(!catById(rSusp.value))errs.push('Selecione a categoria da suspensão.');if(!catById(rWarn.value))errs.push('Selecione a categoria da advertência anterior.');if(!(Number.isInteger(n)&&n>=1))errs.push('Informe o período em dias (número inteiro a partir de 1).');
 if(data.rules.some(r=>r.active&&r.suspensionCategoryId===rSusp.value&&r.warningCategoryId===rWarn.value))errs.push('Já existe uma regra ativa para estas categorias; desative-a antes de criar outra.');if(errs.length){rm.e.textContent=errs.join(' ');return}
 if(!transact(d=>d.rules.push({id:newId(),suspensionCategoryId:rSusp.value,warningCategoryId:rWarn.value,periodDays:n,note:rNote.value.trim(),active:true,createdAt:now()}))){rm.e.textContent='Não foi possível salvar neste navegador.';return}
 rDays.value='';rNote.value='';render();rm.s.textContent='Regra salva. Ela só gera alerta para conferência.'};
function saveDays(){dm.e.textContent=dm.s.textContent='';const parts=daysCfg.value.split(/[,;\s]+/).filter(Boolean),nums=parts.map(Number);if(nums.some(x=>!(Number.isInteger(x)&&x>=1))){dm.e.textContent='Use números inteiros a partir de 1, separados por vírgula.';return}
 const list=[...new Set(nums)].sort((a,b)=>a-b);if(!transact(d=>{d.suspensionDays=list})){dm.e.textContent='Não foi possível salvar neste navegador.';return}dm.s.textContent=list.length?'Dias permitidos: '+list.join(', ')+'.':'Sem restrição de dias.'}
function renderRules(){rList.replaceChildren();fillCats(rSusp,'SUSPENSÃO');fillCats(rWarn,'ADVERTÊNCIA');daysCfg.value=data.suspensionDays.join(', ');if(!data.rules.length){rList.append(el('p','profiles-note','Nenhuma regra configurada. Sem regra, o lançamento de suspensão não verifica advertências anteriores.'));return}
 const {w,tb}=table(['Suspensão','Advertência anterior','Período','Status','Ações']);for(const r of data.rules){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions');st.append(pill(r.active));if(!r.active)tr.classList.add('is-cancelled');
  a.append(iconButton((r.active?'Desativar':'Reativar')+' regra',r.active?ICON.ban:ICON.ok,()=>{transact(d=>{const x=d.rules.find(y=>y.id===r.id);x.active=!x.active;x.updatedAt=now()});render()}));
  tr.append(el('td',null,catText(catById(r.suspensionCategoryId))),el('td',null,catText(catById(r.warningCategoryId))),el('td',null,r.periodDays+' dia(s)'),st,a);tb.append(tr)}rList.append(w)}

function render(){load();warn.hidden=!loadError;warn.textContent='Não foi possível ler o catálogo salvo neste navegador. Nada será gravado para não sobrescrever os dados.';renderTypes();renderCats();renderRules()}
function show(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const t=document.getElementById('title');if(t)t.textContent=TITLE;cReset();render();normalizeHeaderActions(view)}
window.showOccurrenceCatalog=show;
window.CicluzOccurrenceCatalog={load,catsOf:(t)=>{load();return catsOf(t)},byId:id=>{load();return catById(id)},catText,ruleCheck,suspensionDays:()=>{load();return [...data.suspensionDays]},openModel};
})();
