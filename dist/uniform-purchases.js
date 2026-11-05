/* Lançamentos de Compras de Uniformes: purchases enter the same simulated stock as Lançamentos de Uniformes. */
(()=>{
'use strict';
const D=window.CicluzUniformData,S=window.CicluzUniformStock,store=window.CicluzUniformStore,U=window.CicluzUniformUI;if(!D||!S||!store||!U)return;
const {el,button,iconButton,svg,ICON,fold,newId,money,moneyInput,cents,dateBR,today,enumField,dialog,confirmDialog,uniformName,STATUS}=U;
const ACCENT='#7c3aed',PATH='Lançamentos / Gestão de Pessoas / Lançamentos de Compras de Uniformes',CART='M3 4h2l2 11h11l3-8H6M9 20h.01M17 20h.01';
const data=()=>store.get(),uniformIds=D.uniforms.map(u=>u.id),uniformById=new Map(D.uniforms.map(u=>[u.id,u]));

/* Supplier source: empty until the registry exists; the database will replace this function. */
function suppliers(){return D.suppliers||[]}
function supplierName(id){return suppliers().find(s=>s.id===id)?.name||''}

/* DD/MM/AAAA typing with ISO values for storage. */
const maskDate=v=>{const d=String(v||'').replace(/\D/g,'').slice(0,8);return d.slice(0,2)+(d.length>2?'/'+d.slice(2,4):'')+(d.length>4?'/'+d.slice(4):'')};
const parseDate=v=>{const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v||'');if(!m)return '';const iso=m[3]+'-'+m[2]+'-'+m[1];return S.validDate(iso)?iso:''};
function dateField(name){const l=el('label',null,name),input=el('input');input.type='text';input.inputMode='numeric';input.maxLength=10;input.placeholder='DD/MM/AAAA';input.autocomplete='off';input.setAttribute('aria-label',name.replace(/\s*\*$/,''));input.addEventListener('input',()=>{input.value=maskDate(input.value);input.setCustomValidity('')});input.addEventListener('blur',()=>{input.setCustomValidity(input.value&&!parseDate(input.value)?'Informe uma data válida no formato DD/MM/AAAA.':'')});l.append(input);return {label:l,node:input,iso:()=>parseDate(input.value),set:iso=>{input.value=dateBR(iso)==='—'?'':dateBR(iso)}}}

/* Brazilian phone: (DD) 9XXXX-XXXX mobile or (DD) XXXX-XXXX landline. */
const phoneDigits=v=>String(v||'').replace(/\D/g,'').slice(0,11);
function maskPhone(v){const d=phoneDigits(v);if(!d)return '';if(d.length<3)return '('+d;const ddd='('+d.slice(0,2)+') ',rest=d.slice(2);if(d.length<=10)return ddd+rest.slice(0,4)+(rest.length>4?'-'+rest.slice(4):'');return ddd+rest.slice(0,5)+'-'+rest.slice(5)}
function phoneValid(v){const d=phoneDigits(v);if(!/^[1-9][1-9]/.test(d))return false;return d.length===11?d[2]==='9':d.length===10&&/[2-5]/.test(d[2])}

const view=el('section','view');view.id='uniform-purchases-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(CART);const heading=el('div');heading.append(el('h2',null,'Lançamentos de Compras de Uniformes'),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>openSection(sections[8][0],'Gestão de Pessoas','forms',ACCENT));
const addButton=button('',()=>{resetForm();formStatus.textContent='';dateIn.node.focus()},'shortcut-circle');addButton.title='Nova compra';addButton.setAttribute('aria-label','Nova compra');addButton.innerHTML=svg(ICON.plus);head.querySelector('.shortcut-actions').append(addButton);
const loadNote=el('p','profiles-error');loadNote.setAttribute('role','alert');
body.append(el('div','form-note','Simulação local: compras ficam somente neste navegador e entram no mesmo estoque de Lançamentos de Uniformes. Sem fornecedores cadastrados por enquanto.'),loadNote);

/* ---------- Formulário ---------- */
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const formTitle=el('h3','uniforms-wide uniforms-heading','Nova compra');
const dateIn=dateField('Data da compra *');
const sup=enumField('Tipo de fornecedor','Buscar fornecedor');
const phoneLabel=el('label','uniforms-phone');phoneLabel.append(el('span','uniforms-enum-label','Contato WhatsApp'));const phone=el('input');phone.type='tel';phone.inputMode='tel';phone.placeholder='(32) 99999-9999';phone.maxLength=15;phone.autocomplete='tel';phone.setAttribute('aria-label','Contato WhatsApp');
const whatsapp=button('Abrir WhatsApp',()=>{if(phoneValid(phone.value))U.openExternal('https://wa.me/55'+phoneDigits(phone.value))});whatsapp.title='Abrir conversa no WhatsApp sem enviar mensagem';phoneLabel.append(phone,whatsapp);
const phoneHint=el('small','profiles-note');phoneLabel.append(phoneHint);
function paintPhone(){const filled=!!phoneDigits(phone.value),ok=phoneValid(phone.value);whatsapp.disabled=!ok;phoneHint.textContent=filled&&!ok?'Número incompleto ou inválido. Use DDD + número, ex.: (32) 99999-9999.':'';phone.setCustomValidity(filled&&!ok?'Número de WhatsApp inválido.':'')}
phone.addEventListener('input',()=>{phone.value=maskPhone(phone.value);paintPhone()});
const picker=el('div','uniforms-wide uniforms-picker');const pickLabel=el('label',null,'Uniformes * — buscar e selecionar'),pickSearch=el('input');pickSearch.type='search';pickSearch.placeholder='Buscar uniforme…';pickSearch.setAttribute('aria-label','Buscar uniforme');pickLabel.append(pickSearch);const pickList=el('div','uniforms-options');pickList.setAttribute('role','group');pickList.setAttribute('aria-label','Uniformes');picker.append(pickLabel,pickList);
const items=el('div','uniforms-wide uniforms-items');
const formError=el('p','uniforms-wide profiles-error');formError.setAttribute('role','alert');const formStatus=el('p','uniforms-wide profiles-note');formStatus.setAttribute('role','status');
const actions=el('div','uniforms-wide actions');const save=el('button','btn','Salvar Compra');save.type='submit';actions.append(button('Cancelar',()=>{resetForm();formStatus.textContent='Compra descartada.'}),save);
form.append(formTitle,dateIn.label,sup.label,phoneLabel,picker,items,formError,formStatus,actions);
const history=el('div','uniforms-history');body.append(form,history);

let draft={editingId:null,items:new Map()},duplicateOk='';
function editing(){return draft.editingId?data().purchases.find(p=>p.id===draft.editingId):null}
function renderSuppliers(){const list=suppliers(),q=fold(sup.search.value),cur=sup.select.value;sup.select.replaceChildren();if(!list.length){sup.select.add(new Option('Nenhum fornecedor cadastrado',''));return}sup.select.add(new Option('Sem fornecedor',''));for(const s of list)if(s.id===cur||fold(s.name).includes(q))sup.select.add(new Option(s.name,s.id));
 const own=editing();if(own?.supplierId&&!list.some(s=>s.id===own.supplierId)&&own.supplierId===cur)sup.select.add(new Option(own.supplierName+' (preservado)',own.supplierId));sup.select.value=cur}
sup.search.addEventListener('input',renderSuppliers);
function totalsNow(){return S.totals(data(),uniformIds)}
/* Balance without this purchase, so editing shows the real effect. */
function before(id,t){const own=editing();let n=t[id].balance;if(own&&own.status!=='CANCELADO')for(const i of own.items)if(i.uniformId===id)n-=i.quantity;return n}
function renderPicker(){const q=fold(pickSearch.value),t=totalsNow();pickList.replaceChildren();let family='',shown=0;for(const u of D.uniforms){if(q&&!fold(u.name+' '+u.category).includes(q))continue;if(u.family!==family){family=u.family;pickList.append(el('p','uniforms-family',family))}const label=el('label','profiles-choice uniforms-option'),check=el('input');check.type='checkbox';check.checked=draft.items.has(u.id);check.onchange=()=>{if(check.checked)draft.items.set(u.id,{quantity:'1',price:''});else draft.items.delete(u.id);renderItems()};label.append(check,el('span',null,u.name),el('small',null,'Saldo '+before(u.id,t)));pickList.append(label);shown++}if(!shown)pickList.append(el('p','profiles-note','Nenhum uniforme encontrado.'))}
pickSearch.addEventListener('input',renderPicker);
const qtyOf=v=>{const n=Number(v.quantity);return /^\d+$/.test(String(v.quantity).trim())&&n>=1?n:null};
function renderItems(){items.replaceChildren();if(!draft.items.size){items.append(el('p','profiles-note','Nenhum uniforme selecionado. Cada uniforme recebe sua própria quantidade e valor unitário.'));return}
 const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table uniforms-items-table'),hr=el('tr');for(const h of ['Uniforme','Saldo atual','Quantidade','Valor unitário','Subtotal','Saldo após a compra',''])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody'),t=totalsNow();
 const summary=el('div','uniforms-purchase-total'),totalQty=el('span'),totalValue=el('output','uniforms-total');totalValue.setAttribute('aria-label','Valor total da compra');summary.append(totalQty,totalValue);
 function refresh(){let q=0,sum=0,missing=false;for(const [,v] of draft.items){const n=qtyOf(v),p=cents(v.price);if(n)q+=n;if(n&&p)sum+=n*p;else missing=true}totalQty.textContent='Quantidade total: '+q+' peça(s)';totalValue.textContent='Valor total da compra: '+money(sum)+(missing?' (itens sem quantidade ou valor)':'')}
 for(const [id,v] of draft.items){const tr=el('tr'),base=before(id,t);tr.append(el('td',null,uniformName(id)),el('td','uniforms-num',String(base)));
  const qty=el('input');qty.type='number';qty.min='1';qty.step='1';qty.inputMode='numeric';qty.value=v.quantity;qty.setAttribute('aria-label','Quantidade de '+uniformName(id));qty.addEventListener('keydown',e=>{if(['e','E','+','-','.',','].includes(e.key))e.preventDefault()});const qc=el('td');qc.append(qty);
  const price=el('input');price.type='text';price.inputMode='numeric';price.dataset.money='true';price.placeholder='R$ 0,00';price.value=v.price;price.setAttribute('aria-label','Valor unitário de '+uniformName(id));const pc=el('td');pc.append(price);
  const sub=el('td','uniforms-num'),after=el('td','uniforms-num uniforms-balance');
  function paint(){const n=qtyOf(v),p=cents(v.price);sub.textContent=n&&p?money(n*p):'—';after.textContent=n?String(base+n):String(base);refresh()}
  qty.addEventListener('input',()=>{v.quantity=qty.value;paint()});price.addEventListener('input',()=>{v.price=price.value;paint()});
  const rm=el('td','uniforms-row-actions');rm.append(iconButton('Remover '+uniformName(id),ICON.trash,()=>{draft.items.delete(id);renderPicker();renderItems()},'is-danger'));
  tr.append(qc,pc,sub,after,rm);tbody.append(tr);paint()}
 table.append(thead,tbody);wrap.append(table);items.append(wrap,summary);refresh()}
