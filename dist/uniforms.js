/* Uniformes: movements, stock and job references in one view. Data stays in this browser until the database integration. */
(()=>{
'use strict';
const D=window.CicluzUniformData,S=window.CicluzUniformStock;if(!D||!S)return;
const KEY='cicluz-uniformes-v1',ACCENT='#7c3aed',PATH=menuCrumb(2,'Lançamentos Colaboradores','DES - Uniformes Entrega/Recebimento');
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(text,fn,cls='btn secondary')=>{const b=el('button',cls,text);b.type='button';b.onclick=fn;return b};
const svg=path=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
const ICON={ok:'m5 12 4 4L19 6',calendar:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',copy:'M8 8h12v12H8zM4 16V4h12',user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',power:'M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0',shirt:'M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z',plus:'M12 5v14M5 12h14',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',edit:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',ban:'M5.6 5.6l12.8 12.8M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6'};
/* The legacy inline script declares a global open(t) that shadows window.open with the old modal; links open through an anchor instead. */
function openExternal(url){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';document.body.append(a);a.click();a.remove()}
const iconButton=(label,path,fn,cls='')=>{const b=button('',fn,'uniforms-icon-action'+(cls?' '+cls:''));b.title=label;b.setAttribute('aria-label',label);b.innerHTML=svg(path);return b};
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('pt-BR');
const newId=()=>crypto.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const money=c=>Number.isInteger(c)?(c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'—';
const moneyInput=c=>Number.isInteger(c)&&c>0&&window.CicluzFieldRules?CicluzFieldRules.moneyMask(String(c)):'';
/* The shared money mask treats typed digits as cents; read them the same way, even before the mask repaints. */
const cents=v=>{const d=String(v||'').replace(/\D/g,'').slice(0,15);const n=d?Number(d):0;return n>0?n:null};
const dateBR=iso=>/^\d{4}-\d{2}-\d{2}$/.test(iso||'')?iso.slice(8,10)+'/'+iso.slice(5,7)+'/'+iso.slice(0,4):'—';
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const uniformById=new Map(D.uniforms.map(u=>[u.id,u])),uniformName=id=>uniformById.get(id)?.name||'Uniforme removido ('+id+')';
const typeLabel=t=>D.types.find(x=>x.id===t)?.id||t;
const STATUS={ATIVO:['Registrado','p-green'],CORRIGIDO:['Corrigido','p-yellow'],CANCELADO:['Cancelado','p-red']};

/* Storage: one versioned document, saved atomically. */
let data=S.emptyState(),loadError=false;
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){if(saved.version!==1||!Array.isArray(saved.movements)||typeof saved.stock!=='object'||typeof saved.references!=='object')throw Error('format');if(!Array.isArray(saved.purchases))saved.purchases=[];data=saved}loadError=false}catch{loadError=true}}
load();
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change();localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}

/* Sources the database will replace: collaborators and the Cargos catalog. */
/* Gestão de Pessoas registry when present; demo list only as a fallback. */
function collaborators(){return window.CicluzPeople?.selectable()||D.demoCollaborators}
function collaboratorById(id){return collaborators().find(c=>c.id===id)}
function jobCatalog(){try{return jobsCurrent().map(e=>({key:e.key.startsWith('ref:')?e.key:'custom:'+JSON.stringify([e.j.nome,e.j.cbo||'']),name:e.j.nomeReduzido||e.j.nome,full:e.j.nome,cbo:e.j.cbo||''}))}catch{return []}}
function jobFor(collab){if(!collab?.jobName)return null;const target=fold(collab.jobName);return jobCatalog().find(j=>fold(j.full)===target||fold(j.name)===target)||null}
function referenceFor(collab){const job=jobFor(collab);return job?{job,items:data.references[job.key]?.items||[]}:null}

/* View shell, same structure as the other internal views. */
const view=el('section','view');view.id='uniforms-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(ICON.shirt);const heading=el('div'),title=el('h2',null,'DES - Uniformes Entrega/Recebimento'),subtitle=el('p',null,PATH);heading.append(title,subtitle);head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,'Lançamentos Colaboradores')());
const addButton=button('',()=>{selectTab('launch');resetForm();dateInput.focus()},'shortcut-circle');addButton.title='Novo lançamento';addButton.setAttribute('aria-label','Novo lançamento');addButton.innerHTML=svg(ICON.plus);head.querySelector('.shortcut-actions').append(addButton);

