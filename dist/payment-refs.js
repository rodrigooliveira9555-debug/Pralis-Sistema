/* Referências de Pagamento — structure ready to receive the official table of values per sector
   (período de teste, diárias, dobras, horas extras, vale-transporte). Nothing is pre-filled and nothing is
   calculated here: the calculation rule must be confirmed with the company before any formula is added.
   A new value for the same sector and kind starts on its own date; earlier ones stay as history. */
(()=>{
'use strict';
const U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!U||!DB)return;
const {el,button,iconButton,ICON,fold,newId,dateBR,today,money,moneyInput,cents,confirmDialog}=U;
const KEY='cicluz-referencias-pagamento-v1',ACCENT='#7c3aed',TITLE='DES - Referências de Pagamento',GROUP='Cadastros Geral Colaboradores';
const KINDS=[['trial','Período de teste','por dia'],['daily','Diária','por dia'],['double','Dobra','por dobra'],['overtime','Hora extra','por hora'],['transport','Vale-transporte','por vale']];
const kindName=k=>(KINDS.find(x=>x[0]===k)||[,k])[1],kindUnit=k=>(KINDS.find(x=>x[0]===k)||[,,''])[2];

let data={version:1,refs:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.refs))throw Error('format');data=s}loadError=false}catch{loadError=true}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
/* Value in force for a sector and kind on a day (null when the official table was not entered). */
function current(sector,kind,day=today()){load();const l=data.refs.filter(r=>!r.cancelledAt&&fold(r.sector)===fold(sector)&&r.kind===kind&&r.from<=day).sort((a,b)=>a.from.localeCompare(b.from)||a.createdAt.localeCompare(b.createdAt));return l[l.length-1]||null}
/* Sectors already used in the platform: collaborators' sector and the areas of the Ficha de Cargos. */
function knownSectors(){const set=new Map();try{window.CicluzPeople?.load();for(const p of window.CicluzPeople?.get().people||[])if(p.sector)set.set(fold(p.sector),p.sector)}catch{}
 try{const d=JSON.parse(localStorage.getItem('cicluz-job-profiles-v1')||'null');for(const a of d?.areas||[])if(a.name)set.set(fold(a.name),a.name)}catch{}return [...set.values()].sort((a,b)=>a.localeCompare(b,'pt-BR'))}

const view=el('section','view');view.id='payment-refs-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Estrutura para a tabela oficial de valores por setor (período de teste, diárias, dobras, horas extras e vale-transporte). A plataforma não traz valores e ainda não calcula pagamentos: os valores são informados pelo DP a partir da tabela oficial, e a regra de cálculo será ligada depois de confirmada com a empresa. Grupo de despesa de referência: Folha de Pagamento → Diárias e Horas Extras (nenhuma despesa é lançada daqui).'));
const warn=el('p','people-alert');warn.hidden=true;body.append(warn);
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const sector=el('input'),sectorList=el('datalist'),kind=el('select'),value=el('input'),from=DB.field('Início da vigência *'),source=el('input'),notes=el('input');
sectorList.id='payment-sector-options';sector.setAttribute('list',sectorList.id);sector.maxLength=80;KINDS.forEach(([k,n,u])=>kind.add(new Option(n+' ('+u+')',k)));value.type='text';value.inputMode='numeric';value.dataset.money='true';value.placeholder='R$ 0,00';source.maxLength=120;source.placeholder='Ex.: tabela oficial enviada pelo DP';notes.maxLength=200;
const err=el('p','uniforms-wide profiles-error'),st=el('p','uniforms-wide profiles-note');err.setAttribute('role','alert');st.setAttribute('role','status');const act=el('div','uniforms-wide actions'),save=el('button','btn','Salvar referência');save.type='submit';act.append(button('Cancelar',reset),save);
form.append(el('h3','uniforms-wide uniforms-heading','Nova referência'),lbl('Setor *',sector),sectorList,lbl('Tipo de pagamento *',kind),lbl('Valor *',value),from.label,lbl('Fonte da informação *',source,'uniforms-wide'),lbl('Observação',notes,'uniforms-wide'),err,st,act);
const listBox=el('div');body.append(form,el('h3','uniforms-heading','Referências cadastradas'),listBox);
function reset(){sector.value='';kind.value=KINDS[0][0];value.value='';from.set(today());source.value='';notes.value='';err.textContent=''}
form.onsubmit=e=>{e.preventDefault();err.textContent=st.textContent='';load();const v=cents(value.value),d=from.iso(),errs=[];if(!sector.value.trim())errs.push('Informe o setor.');if(!(Number.isInteger(v)&&v>0))errs.push('Informe o valor da tabela oficial.');if(!d)errs.push('Informe o início da vigência (DD/MM/AAAA).');if(!source.value.trim())errs.push('Informe a fonte da informação.');
 if(errs.length){err.textContent=errs.join(' ');return}
 const name=knownSectors().find(x=>fold(x)===fold(sector.value))||sector.value.trim();
 if(!transact(x=>x.refs.push({id:newId(),sector:name,kind:kind.value,valueCents:v,from:d,source:source.value.trim(),notes:notes.value.trim(),createdAt:new Date().toISOString()}))){err.textContent='Não foi possível salvar neste navegador.';return}
 const msg=kindName(kind.value)+' de '+name+': '+money(v)+' '+kindUnit(kind.value)+' a partir de '+dateBR(d)+'.';reset();render();st.textContent='Referência salva. '+msg};
function render(){load();warn.hidden=!loadError;warn.textContent='Não foi possível ler as referências salvas neste navegador. Nada será gravado para não sobrescrever os dados.';sectorList.replaceChildren(...knownSectors().map(s=>new Option(s,s)));listBox.replaceChildren();
 const list=data.refs.filter(r=>!r.cancelledAt).sort((a,b)=>a.sector.localeCompare(b.sector,'pt-BR')||a.kind.localeCompare(b.kind)||b.from.localeCompare(a.from));
 if(!list.length){listBox.append(el('p','profiles-note','Nenhuma referência cadastrada. Aguardando a tabela oficial de valores por setor.'));return}
 const t=el('table','uniforms-table'),hr=el('tr');for(const h of ['Setor','Tipo','Valor','Vigência','Fonte','Situação',''])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const r of list){const cur=current(r.sector,r.kind),tr=el('tr'),sit=el('td'),a=el('td','uniforms-row-actions');const s=r===cur||cur?.id===r.id?['Vigente','p-green']:r.from>today()?['Programada','p-yellow']:['Substituída',''];sit.append(el('span','pill '+s[1],s[0]));
  a.append(iconButton('Cancelar referência de '+r.sector,ICON.ban,()=>confirmDialog('Cancelar esta referência?',kindName(r.kind)+' de '+r.sector+' ('+money(r.valueCents)+') deixa de valer. O registro fica no histórico.','Cancelar referência',()=>transact(x=>{x.refs.find(y=>y.id===r.id).cancelledAt=new Date().toISOString()})?null:'Não foi possível salvar neste navegador.',render)));
  tr.append(el('td',null,r.sector),el('td',null,kindName(r.kind)),el('td','uniforms-num',money(r.valueCents)+' '+kindUnit(r.kind)),el('td',null,'desde '+dateBR(r.from)),el('td',null,r.source),sit,a);tb.append(tr)}t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);listBox.append(w)}
function show(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const tt=document.getElementById('title');if(tt)tt.textContent=TITLE;reset();render();normalizeHeaderActions(view)}
window.showPaymentRefs=show;
window.CicluzPaymentRefs={KINDS:KINDS.map(([k,n,u])=>({id:k,name:n,unit:u})),current,knownSectors};
})();