function resetForm(){draft={editingId:null,items:new Map()};duplicateOk='';formTitle.textContent='Nova compra';dateIn.set(today());sup.search.value='';sup.select.value='';phone.value='';pickSearch.value='';formError.textContent='';renderSuppliers();paintPhone();renderPicker();renderItems();save.disabled=store.failed()}
const signature=p=>JSON.stringify([p.date,p.supplierId,p.whatsapp,[...p.items].sort((a,b)=>a.uniformId.localeCompare(b.uniformId)).map(i=>[i.uniformId,i.quantity,i.unitPrice])]);
form.onsubmit=e=>{e.preventDefault();formError.textContent='';formStatus.textContent='';const errors=[],own=editing(),date=dateIn.iso();
 if(!date)errors.push('Informe uma data da compra válida (DD/MM/AAAA).');
 if(phoneDigits(phone.value)&&!phoneValid(phone.value))errors.push('Número de WhatsApp inválido.');
 if(!draft.items.size)errors.push('Selecione ao menos um uniforme.');
 const list=[];for(const [id,v] of draft.items){const n=qtyOf(v),p=cents(v.price);if(!n)errors.push('Quantidade de '+uniformName(id)+' deve ser um número inteiro a partir de 1.');if(!p)errors.push('Informe o valor unitário de '+uniformName(id)+'.');list.push({uniformId:id,quantity:n,unitPrice:p})}
 if(errors.length){formError.textContent=errors.join(' ');return}
 const now=new Date().toISOString(),supplierId=sup.select.value||null;
 const purchase={id:own?.id||newId(),date,supplierId,supplierName:supplierId?supplierName(supplierId)||own?.supplierName||'':'',whatsapp:phoneDigits(phone.value),items:list,status:own?'CORRIGIDO':'ATIVO',createdAt:own?.createdAt||now,updatedAt:now,revisions:own?[...(own.revisions||[]),{at:now,previous:{date:own.date,supplierName:own.supplierName,whatsapp:own.whatsapp,items:own.items,status:own.status}}]:[]};
 /* Duplicate guard: an identical active purchase needs a second, deliberate click. */
 const sig=signature(purchase);if(!own&&duplicateOk!==sig&&data().purchases.some(p=>p.status!=='CANCELADO'&&signature(p)===sig)){duplicateOk=sig;formError.textContent='Já existe uma compra idêntica registrada nesta data. Clique em Salvar Compra novamente para registrar mesmo assim.';return}
 const message=guarded(d=>{d.purchases=[...d.purchases.filter(p=>p.id!==purchase.id),purchase]});if(message){formError.textContent=message;return}
 const t=totalsNow();const done=(own?'Compra corrigida':'Compra salva')+': '+purchase.items.map(i=>uniformName(i.uniformId)+' +'+i.quantity+' (saldo '+t[i.uniformId].balance+')').join(', ')+' · total '+money(S.saleTotal({type:'VENDIDO',items:purchase.items}))+'.';resetForm();renderHistory();formStatus.textContent=done};