const note=el('div','form-note','Simulação local: lançamentos, estoque e referências ficam somente neste navegador até a integração com o banco de dados. Colaboradores demonstrativos.');
const tabs=el('div','uniforms-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Seções de uniformes');
const sectionsDef=[['launch','Lançamentos'],['stock','Controle de Estoque'],['reference','Referência por Cargo']],tabButtons={},tabPanels={};
for(const [key,label] of sectionsDef){const b=button(label,()=>selectTab(key),'uniforms-tab');b.id='uniforms-tab-'+key;b.setAttribute('role','tab');b.setAttribute('aria-controls','uniforms-panel-'+key);tabButtons[key]=b;tabs.append(b);const p=el('div','uniforms-section');p.id='uniforms-panel-'+key;p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',b.id);tabPanels[key]=p}
tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;const keys=sectionsDef.map(s=>s[0]),i=keys.indexOf(activeTab),next=keys[(i+(e.key==='ArrowRight'?1:keys.length-1))%keys.length];selectTab(next);tabButtons[next].focus();e.preventDefault()});
const loadNote=el('p','profiles-error');loadNote.setAttribute('role','alert');
body.append(note,loadNote,tabs,...Object.values(tabPanels));
let activeTab='launch';
function selectTab(key){activeTab=key;for(const [k,b] of Object.entries(tabButtons)){const on=k===key;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;tabPanels[k].hidden=!on}renderTab()}
function renderTab(){loadNote.textContent=loadError?'Não foi possível ler os lançamentos salvos. Os dados foram preservados; recarregue a página antes de alterar.':'';if(activeTab==='launch'){renderForm();renderHistory()}else if(activeTab==='stock')renderStock();else renderReferences()}

function dialog(titleText,build,onSave,saveLabel='Salvar',after=renderTab){const d=el('dialog','location-dialog profiles-dialog uniforms-dialog');d.style.setProperty('--menu-accent',ACCENT);const h=el('h2',null,titleText),form=el('form','account-editor'),err=el('p','profiles-error');err.setAttribute('role','alert');form.noValidate=true;const field=(name,node)=>{const l=el('label',null,name);node.setAttribute('aria-label',name);l.append(node);form.append(l);return node};const result=build(field,form);const actions=el('div','actions');if(onSave){const save=el('button','btn',saveLabel);save.type='submit';actions.append(button('Cancelar',()=>d.close()),save)}else actions.append(button('Fechar',()=>d.close()));form.append(err,actions);form.onsubmit=e=>{e.preventDefault();if(!onSave)return d.close();const message=onSave(result);if(message){err.textContent=message;return}d.close();after()};d.append(h,form);document.body.append(d);d.onclose=()=>d.remove();d.showModal();form.querySelector('input,select,textarea')?.focus();return d}
function confirmDialog(titleText,text,confirmLabel,onConfirm,after){return dialog(titleText,(field,form)=>{form.append(el('p','uniforms-confirm-text',text))},()=>onConfirm(),confirmLabel,after)}

/* ---------- Seção 1: formulário de lançamento ---------- */
const launch=tabPanels.launch;
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const formTitle=el('h3','uniforms-wide uniforms-heading','Novo lançamento');
const field=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return {label:l,node}};
/* Searchable ENUM: one label holds the search field (collapsed to the shared magnifier) and the select it filters. */
function enumField(name,searchHint,cls){const l=el('label','uniforms-enum'+(cls?' '+cls:'')),search=el('input'),select=el('select');search.type='search';search.placeholder='Buscar…';search.setAttribute('aria-label',searchHint);select.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(el('span','uniforms-enum-label',name),search,select);return {label:l,search,select}}
const date=field('Data *',el('input'));const dateInput=date.node;dateInput.type='date';dateInput.required=true;
const collabEnum=enumField('Colaborador *','Buscar colaborador'),collabSearch={node:collabEnum.search},collab={label:collabEnum.label,node:collabEnum.select};collab.node.required=true;
const jobField=field('Cargo',el('input'));jobField.node.readOnly=true;jobField.node.placeholder='Selecione o colaborador';
const statusField=field('Situação do colaborador',el('input'));statusField.node.readOnly=true;statusField.node.placeholder='—';
const typeField=field('Tipo *',el('select'));typeField.node.required=true;typeField.node.add(new Option('Selecione',''));D.types.forEach(t=>typeField.node.add(new Option(t.id,t.id)));
const origin=field('Movimentação de origem',el('select'));
const picker=el('div','uniforms-wide uniforms-picker');const pickerSearch=field('Uniformes * — buscar e selecionar',el('input'));pickerSearch.node.type='search';pickerSearch.node.placeholder='Buscar uniforme…';const pickerList=el('div','uniforms-options');pickerList.setAttribute('role','group');pickerList.setAttribute('aria-label','Uniformes disponíveis');picker.append(pickerSearch.label,pickerList);
const reference=el('div','uniforms-wide uniforms-reference');
const items=el('div','uniforms-wide uniforms-items');
const formError=el('p','uniforms-wide profiles-error');formError.setAttribute('role','alert');const formStatus=el('p','uniforms-wide profiles-note');formStatus.setAttribute('role','status');
const formActions=el('div','uniforms-wide actions');const cancelEdit=button('Cancelar',()=>{resetForm();formStatus.textContent='Lançamento descartado.'});const saveButton=el('button','btn','Salvar');saveButton.type='submit';formActions.append(cancelEdit,saveButton);
form.append(formTitle,date.label,collab.label,jobField.label,statusField.label,typeField.label,origin.label,picker,reference,items,formError,formStatus,formActions);
const history=el('div','uniforms-history');launch.append(form,history);

/* Draft: selected uniforms keep their own quantity and price text while typing. */
let draft={editingId:null,items:new Map()};
function resetForm(){draft={editingId:null,items:new Map()};formTitle.textContent='Novo lançamento';dateInput.value=today();collabSearch.node.value='';collab.node.value='';typeField.node.value='';origin.node.value='';pickerSearch.node.value='';formError.textContent='';renderForm()}
function editingMovement(){return draft.editingId?data.movements.find(m=>m.id===draft.editingId):null}
function currentTotals(){return S.totals(data,D.uniforms.map(u=>u.id))}
/* Balance available to the draft: an edited outflow gives its own quantity back. */
function available(uniformId,t=currentTotals()){const own=editingMovement();let n=t[uniformId].balance;if(own&&own.status!=='CANCELADO')for(const i of own.items)if(i.uniformId===uniformId)n+=own.type==='DEVOLVIDO'?-i.quantity:i.quantity;return n}
function returnLimit(uniformId){const c=collab.node.value;return origin.node.value?S.returnable(data.movements,origin.node.value,uniformId,draft.editingId):S.held(data.movements,c,uniformId,draft.editingId)}

function renderCollaborators(){const q=fold(collabSearch.node.value),selected=collab.node.value;collab.node.replaceChildren(new Option('Selecione o colaborador',''));for(const c of collaborators()){if(c.id!==selected&&!fold(c.name+' '+c.jobName).includes(q))continue;collab.node.add(new Option(c.name+(c.active?'':' (inativo)'),c.id))}
 /* An edited movement may reference a collaborator no longer in the list; keep it selectable. */
 const own=editingMovement();if(own&&!collaboratorById(own.collaboratorId)&&own.collaboratorId===selected)collab.node.add(new Option(own.collaboratorName+' (preservado)',own.collaboratorId));collab.node.value=selected}
function renderCollaboratorInfo(){const c=collaboratorById(collab.node.value),own=editingMovement();const job=c?jobFor(c):null;jobField.node.value=c?(job?.name||c.jobName||'Não informado'):own&&own.collaboratorId===collab.node.value?own.jobName||'':'';const active=c?c.active:own&&own.collaboratorId===collab.node.value?own.collaboratorActive:null;statusField.node.value=active===null?'':active?'Ativo':'Inativo';statusField.label.classList.toggle('is-inactive',active===false)}
function renderOrigins(){const isReturn=typeField.node.value==='DEVOLVIDO';origin.label.hidden=!isReturn;if(!isReturn){origin.node.value='';return}const selected=origin.node.value,list=collab.node.value?S.returnOrigins(data.movements,collab.node.value,draft.editingId):[];origin.node.replaceChildren(new Option(list.length?'Sem vínculo — limitar ao total retirado pelo colaborador':'Nenhuma retirada anterior deste colaborador',''));for(const m of list.sort((a,b)=>b.date.localeCompare(a.date)))origin.node.add(new Option(dateBR(m.date)+' · '+m.type+' · '+m.items.map(i=>uniformName(i.uniformId).split(' - ').pop()+' ×'+i.quantity).join(', '),m.id));origin.node.value=list.some(m=>m.id===selected)?selected:''}
function allowedUniforms(){if(typeField.node.value==='DEVOLVIDO'&&origin.node.value){const m=data.movements.find(x=>x.id===origin.node.value);return new Set(m?m.items.map(i=>i.uniformId):[])}return null}
function renderPicker(){const q=fold(pickerSearch.node.value),allowed=allowedUniforms(),t=currentTotals();pickerList.replaceChildren();let family='',shown=0;
 for(const u of D.uniforms){if(allowed&&!allowed.has(u.id)&&!draft.items.has(u.id))continue;if(q&&!fold(u.name+' '+u.category).includes(q))continue;if(u.family!==family){family=u.family;pickerList.append(el('p','uniforms-family',family))}
  const label=el('label','profiles-choice uniforms-option'),check=el('input');check.type='checkbox';check.value=u.id;check.checked=draft.items.has(u.id);check.onchange=()=>{if(check.checked)draft.items.set(u.id,{quantity:'1',price:moneyInput(data.stock[u.id]?.price)});else draft.items.delete(u.id);renderItems()};
  const info=t[u.id].configured||t[u.id].balance!==0?'Saldo '+available(u.id,t):'Estoque não configurado';label.append(check,el('span',null,u.name),el('small',null,info));pickerList.append(label);shown++}
 if(!shown)pickerList.append(el('p','profiles-note',allowed?'Nenhum uniforme desta movimentação corresponde à busca.':'Nenhum uniforme encontrado.'))}