/* Apply on a copy first: deleting or reducing a purchase must not leave delivered stock negative. */
function guarded(change){const next=structuredClone(data());change(next);const errors=S.integrity(next,D.uniforms);if(errors.length)return 'Não é possível salvar: '+errors.map(e=>e.message).join(' ')+' Já houve saídas usando este estoque.';return store.transact(()=>change(data()))?null:'Não foi possível salvar neste navegador.'}
function editPurchase(p){draft={editingId:p.id,items:new Map(p.items.map(i=>[i.uniformId,{quantity:String(i.quantity),price:moneyInput(i.unitPrice)}]))};duplicateOk='';formTitle.textContent='Editar compra de '+dateBR(p.date);dateIn.set(p.date);sup.search.value='';sup.select.value=p.supplierId||'';renderSuppliers();sup.select.value=p.supplierId||'';phone.value=maskPhone(p.whatsapp);paintPhone();renderPicker();renderItems();formError.textContent='';formStatus.textContent='Editando: ao salvar, a compra fica marcada como corrigida e o estoque é recalculado.';form.scrollIntoView({block:'start',behavior:'smooth'});dateIn.node.focus({preventScroll:true})}

/* ---------- Histórico ---------- */
const hStatus=el('p','profiles-note');hStatus.setAttribute('role','status');const hTable=el('div','uniforms-table-wrap');
history.append(el('h3','uniforms-heading','Histórico de compras'),hStatus,hTable);
const qtyTotal=p=>p.items.reduce((n,i)=>n+i.quantity,0),valueTotal=p=>p.items.reduce((n,i)=>n+i.quantity*i.unitPrice,0);
function renderHistory(){hTable.replaceChildren();
 const list=[...data().purchases].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
 hStatus.textContent=list.length?list.length+' compra(s), da mais recente à mais antiga.':'Nenhuma compra registrada.';
 if(!list.length)return;
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Data da compra','Fornecedor','WhatsApp','Uniformes comprados','Qtd. total','Valor total','Status','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const p of list){const tr=el('tr');if(p.status==='CANCELADO')tr.classList.add('is-cancelled');const uni=el('td','uniforms-lines');for(const i of p.items)uni.append(el('span',null,uniformName(i.uniformId)+' ×'+i.quantity));const [st,cls]=STATUS[p.status]||[p.status,''];const stc=el('td');stc.append(el('span','pill '+cls,st));
  tr.append(el('td',null,dateBR(p.date)),el('td',null,p.supplierName||'Sem fornecedor'),el('td',null,p.whatsapp?maskPhone(p.whatsapp):'—'),uni,el('td','uniforms-num',String(qtyTotal(p))),el('td','uniforms-num',money(valueTotal(p))),stc);
  const a=el('td','uniforms-row-actions');a.append(iconButton('Visualizar detalhes',ICON.eye,()=>showDetails(p)));if(p.status!=='CANCELADO')a.append(iconButton('Editar compra',ICON.edit,()=>editPurchase(p),'is-accent'),iconButton('Cancelar compra',ICON.ban,()=>cancelPurchase(p)));a.append(iconButton('Excluir compra',ICON.trash,()=>deletePurchase(p),'is-danger'));tr.append(a);tbody.append(tr)}
 table.append(thead,tbody);hTable.append(table)}