function renderReference(){reference.replaceChildren();const c=collaboratorById(collab.node.value);if(!c)return;const ref=referenceFor(c);const box=el('div','uniforms-reference-box');
 if(!ref){box.append(el('p','profiles-note','Cargo do colaborador não encontrado no cadastro de Cargos; sem referência de uniformes.'));reference.append(box);return}
 box.append(el('b',null,'Referência do cargo '+ref.job.name));
 if(!ref.items.length){box.append(el('p','profiles-note','Nenhuma quantidade de referência configurada para este cargo. Configure em Referência por Cargo.'));reference.append(box);return}
 const list=el('ul','uniforms-reference-list');for(const r of ref.items){const li=el('li');li.append(el('span',null,uniformName(r.uniformId)),el('small',null,'Previsto '+r.quantity+' · com o colaborador '+Math.max(S.held(data.movements,c.id,r.uniformId),0)));list.append(li)}box.append(list);
 if(typeField.node.value!=='DEVOLVIDO')box.append(button('Selecionar itens previstos',()=>{for(const r of ref.items)if(!draft.items.has(r.uniformId)&&uniformById.has(r.uniformId))draft.items.set(r.uniformId,{quantity:String(r.quantity),price:moneyInput(data.stock[r.uniformId]?.price)});renderPicker();renderItems()}));reference.append(box)}
function renderItems(){items.replaceChildren();const type=typeField.node.value,priced=type==='VENDIDO',isReturn=type==='DEVOLVIDO';
 if(!draft.items.size){items.append(el('p','profiles-note','Nenhum uniforme selecionado. Cada uniforme escolhido recebe sua própria quantidade.'));return}
 const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table uniforms-items-table'),thead=el('thead'),hr=el('tr');for(const h of ['Uniforme',isReturn?'Limite de devolução':'Saldo disponível','Quantidade',...(priced?['Valor unitário','Subtotal']:[]),''])hr.append(el('th',null,h));thead.append(hr);table.append(thead);const tbody=el('tbody'),t=currentTotals();
 const total=el('output','uniforms-total');
 function refreshTotal(){let sum=0,missing=false;for(const [,v] of draft.items){const p=cents(v.price),q=Number(v.quantity);if(p&&Number.isInteger(q)&&q>0)sum+=p*q;else missing=true}total.textContent='Valor total da venda: '+money(sum)+(missing?' (itens sem valor ou quantidade)':'')}
 for(const [id,v] of draft.items){const tr=el('tr');tr.append(el('td',null,uniformName(id)));const limit=isReturn?(collab.node.value?returnLimit(id):0):available(id,t);tr.append(el('td',null,isReturn?String(Math.max(limit,0)):t[id].configured||limit>0?String(Math.max(limit,0)):'Não configurado'));
  const qtd=el('input');qtd.type='number';qtd.min='1';qtd.step='1';qtd.inputMode='numeric';qtd.value=v.quantity;qtd.setAttribute('aria-label','Quantidade de '+uniformName(id));qtd.addEventListener('keydown',e=>{if(['e','E','+','-','.',','].includes(e.key))e.preventDefault()});const qCell=el('td');qCell.append(qtd);tr.append(qCell);
  let sub;if(priced){const price=el('input');price.type='text';price.inputMode='numeric';price.dataset.money='true';price.placeholder='R$ 0,00';price.value=v.price;price.setAttribute('aria-label','Valor unitário de '+uniformName(id));const pCell=el('td');pCell.append(price);tr.append(pCell);sub=el('td','uniforms-num');tr.append(sub);price.addEventListener('input',()=>{v.price=price.value;paintSub()})}
  function paintSub(){if(!sub)return;const p=cents(v.price),q=Number(v.quantity);sub.textContent=p&&Number.isInteger(q)&&q>0?money(p*q):'—';refreshTotal()}
  qtd.addEventListener('input',()=>{v.quantity=qtd.value;paintSub()});paintSub();
  const rm=el('td');rm.append(iconButton('Remover '+uniformName(id),ICON.trash,()=>{draft.items.delete(id);renderPicker();renderItems()},'is-danger'));tr.append(rm);tbody.append(tr)}
 table.append(tbody);wrap.append(table);items.append(wrap);if(priced){refreshTotal();items.append(total);if([...draft.items.keys()].some(id=>!Number.isInteger(data.stock[id]?.price)))items.append(el('p','profiles-note','Valores unitários sem cadastro podem ser informados aqui; configure o preço padrão em Controle de Estoque.'))}}
function renderForm(){if(!dateInput.value)dateInput.value=today();renderCollaborators();renderCollaboratorInfo();renderOrigins();renderPicker();renderReference();renderItems();saveButton.disabled=loadError}
collabSearch.node.addEventListener('input',renderCollaborators);
collab.node.addEventListener('change',()=>{renderCollaboratorInfo();renderOrigins();renderPicker();renderReference();renderItems()});
typeField.node.addEventListener('change',()=>{renderOrigins();renderPicker();renderReference();renderItems()});
origin.node.addEventListener('change',()=>{const allowed=allowedUniforms();if(allowed)for(const id of [...draft.items.keys()])if(!allowed.has(id))draft.items.delete(id);renderPicker();renderItems()});
pickerSearch.node.addEventListener('input',renderPicker);

form.onsubmit=e=>{e.preventDefault();formError.textContent='';formStatus.textContent='';
 const c=collaboratorById(collab.node.value),own=editingMovement(),type=typeField.node.value;
 const movement={id:own?.id||newId(),date:dateInput.value,collaboratorId:collab.node.value,collaboratorName:c?.name||own?.collaboratorName||'',collaboratorActive:c?c.active:own?.collaboratorActive??true,jobName:c?(jobFor(c)?.name||c.jobName||''):own?.jobName||'',type,returnOf:type==='DEVOLVIDO'&&origin.node.value?origin.node.value:null,
  items:[...draft.items].map(([uniformId,v])=>({uniformId,quantity:Number(v.quantity),...(type==='VENDIDO'?{unitPrice:cents(v.price)}:{}),...(type==='DEVOLVIDO'&&origin.node.value?{returnOf:origin.node.value}:{})})),
  status:own?'CORRIGIDO':'ATIVO',createdAt:own?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),revisions:own?[...(own.revisions||[]),{at:new Date().toISOString(),previous:{date:own.date,collaboratorName:own.collaboratorName,type:own.type,items:own.items,status:own.status}}]:[]};
 const errors=S.validateMovement(movement,data,D.uniforms);if(errors.length){formError.textContent=errors.map(x=>x.message).join(' ');return}
 if(!transact(()=>{data.movements=[...data.movements.filter(m=>m.id!==movement.id),movement]})){formError.textContent='Não foi possível salvar neste navegador. O formulário foi mantido.';return}
 const message=(own?'Lançamento corrigido':'Lançamento salvo')+': '+movement.type+' · '+movement.items.map(i=>uniformName(i.uniformId)+' ×'+i.quantity).join(', ')+'.';resetForm();renderHistory();formStatus.textContent=message};

function editMovement(m){if(m.status==='CANCELADO')return;selectTab('launch');draft={editingId:m.id,items:new Map(m.items.map(i=>[i.uniformId,{quantity:String(i.quantity),price:moneyInput(i.unitPrice)}]))};formTitle.textContent='Editar lançamento de '+dateBR(m.date);dateInput.value=m.date;collabSearch.node.value='';collab.node.value='';renderCollaborators();collab.node.value=m.collaboratorId;if(collab.node.value!==m.collaboratorId){collab.node.add(new Option(m.collaboratorName+' (preservado)',m.collaboratorId));collab.node.value=m.collaboratorId}typeField.node.value=m.type;renderForm();if(m.type==='DEVOLVIDO'){origin.node.value=m.returnOf||'';renderPicker();renderItems()}formError.textContent='';formStatus.textContent='Editando: ao salvar, o lançamento fica marcado como corrigido e a versão anterior é preservada nos detalhes.';form.scrollIntoView({block:'start',behavior:'smooth'});dateInput.focus({preventScroll:true})}

/* ---------- Seção 1: histórico ---------- */
const historyStatus=el('p','profiles-note');historyStatus.setAttribute('role','status');const historyTable=el('div','uniforms-table-wrap');
history.append(el('h3','uniforms-heading','Histórico de lançamentos'),historyStatus,historyTable);
function collaboratorActive(m){const c=collaboratorById(m.collaboratorId);return c?c.active:m.collaboratorActive!==false}
function renderHistory(){historyTable.replaceChildren();
 const list=[...data.movements].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
 historyStatus.textContent=list.length?list.length+' lançamento(s), do mais recente ao mais antigo.':'Nenhum lançamento registrado.';
 if(!list.length)return;
 const table=el('table','uniforms-table'),thead=el('thead'),hr=el('tr');for(const h of ['Data','Colaborador','Situação','Cargo','Tipo','Uniforme','Qtd.','Valor da venda','Status','Ações'])hr.append(el('th',null,h));thead.append(hr);table.append(thead);const tbody=el('tbody');
 for(const m of list){const tr=el('tr');if(m.status==='CANCELADO')tr.classList.add('is-cancelled');const active=collaboratorActive(m);
  const pill=(text,cls)=>{const td=el('td');td.append(el('span','pill '+cls,text));return td};
  const uniformsCell=el('td','uniforms-lines'),qtyCell=el('td','uniforms-lines uniforms-num');for(const i of m.items){uniformsCell.append(el('span',null,uniformName(i.uniformId)));qtyCell.append(el('span',null,String(i.quantity)))}
  const [statusText,statusCls]=STATUS[m.status]||[m.status,''];
  tr.append(el('td',null,dateBR(m.date)),el('td',null,m.collaboratorName),pill(active?'Ativo':'Inativo',active?'p-green':'p-red'),el('td',null,m.jobName||'—'),el('td',null,typeLabel(m.type)),uniformsCell,qtyCell,el('td','uniforms-num',m.type==='VENDIDO'?money(S.saleTotal(m)):'—'),pill(statusText,statusCls));
  const actions=el('td','uniforms-row-actions');actions.append(iconButton('Visualizar detalhes',ICON.eye,()=>showDetails(m)));if(m.status!=='CANCELADO')actions.append(iconButton('Editar lançamento',ICON.edit,()=>editMovement(m),'is-accent'),iconButton('Cancelar lançamento',ICON.ban,()=>cancelMovement(m)));actions.append(iconButton('Excluir lançamento',ICON.trash,()=>deleteMovement(m),'is-danger'));tr.append(actions);tbody.append(tr)}
 table.append(tbody);historyTable.append(table)}