function describe(p){return dateBR(p.date)+' · '+(p.supplierName||'sem fornecedor')+' · '+p.items.map(i=>uniformName(i.uniformId)+' ×'+i.quantity).join(', ')}
function afterChange(){if(draft.editingId&&!data().purchases.some(p=>p.id===draft.editingId&&p.status!=='CANCELADO'))resetForm();renderHistory();renderPicker();renderItems()}
function deletePurchase(p){confirmDialog('Excluir compra?','A compra '+describe(p)+' será removida do histórico e o estoque recalculado. Esta ação não pode ser desfeita.','Confirmar exclusão',()=>{const m=guarded(d=>{d.purchases=d.purchases.filter(x=>x.id!==p.id)});if(!m)formStatus.textContent='Compra excluída e estoque recalculado.';return m},afterChange)}
function cancelPurchase(p){confirmDialog('Cancelar compra?','A compra '+describe(p)+' continuará no histórico como cancelada e deixará de entrar no estoque.','Confirmar cancelamento',()=>{const m=guarded(d=>{const x=d.purchases.find(y=>y.id===p.id);x.revisions=[...(x.revisions||[]),{at:new Date().toISOString(),previous:{status:x.status},action:'Cancelado'}];x.status='CANCELADO';x.updatedAt=new Date().toISOString()});if(!m)formStatus.textContent='Compra cancelada e estoque recalculado.';return m},afterChange)}
function showDetails(p){dialog('Detalhes da compra',(f,form)=>{const dl=el('dl','profiles-info');for(const [k,v] of [['Data da compra',dateBR(p.date)],['Fornecedor',p.supplierName||'Sem fornecedor'],['WhatsApp',p.whatsapp?maskPhone(p.whatsapp):'Não informado'],['Status',(STATUS[p.status]||[p.status])[0]],['Registrada em',new Date(p.createdAt).toLocaleString('pt-BR')],['Última alteração',new Date(p.updatedAt).toLocaleString('pt-BR')]])dl.append(el('dt',null,k),el('dd',null,v));form.append(dl);
 const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Uniforme','Quantidade','Valor unitário','Subtotal'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');for(const i of p.items){const tr=el('tr');tr.append(el('td',null,uniformName(i.uniformId)),el('td','uniforms-num',String(i.quantity)),el('td','uniforms-num',money(i.unitPrice)),el('td','uniforms-num',money(i.unitPrice*i.quantity)));tbody.append(tr)}table.append(thead,tbody);wrap.append(table);form.append(wrap,el('p','uniforms-total','Quantidade total: '+qtyTotal(p)+' · Valor total da compra: '+money(valueTotal(p))));
 if(p.revisions?.length){form.append(el('h3','uniforms-heading','Histórico de alterações'));const ul=el('ul','uniforms-reference-list');for(const r of p.revisions){const li=el('li'),prev=r.previous||{};li.append(el('span',null,new Date(r.at).toLocaleString('pt-BR')+' — '+(r.action||'Corrigida')),el('small',null,r.action?'Situação anterior: '+((STATUS[prev.status]||[prev.status])[0]):'Versão anterior: '+dateBR(prev.date)+' · '+(prev.supplierName||'sem fornecedor')+' · '+(prev.items||[]).map(i=>uniformName(i.uniformId)+' ×'+i.quantity+' a '+money(i.unitPrice)).join(', ')));ul.append(li)}form.append(ul)}
 form.append(button('Ver controle de estoque',()=>{form.closest('dialog').close();showUniforms('stock')}))})}

function showUniformPurchases(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Lançamentos de Compras de Uniformes';store.load();loadNote.textContent=store.failed()?'Não foi possível ler os dados salvos. Eles foram preservados; recarregue a página antes de alterar.':'';resetForm();formStatus.textContent='';renderHistory();normalizeHeaderActions(view)}
window.showUniformPurchases=showUniformPurchases;
window.CicluzDateBR={field:dateField,mask:maskDate,parse:parseDate};
window.CicluzPhoneBR={digits:phoneDigits,mask:maskPhone,valid:phoneValid};
window.addEventListener('storage',e=>{if(e.key==='cicluz-uniformes-v1'&&view.classList.contains('show')){store.load();renderHistory();renderPicker();renderItems()}});
})();