function describe(m){return dateBR(m.date)+' · '+m.collaboratorName+' · '+m.type+' · '+m.items.map(i=>uniformName(i.uniformId)+' ×'+i.quantity).join(', ')}
/* Every change outside the form is simulated first, so deletions and stock edits cannot break balances or linked returns. */
function guarded(change,okMessage,show=m=>{formStatus.textContent=m}){const next=structuredClone(data);change(next);const errors=S.integrity(next,D.uniforms);if(errors.length)return errors.map(e=>e.message).join(' ');if(!transact(()=>change(data)))return 'Não foi possível salvar neste navegador.';if(draft.editingId&&!data.movements.some(m=>m.id===draft.editingId&&m.status!=='CANCELADO'))resetForm();show(okMessage);return null}
function deleteMovement(m){confirmDialog('Excluir lançamento?','O lançamento '+describe(m)+' será removido do histórico e o estoque recalculado. Esta ação não pode ser desfeita. Para manter o registro, use Cancelar lançamento.','Confirmar exclusão',()=>guarded(d=>{d.movements=d.movements.filter(x=>x.id!==m.id)},'Lançamento excluído e estoque recalculado.'))}
function cancelMovement(m){confirmDialog('Cancelar lançamento?','O lançamento '+describe(m)+' continuará no histórico como cancelado e deixará de afetar o estoque.','Confirmar cancelamento',()=>guarded(d=>{const x=d.movements.find(y=>y.id===m.id);x.revisions=[...(x.revisions||[]),{at:new Date().toISOString(),previous:{status:x.status},action:'Cancelado'}];x.status='CANCELADO';x.updatedAt=new Date().toISOString()},'Lançamento cancelado; estoque recalculado.'))}
function showDetails(m){dialog('Detalhes do lançamento',(f,form)=>{const dl=el('dl','profiles-info');const [statusText]=STATUS[m.status]||[m.status];const origin=m.returnOf?data.movements.find(x=>x.id===m.returnOf):null;
 for(const [k,v] of [['Data',dateBR(m.date)],['Colaborador',m.collaboratorName],['Situação do colaborador',collaboratorActive(m)?'Ativo':'Inativo'],['Cargo',m.jobName||'Não informado'],['Tipo',m.type],['Status',statusText],...(m.type==='DEVOLVIDO'?[['Origem',origin?describe(origin):m.returnOf?'Movimentação removida':'Sem vínculo']]:[]),['Registrado em',new Date(m.createdAt).toLocaleString('pt-BR')],['Última alteração',new Date(m.updatedAt).toLocaleString('pt-BR')]])dl.append(el('dt',null,k),el('dd',null,v));form.append(dl);
 const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Uniforme','Quantidade',...(m.type==='VENDIDO'?['Valor unitário','Subtotal']:[])])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');for(const i of m.items){const tr=el('tr');tr.append(el('td',null,uniformName(i.uniformId)),el('td','uniforms-num',String(i.quantity)));if(m.type==='VENDIDO')tr.append(el('td','uniforms-num',money(i.unitPrice)),el('td','uniforms-num',money(i.unitPrice*i.quantity)));tbody.append(tr)}table.append(thead,tbody);wrap.append(table);form.append(wrap);if(m.type==='VENDIDO')form.append(el('p','uniforms-total','Valor total da venda: '+money(S.saleTotal(m))));
 if(m.revisions?.length){form.append(el('h3','uniforms-heading','Histórico de alterações'));const ul=el('ul','uniforms-reference-list');for(const r of m.revisions){const li=el('li');const p=r.previous||{};li.append(el('span',null,new Date(r.at).toLocaleString('pt-BR')+' — '+(r.action||'Corrigido')),el('small',null,r.action?'Situação anterior: '+(STATUS[p.status]?.[0]||p.status):'Versão anterior: '+dateBR(p.date)+' · '+p.collaboratorName+' · '+p.type+' · '+(p.items||[]).map(i=>uniformName(i.uniformId)+' ×'+i.quantity).join(', ')));ul.append(li)}form.append(ul)}})}

/* ---------- Seção 2: controle de estoque ---------- */
const stockPanel=tabPanels.stock;
/* 56 items: one simple name search behind the shared magnifier, no filter panel. */
const sText=field('Buscar uniforme',el('input'),'uniforms-simple-search');sText.node.type='search';sText.node.placeholder='Nome do uniforme…';sText.node.addEventListener('input',()=>renderStock());
const stockStatus=el('p','profiles-note');stockStatus.setAttribute('role','status');const stockTable=el('div','uniforms-table-wrap');
stockPanel.append(el('h3','uniforms-heading','Controle de estoque'),el('p','profiles-note','Saldo = estoque inicial + compras + devoluções − vendas − entregas − descartes. Lançamentos e compras cancelados não entram no cálculo.'),sText.label,stockStatus,stockTable);
let stockFlash='';
function renderStock(){stockTable.replaceChildren();const t=currentTotals(),q=fold(sText.node.value);
 const list=D.uniforms.filter(u=>!q||fold(u.name).includes(q));
 const configured=D.uniforms.filter(u=>t[u.id].configured).length,total=D.uniforms.reduce((n,u)=>n+t[u.id].balance,0);stockStatus.textContent=(stockFlash?stockFlash+' ':'')+list.length+' de '+D.uniforms.length+' uniformes · '+configured+' com estoque inicial configurado · saldo total '+total+' peça(s).';stockFlash='';
 const table=el('table','uniforms-table'),thead=el('thead'),hr=el('tr');for(const h of ['Uniforme','Categoria','Estoque inicial','Comprados','Vendidos','Entregues','Devolvidos','Descartados','Saldo atual','Valor unitário',''])hr.append(el('th',null,h));thead.append(hr);table.append(thead);const tbody=el('tbody');
 for(const u of list){const x=t[u.id],tr=el('tr');const initial=el('td','uniforms-num');if(x.configured)initial.textContent=String(x.initial);else initial.append(el('span','uniforms-unset','Não configurado'));const price=el('td','uniforms-num');if(Number.isInteger(data.stock[u.id]?.price))price.textContent=money(data.stock[u.id].price);else price.append(el('span','uniforms-unset','Não configurado'));
  const balance=el('td','uniforms-num uniforms-balance',String(x.balance));if(x.balance<=0)balance.classList.add('is-empty');
  tr.append(el('td',null,u.name),el('td',null,u.category),initial,el('td','uniforms-num',String(x.COMPRADO)),el('td','uniforms-num',String(x.VENDIDO)),el('td','uniforms-num',String(x.ENTREGUE)),el('td','uniforms-num',String(x.DEVOLVIDO)),el('td','uniforms-num',String(x.DESCARTADO)),balance,price);
  const actions=el('td','uniforms-row-actions');actions.append(iconButton('Configurar '+u.name,ICON.edit,()=>configureStock(u),'is-accent'));tr.append(actions);tbody.append(tr)}
 table.append(tbody);stockTable.append(table);if(!list.length)stockTable.append(el('p','profiles-empty','Nenhum uniforme corresponde à busca.'))}
function configureStock(u){dialog('Configurar '+u.name,f=>{const current=data.stock[u.id]||{};const initial=f('Estoque inicial',el('input'));initial.type='number';initial.min='0';initial.step='1';initial.inputMode='numeric';initial.placeholder='Não configurado';initial.value=Number.isInteger(current.initial)?String(current.initial):'';const price=f('Valor unitário de venda',el('input'));price.type='text';price.inputMode='numeric';price.dataset.money='true';price.placeholder='Não configurado';price.value=moneyInput(current.price);return {initial,price}},({initial,price})=>{
 const raw=initial.value.trim();if(raw!==''&&!/^\d+$/.test(raw))return 'Estoque inicial deve ser um número inteiro a partir de 0, ou vazio para não configurado.';const value=raw===''?null:Number(raw),unit=price.value.trim()?cents(price.value):null;if(price.value.trim()&&!unit)return 'Informe um valor unitário maior que zero, ou deixe vazio.';
 return guarded(d=>{d.stock[u.id]={initial:value,price:unit}},'Estoque de '+u.name+' atualizado.',m=>{stockFlash=m})})}

/* ---------- Seção 3: referência por cargo ---------- */
const refPanel=tabPanels.reference;let refJob='';
const rBox=el('div','form-fields uniforms-selector');
const rEnum=enumField('Cargo','Buscar cargo por nome ou CBO','uniforms-wide'),rSearch={node:rEnum.search},rJob={node:rEnum.select};rBox.append(rEnum.label);
const rContent=el('div','uniforms-reference-editor'),rOverview=el('div','uniforms-table-wrap');
refPanel.append(el('h3','uniforms-heading','Referência por cargo'),el('p','profiles-note','Quantidades previstas de cada uniforme por cargo do cadastro de Cargos. Nenhuma quantidade é sugerida automaticamente.'),rBox,rContent,el('h3','uniforms-heading','Cargos com referência configurada'),rOverview);
function jobsWithStored(){const list=jobCatalog();for(const [key,ref] of Object.entries(data.references))if(!list.some(j=>j.key===key))list.push({key,name:(ref.jobName||key)+' (cargo preservado)',full:ref.jobName||'',cbo:''});return list}
function renderJobSelect(){const q=fold(rSearch.node.value);rJob.node.replaceChildren(new Option('Selecione o cargo',''));for(const j of jobsWithStored())if(j.key===refJob||fold(j.name+' '+j.full+' '+j.cbo).includes(q))rJob.node.add(new Option(j.name+(j.full&&j.full!==j.name?' · '+j.full:'')+(j.cbo?' · CBO '+j.cbo:''),j.key));rJob.node.value=refJob}
rSearch.node.addEventListener('input',renderJobSelect);rJob.node.addEventListener('change',()=>{refJob=rJob.node.value;renderReferenceEditor()});
function renderReferences(){renderJobSelect();renderReferenceEditor();renderOverview()}
function renderReferenceEditor(){rContent.replaceChildren();if(refStatus){const s=el('p','profiles-note',refStatus);s.setAttribute('role','status');rContent.append(s);refStatus=''}if(!refJob){rContent.append(el('p','profiles-empty','Selecione um cargo para consultar ou configurar os uniformes previstos.'));return}const job=jobsWithStored().find(j=>j.key===refJob),ref=data.references[refJob]?.items||[];
 if(ref.length){const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Uniforme','Categoria','Quantidade prevista',''])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
  for(const r of ref){const tr=el('tr');tr.append(el('td',null,uniformName(r.uniformId)),el('td',null,uniformById.get(r.uniformId)?.category||'—'),el('td','uniforms-num',String(r.quantity)));const a=el('td','uniforms-row-actions');a.append(iconButton('Editar quantidade',ICON.edit,()=>referenceDialog(job,r),'is-accent'),iconButton('Remover referência',ICON.trash,()=>confirmDialog('Remover referência?',uniformName(r.uniformId)+' deixará de ser previsto para '+job.name+'.','Confirmar remoção',()=>saveReference(job,d=>{d.items=d.items.filter(x=>x.uniformId!==r.uniformId)},'Referência removida.')),'is-danger'));tr.append(a);tbody.append(tr)}
  table.append(thead,tbody);wrap.append(table);rContent.append(wrap)}else rContent.append(el('p','profiles-note','Nenhum uniforme previsto para '+job.name+'.'));
 rContent.append(button('+ Adicionar uniforme previsto',()=>referenceDialog(job),'btn'))}
let refStatus='';
function saveReference(job,change,message){const ok=transact(()=>{const ref=data.references[job.key]||{jobName:job.full||job.name,items:[]};change(ref);if(ref.items.length)data.references[job.key]=ref;else delete data.references[job.key]});if(!ok)return 'Não foi possível salvar neste navegador.';refStatus=message;return null}
function referenceDialog(job,existing){dialog(existing?'Editar referência':'Uniforme previsto para '+job.name,(f,form)=>{const pick=enumField('Uniforme','Buscar uniforme'),search=pick.search,select=pick.select;form.append(pick.label);const used=new Set((data.references[job.key]?.items||[]).map(r=>r.uniformId));function options(){const q=fold(search.value),cur=select.value||existing?.uniformId||'';select.replaceChildren(new Option('Selecione o uniforme',''));for(const u of D.uniforms)if(u.id===cur||(!used.has(u.id)&&fold(u.name).includes(q)))select.add(new Option(u.name,u.id));select.value=cur}options();search.oninput=options;if(existing){search.disabled=true;select.disabled=true}
 const qty=f('Quantidade prevista',el('input'));qty.type='number';qty.min='1';qty.step='1';qty.inputMode='numeric';qty.value=existing?String(existing.quantity):'';return {select,qty}},({select,qty})=>{const uniformId=existing?.uniformId||select.value,n=Number(qty.value);if(!uniformById.has(uniformId))return 'Selecione o uniforme.';if(!Number.isInteger(n)||n<1)return 'Informe uma quantidade inteira a partir de 1.';
 return saveReference(job,ref=>{const row=ref.items.find(r=>r.uniformId===uniformId);if(row)row.quantity=n;else ref.items.push({uniformId,quantity:n})},'Referência salva.')})}
function renderOverview(){rOverview.replaceChildren();const entries=Object.entries(data.references).filter(([,r])=>r.items?.length);if(!entries.length){rOverview.append(el('p','profiles-note','Nenhum cargo com referência configurada.'));return}const jobs=jobsWithStored();const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Cargo','Uniformes previstos','Total de peças',''])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const [key,r] of entries){const job=jobs.find(j=>j.key===key);const tr=el('tr');tr.append(el('td',null,job?.name||r.jobName),el('td','uniforms-num',String(r.items.length)),el('td','uniforms-num',String(r.items.reduce((n,i)=>n+i.quantity,0))));const a=el('td','uniforms-row-actions');a.append(iconButton('Abrir referência de '+(job?.name||r.jobName),ICON.eye,()=>{refJob=key;rSearch.node.value='';renderReferences();rJob.node.focus()}));tr.append(a);tbody.append(tr)}table.append(thead,tbody);rOverview.append(table)}

/* ---------- Entrada ---------- */
function showUniforms(tab='launch',opts={}){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Uniformes';load();resetForm();selectTab(tabButtons[tab]?tab:'launch');if(opts.collaboratorId){collab.node.value=opts.collaboratorId;collab.node.dispatchEvent(new Event('change'))}normalizeHeaderActions(view)}
window.showUniforms=showUniforms;
/* Shared with Compras de Uniformes: one store, one set of components. */
window.CicluzUniformStore={load,transact,get:()=>data,failed:()=>loadError};
window.CicluzUniformUI={openExternal,el,button,iconButton,svg,ICON,fold,newId,money,moneyInput,cents,dateBR,today,enumField,dialog,confirmDialog,uniformName,STATUS};
window.addEventListener('storage',e=>{if(e.key===KEY){load();if(view.classList.contains('show'))renderTab()}});
})();
