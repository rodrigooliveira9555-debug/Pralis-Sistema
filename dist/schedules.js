/* Horários e Escalas — reusable models (Cadastros) linked to collaborators by id (Lançamentos).
   One model serves many people; a person's own lunch break lives on the link, never on the model.
   Links are only appended: a new link starts on its date and the earlier ones stay as history. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!P||!U||!DB)return;
const {el,button,iconButton,svg,ICON,fold,newId,dateBR,today,dialog,confirmDialog}=U;
const KEY='cicluz-jornadas-v1',ACCENT='#7c3aed';
const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],DAY_NAMES=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const SCALE_TYPES=['Dias fixos da semana','Revezamento','Outra'];
const CLOCK='M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z';

/* ---------- Data ---------- */
let data={version:1,shifts:[],scales:[],links:[],exceptions:[],sets:[],holidays:[],days:{},dayLog:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!['shifts','scales','links','exceptions'].every(k=>Array.isArray(s[k])))throw Error('format');data=s}for(const k of ['sets','holidays','dayLog'])if(!Array.isArray(data[k]))data[k]=[];if(!data.days||typeof data.days!=='object'||Array.isArray(data.days))data.days={};loadError=false}catch{loadError=true}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
const nowIso=()=>new Date().toISOString();
const shiftById=id=>data.shifts.find(s=>s.id===id),scaleById=id=>data.scales.find(s=>s.id===id);
const modelOf=l=>l.kind==='shift'?shiftById(l.modelId):scaleById(l.modelId);

/* ---------- Time arithmetic (HH:MM, crossing midnight allowed) ---------- */
const mins=t=>{const m=/^(\d{2}):(\d{2})$/.exec(t||'');return m&&+m[1]<24&&+m[2]<60?+m[1]*60+ +m[2]:null};
const span=(a,b)=>{const x=mins(a),y=mins(b);return x==null||y==null?null:(y-x+1440)%1440};
const hm=n=>n==null?'—':Math.floor(n/60)+'h'+String(n%60).padStart(2,'0');
function calc(start,end,bs,be){const work=span(start,end),brk=bs&&be?span(bs,be):0;return {work,brk,net:work==null||brk==null?null:work-brk}}
/* Errors for a start/end pair and an optional break that must sit inside it. */
function timeErrors(start,end,bs,be){const e=[];if(mins(start)==null)e.push('Informe a hora de entrada.');if(mins(end)==null)e.push('Informe a hora de saída.');if(e.length)return e;
 const work=span(start,end);if(!work)e.push('Entrada e saída não podem ser iguais.');
 if(!!bs!==!!be){e.push('Informe início e fim do intervalo, ou deixe os dois em branco.');return e}
 if(bs){const a=span(start,bs),b=span(start,be);if(mins(bs)==null||mins(be)==null)e.push('Intervalo inválido.');else if(!(a>0&&b>a&&b<work))e.push('O intervalo precisa ficar entre a entrada e a saída.')}return e}
const breakText=(bs,be)=>bs&&be?bs+' às '+be+' ('+hm(span(bs,be))+')':'Sem intervalo';
const shiftText=s=>s?s.start+' às '+s.end+' · intervalo '+breakText(s.breakStart,s.breakEnd):'—';
/* Days as text: consecutive weekdays collapse ("Seg a Sáb"). */
function daysText(days){const d=[...new Set(days)].sort((a,b)=>a-b);if(!d.length)return 'Nenhum dia';if(d.length===7)return 'Todos os dias';
 const runs=[];for(const x of d){const r=runs[runs.length-1];if(r&&x===r[1]+1)r[1]=x;else runs.push([x,x])}return runs.map(([a,b])=>a===b?DAYS[a]:b===a+1?DAYS[a]+', '+DAYS[b]:DAYS[a]+' a '+DAYS[b]).join(', ')}
const offText=days=>daysText([0,1,2,3,4,5,6].filter(x=>!days.includes(x)));

/* ---------- Links ---------- */
const linksOf=(pid,kind)=>data.links.filter(l=>l.personId===pid&&l.kind===kind).sort((a,b)=>a.from.localeCompare(b.from)||a.createdAt.localeCompare(b.createdAt));
function current(pid,kind,day=today()){const l=linksOf(pid,kind).filter(x=>x.from<=day);return l[l.length-1]||null}
const upcoming=(pid,kind,day=today())=>linksOf(pid,kind).filter(x=>x.from>day);
/* What the person works with on a given day: the live model plus the person's own break, if any. */
function effective(pid,day=today()){const ls=current(pid,'shift',day),lc=current(pid,'scale',day),s=ls&&shiftById(ls.modelId),c=lc&&scaleById(lc.modelId);
 const own=!!(ls&&ls.breakStart);return {shiftLink:ls,scaleLink:lc,shift:s,scale:c,breakStart:own?ls.breakStart:s?.breakStart||'',breakEnd:own?ls.breakEnd:s?.breakEnd||'',ownBreak:own}}
const linkedCount=(kind,id)=>{const day=today();return new Set(data.links.filter(l=>l.kind===kind&&l.modelId===id).map(l=>l.personId).filter(pid=>current(pid,kind,day)?.modelId===id||upcoming(pid,kind,day).some(x=>x.modelId===id))).size};
const snapshotOf=(kind,m)=>kind==='shift'?{name:m.name,start:m.start,end:m.end,breakStart:m.breakStart,breakEnd:m.breakEnd}:{name:m.name,type:m.type,days:[...m.days]};
function addLinks(kind,modelId,personIds,from,brk){const m=kind==='shift'?shiftById(modelId):scaleById(modelId),at=nowIso();
 return transact(d=>{for(const pid of personIds)d.links.push({id:newId(),personId:pid,kind,modelId,from,breakStart:brk?.[0]||'',breakEnd:brk?.[1]||'',snapshot:snapshotOf(kind,m),createdAt:at})})}

/* ---------- Screen scaffolding (same structure as the other Gestão de Pessoas screens) ---------- */
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const time=()=>{const i=el('input');i.type='time';i.step=60;return i};
const views={};
function makeView(key,title,group,note){const view=el('section','view');view.id='jornada-'+key+'-view';view.style.setProperty('--menu-accent',ACCENT);
 const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
 const head=el('div','head'),heading=el('div');heading.append(el('h2',null,title),el('p',null,menuCrumb(2,group,title)));head.append(heading);
 const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
 addShortcuts(view.id,()=>menuBack(2,group)());if(note)body.append(el('div','form-note',note));
 return views[key]={view,body,title,group,render:()=>{}}}
function show(key,opts={}){load();P.load();const v=views[key];document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));v.view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,v.group,v.title);const t=document.getElementById('title');if(t)t.textContent=v.title;v.render(opts);normalizeHeaderActions(v.view)}
const statusPill=active=>el('span','pill '+(active?'p-green':'p-red'),active?'Ativo':'Inativo');
const messages=()=>{const error=el('p','uniforms-wide profiles-error'),status=el('p','uniforms-wide profiles-note');error.setAttribute('role','alert');status.setAttribute('role','status');return {error,status}};
function table(heads){const t=el('table','uniforms-table'),hr=el('tr');for(const h of heads)hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);return {t,tb}}
const storageWarning=()=>loadError?el('p','people-alert','Não foi possível ler os horários e escalas salvos neste navegador. Nada será gravado para não sobrescrever os dados.'):null;

/* ---------- Cadastro de Horários ---------- */
{const V=makeView('shifts','DES - Horários','Cadastros Geral Colaboradores','Modelos de horário reutilizáveis. O modelo não tem colaborador: o vínculo é feito em Lançamentos Colaboradores → DES - Lançamento de Horários, onde cada pessoa pode ter o próprio intervalo sem alterar o modelo. Os horários são exemplos de cadastro, não jornadas oficiais definidas pela plataforma.');
 const form=el('form','form-fields uniforms-form');form.noValidate=true;const heading=el('h3','uniforms-wide uniforms-heading','Novo horário');
 const name=el('input'),start=time(),end=time(),bs=time(),be=time(),brkOut=el('input'),totalOut=el('input'),active=el('select');name.maxLength=60;name.placeholder='Ex.: Horário 01 — Manhã';brkOut.readOnly=totalOut.readOnly=true;active.add(new Option('Ativo','1'));active.add(new Option('Inativo','0'));
 const sixNote=el('p','uniforms-wide people-alert schedules-six');sixNote.hidden=true;
const {error,status}=messages(),actions=el('div','uniforms-wide actions'),save=el('button','btn','Salvar horário');save.type='submit';let editing=null;
 actions.append(button('Cancelar',()=>{reset();status.textContent='Edição descartada.'}),save);
 form.append(heading,lbl('Nome do horário *',name,'uniforms-wide'),lbl('Hora de entrada *',start),lbl('Hora de saída *',end),lbl('Início do intervalo',bs),lbl('Fim do intervalo',be),lbl('Duração do intervalo',brkOut),lbl('Jornada total (sem o intervalo)',totalOut),sixNote,lbl('Status do modelo',active),error,status,actions);
 const listNote=el('p','profiles-note'),wrap=el('div','uniforms-table-wrap');V.body.append(form,el('h3','uniforms-heading','Horários cadastrados'),listNote,wrap);
 /* Same reference as the CARGOS/HORÁRIOS/ESCALAS sheet: an interval is expected when the workday passes 6h. Alert only. */
function recalc(){const c=calc(start.value,end.value,bs.value,be.value);brkOut.value=bs.value&&be.value?hm(c.brk):'';totalOut.value=c.net==null||!c.work?'':hm(c.net);sixNote.hidden=!(c.work>360&&!(bs.value&&be.value));sixNote.textContent='Jornada acima de 6h sem intervalo. Na planilha de horários o intervalo entra quando a jornada passa de 6h: confira antes de salvar.'}
 for(const i of [start,end,bs,be])i.addEventListener('input',recalc);
 function reset(){editing=null;form.reset();name.value='';active.value='1';heading.textContent='Novo horário';save.textContent='Salvar horário';error.textContent='';recalc()}
 function edit(s){editing=s.id;name.value=s.name;start.value=s.start;end.value=s.end;bs.value=s.breakStart||'';be.value=s.breakEnd||'';active.value=s.active?'1':'0';heading.textContent='Editar horário: '+s.name;save.textContent='Salvar alterações';error.textContent='';status.textContent='';recalc();form.scrollIntoView({block:'start',behavior:'smooth'})}
 form.onsubmit=e=>{e.preventDefault();error.textContent='';status.textContent='';load();const n=name.value.trim(),errs=timeErrors(start.value,end.value,bs.value,be.value);if(!n)errs.unshift('Informe o nome do horário.');
  if(data.shifts.some(s=>s.id!==editing&&fold(s.name)===fold(n)))errs.push('Já existe um horário com este nome.');
  const same=data.shifts.find(s=>s.id!==editing&&s.start===start.value&&s.end===end.value&&(s.breakStart||'')===bs.value&&(s.breakEnd||'')===be.value);if(same)errs.push('Estes horários já estão cadastrados em "'+same.name+'". Reutilize esse modelo.');
  if(errs.length){error.textContent=errs.join(' ');return}
  const rec={name:n,start:start.value,end:end.value,breakStart:bs.value,breakEnd:be.value,active:active.value==='1'};
  const commit=()=>{const ok=transact(d=>{if(editing){const s=d.shifts.find(x=>x.id===editing);(s.history=s.history||[]).push({at:nowIso(),before:{name:s.name,start:s.start,end:s.end,breakStart:s.breakStart,breakEnd:s.breakEnd,active:s.active}});Object.assign(s,rec,{updatedAt:nowIso()})}else d.shifts.push({id:newId(),...rec,createdAt:nowIso(),history:[]})});
   if(!ok){error.textContent='Não foi possível salvar neste navegador.';return null}const msg=(editing?'Horário atualizado: ':'Horário cadastrado: ')+n+'.';reset();V.render();status.textContent=msg;return null};
  const old=editing&&shiftById(editing),users=editing?linkedCount('shift',editing):0,changed=old&&(old.start!==rec.start||old.end!==rec.end||(old.breakStart||'')!==rec.breakStart||(old.breakEnd||'')!==rec.breakEnd);
  if(users&&changed)confirmDialog('Alterar o horário para todos?','Este modelo está vinculado a '+users+' colaborador(es). A alteração vale para todos eles a partir de agora. Intervalos individuais continuam como estão, e o histórico guarda os horários anteriores.','Alterar para todos',commit,()=>{});else commit()};
 function toggle(s){const users=linkedCount('shift',s.id);const run=()=>{transact(d=>{const x=d.shifts.find(y=>y.id===s.id);x.active=!x.active;x.updatedAt=nowIso()});V.render();return null};
  if(s.active)confirmDialog('Desativar horário?','"'+s.name+'" não poderá ser escolhido em novos vínculos.'+(users?' Os '+users+' colaborador(es) já vinculados continuam com ele até receberem outro horário.':''),'Desativar',run,()=>{});else run()}
 V.render=()=>{wrap.replaceChildren();const w=storageWarning();if(w)wrap.append(w);const list=[...data.shifts].sort((a,b)=>(b.active-a.active)||a.name.localeCompare(b.name,'pt-BR'));listNote.textContent=list.length?list.length+' horário(s) cadastrado(s).':'Nenhum horário cadastrado.';if(!list.length)return;
  const {t,tb}=table(['Horário','Entrada','Intervalo','Saída','Jornada','Colaboradores','Status','Ações']);
  for(const s of list){const c=calc(s.start,s.end,s.breakStart,s.breakEnd),tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions');st.append(statusPill(s.active));if(!s.active)tr.classList.add('is-cancelled');
   a.append(iconButton('Editar horário '+s.name,ICON.edit,()=>edit(s),'is-accent'),iconButton((s.active?'Desativar':'Reativar')+' horário '+s.name,s.active?ICON.ban:ICON.ok,()=>toggle(s)));
   tr.append(el('td',null,s.name),el('td',null,s.start),el('td',null,s.breakStart?s.breakStart+' às '+s.breakEnd:'—'),el('td',null,s.end),el('td','uniforms-num',hm(c.net)),el('td','uniforms-num',String(linkedCount('shift',s.id))),st,a);tb.append(tr)}wrap.append(t)};
 views.shifts.reset=reset}

/* ---------- Cadastro de Escalas ---------- */
{const V=makeView('scales','DES - Escalas','Cadastros Geral Colaboradores','Modelos de escala reutilizáveis: dias de trabalho e de folga na semana. O modelo não tem colaborador: o vínculo é feito em Lançamentos Colaboradores → DES - Escalas de Folga. A plataforma não aplica regras de folga ou jornada que não estejam configuradas aqui.');
 const form=el('form','form-fields uniforms-form');form.noValidate=true;const heading=el('h3','uniforms-wide uniforms-heading','Nova escala');
 const name=el('input'),type=el('select'),notes=el('textarea'),active=el('select'),offOut=el('input');name.maxLength=60;name.placeholder='Ex.: Segunda a sábado';SCALE_TYPES.forEach(x=>type.add(new Option(x,x)));notes.rows=3;notes.addEventListener('focusout',e=>e.stopPropagation());active.add(new Option('Ativo','1'));active.add(new Option('Inativo','0'));offOut.readOnly=true;
 const daysBox=el('fieldset','uniforms-wide jornada-days');daysBox.append(el('legend',null,'Dias de trabalho *'));const checks=DAYS.map((d,i)=>{const l=el('label','jornada-day'),c=el('input');c.type='checkbox';c.value=String(i);c.setAttribute('aria-label',DAY_NAMES[i]);l.append(c,el('span',null,d));daysBox.append(l);c.addEventListener('change',paintOff);return c});
 const {error,status}=messages(),actions=el('div','uniforms-wide actions'),save=el('button','btn','Salvar escala');save.type='submit';let editing=null;
 actions.append(button('Cancelar',()=>{reset();status.textContent='Edição descartada.'}),save);
 form.append(heading,lbl('Nome da escala *',name,'uniforms-wide'),lbl('Tipo de escala *',type),lbl('Status do modelo',active),daysBox,lbl('Dias de folga',offOut,'uniforms-wide'),lbl('Observações',notes,'uniforms-wide'),error,status,actions);
 const listNote=el('p','profiles-note'),wrap=el('div','uniforms-table-wrap');V.body.append(form,el('h3','uniforms-heading','Escalas cadastradas'),listNote,wrap);
 const chosen=()=>checks.filter(c=>c.checked).map(c=>+c.value);
 function paintOff(){const d=chosen();offOut.value=d.length?offText(d):''}
 function reset(){editing=null;name.value='';type.value=SCALE_TYPES[0];notes.value='';active.value='1';checks.forEach(c=>c.checked=false);heading.textContent='Nova escala';save.textContent='Salvar escala';error.textContent='';paintOff()}
 function edit(s){editing=s.id;name.value=s.name;type.value=s.type;notes.value=s.notes||'';active.value=s.active?'1':'0';checks.forEach(c=>c.checked=s.days.includes(+c.value));heading.textContent='Editar escala: '+s.name;save.textContent='Salvar alterações';error.textContent='';status.textContent='';paintOff();form.scrollIntoView({block:'start',behavior:'smooth'})}
 form.onsubmit=e=>{e.preventDefault();error.textContent='';status.textContent='';load();const n=name.value.trim(),days=chosen(),errs=[];if(!n)errs.push('Informe o nome da escala.');if(!days.length)errs.push('Marque ao menos um dia de trabalho.');
  if(data.scales.some(s=>s.id!==editing&&fold(s.name)===fold(n)))errs.push('Já existe uma escala com este nome.');
  const same=data.scales.find(s=>s.id!==editing&&s.type===type.value&&s.days.length===days.length&&s.days.every(x=>days.includes(x)));if(same&&n)errs.push('Estes dias já estão cadastrados em "'+same.name+'" ('+same.type+'). Reutilize esse modelo.');
  if(errs.length){error.textContent=errs.join(' ');return}
  const rec={name:n,type:type.value,days,notes:notes.value.trim(),active:active.value==='1'};
  const commit=()=>{const ok=transact(d=>{if(editing){const s=d.scales.find(x=>x.id===editing);(s.history=s.history||[]).push({at:nowIso(),before:{name:s.name,type:s.type,days:[...s.days],active:s.active}});Object.assign(s,rec,{updatedAt:nowIso()})}else d.scales.push({id:newId(),...rec,createdAt:nowIso(),history:[]})});
   if(!ok){error.textContent='Não foi possível salvar neste navegador.';return null}const msg=(editing?'Escala atualizada: ':'Escala cadastrada: ')+n+'.';reset();V.render();status.textContent=msg;return null};
  const old=editing&&scaleById(editing),users=editing?linkedCount('scale',editing):0,changed=old&&(old.type!==rec.type||old.days.join()!==[...days].sort().join());
  if(users&&changed)confirmDialog('Alterar a escala para todos?','Esta escala está vinculada a '+users+' colaborador(es). A alteração vale para todos eles a partir de agora; o histórico guarda os dias anteriores.','Alterar para todos',commit,()=>{});else commit()};
 function toggle(s){const users=linkedCount('scale',s.id);const run=()=>{transact(d=>{const x=d.scales.find(y=>y.id===s.id);x.active=!x.active;x.updatedAt=nowIso()});V.render();return null};
  if(s.active)confirmDialog('Desativar escala?','"'+s.name+'" não poderá ser escolhida em novos vínculos.'+(users?' Os '+users+' colaborador(es) já vinculados continuam com ela até receberem outra escala.':''),'Desativar',run,()=>{});else run()}
 V.render=()=>{wrap.replaceChildren();const w=storageWarning();if(w)wrap.append(w);const list=[...data.scales].sort((a,b)=>(b.active-a.active)||a.name.localeCompare(b.name,'pt-BR'));listNote.textContent=list.length?list.length+' escala(s) cadastrada(s).':'Nenhuma escala cadastrada.';if(!list.length)return;
  const {t,tb}=table(['Escala','Tipo','Trabalho','Folga','Colaboradores','Status','Ações']);
  for(const s of list){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions');st.append(statusPill(s.active));if(!s.active)tr.classList.add('is-cancelled');
   a.append(iconButton('Editar escala '+s.name,ICON.edit,()=>edit(s),'is-accent'),iconButton((s.active?'Desativar':'Reativar')+' escala '+s.name,s.active?ICON.ban:ICON.ok,()=>toggle(s)));
   tr.append(el('td',null,s.name),el('td',null,s.type),el('td',null,daysText(s.days)),el('td',null,offText(s.days)),el('td','uniforms-num',String(linkedCount('scale',s.id))),st,a);tb.append(tr)}wrap.append(t)};
 views.scales.reset=reset}

/* ---------- Lançamentos: vínculo de vários colaboradores a um modelo ---------- */
function peoplePicker(){const box=el('fieldset','uniforms-wide jornada-people'),legend=el('legend',null,'Colaboradores *'),search=el('input'),list=el('div','jornada-people-list'),tools=el('div','jornada-people-tools'),count=el('span','profiles-note');
 search.type='search';search.placeholder='Buscar colaborador…';search.setAttribute('aria-label','Buscar colaborador');const picked=new Set();
 const all=button('Marcar todos da lista',()=>{list.querySelectorAll('input').forEach(c=>{c.checked=true;picked.add(c.value)});paint()}),none=button('Limpar seleção',()=>{picked.clear();render()});
 tools.append(all,none,count);box.append(legend,search,list,tools);
 function paint(){count.textContent=picked.size?picked.size+' selecionado(s)':'Nenhum selecionado'}
 function render(){list.replaceChildren();const q=fold(search.value),people=P.selectable().filter(p=>p.active&&(fold(p.name).includes(q)||fold(p.jobName).includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  if(!people.length)list.append(el('p','profiles-note',q?'Nenhum colaborador ativo encontrado.':'Nenhum colaborador ativo cadastrado.'));
  for(const p of people){const l=el('label','jornada-person'),c=el('input');c.type='checkbox';c.value=p.id;c.checked=picked.has(p.id);c.onchange=()=>{c.checked?picked.add(p.id):picked.delete(p.id);paint()};l.append(c,el('span',null,p.name),el('small',null,p.jobName||'Cargo não informado'));list.append(l)}paint()}
 search.addEventListener('input',render);return {box,picked,render,clear:()=>{picked.clear();search.value='';render()}}}
const modelSelect=(kind,cur)=>{const s=el('select');s.add(new Option(kind==='shift'?'Selecione o horário':'Selecione a escala',''));for(const m of (kind==='shift'?data.shifts:data.scales).filter(x=>x.active||x.id===cur).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))s.add(new Option(m.name+' · '+(kind==='shift'?m.start+' às '+m.end:daysText(m.days)),m.id));s.value=cur||'';return s};

function makeLinker(kind){const isShift=kind==='shift',key=isShift?'shift-links':'scale-links',noun=isShift?'horário':'escala',cad=isShift?'DES - Horários':'DES - Escalas';
 const V=makeView(key,isShift?'DES - Lançamento de Horários':'DES - Escalas de Folga','Lançamentos Colaboradores',isShift?'Vincule um modelo de horário a um ou vários colaboradores a partir de uma data. O intervalo individual vale só para aquele colaborador e não altera o modelo. Vínculos anteriores ficam no histórico.':'Vincule um modelo de escala a um ou vários colaboradores a partir de uma data e registre folgas e exceções. Vínculos anteriores ficam no histórico.');
 const form=el('form','form-fields uniforms-form');form.noValidate=true;const from=DB.field('Data de início *'),modelWrap=el('div','uniforms-wide jornada-model'),preview=el('p','uniforms-wide profiles-note');preview.setAttribute('aria-live','polite');let model=modelSelect(kind);
 const bs=time(),be=time(),picker=peoplePicker(),{error,status}=messages(),actions=el('div','uniforms-wide actions'),save=el('button','btn','Vincular aos selecionados');save.type='submit';
 actions.append(button('Cancelar',()=>{reset();status.textContent='Seleção descartada. Nada foi salvo.'}),save);
 const parts=[el('h3','uniforms-wide uniforms-heading','Vincular '+noun),from.label,modelWrap,preview];if(isShift)parts.push(lbl('Intervalo individual: início',bs),lbl('Intervalo individual: fim',be),el('p','uniforms-wide profiles-note','Deixe o intervalo individual em branco para usar o intervalo do modelo.'));
 parts.push(picker.box,error,status,actions);form.append(...parts);
 const goCad=button('Cadastrar '+noun,()=>show(isShift?'shifts':'scales'));
 function paintModel(){const cur=model.value;model=modelSelect(kind,cur);model.addEventListener('change',paintPreview);modelWrap.replaceChildren(lbl('Modelo de '+noun+' *',model));if(model.options.length<2)modelWrap.append(el('p','profiles-note','Nenhum modelo ativo. Cadastre em Cadastros Geral Colaboradores → '+cad+'.'),goCad);paintPreview()}
 function paintPreview(){const m=isShift?shiftById(model.value):scaleById(model.value);preview.textContent=m?(isShift?'Modelo: '+shiftText(m)+' · jornada '+hm(calc(m.start,m.end,m.breakStart,m.breakEnd).net):'Trabalho: '+daysText(m.days)+' · Folga: '+offText(m.days)+' · '+m.type):''}
 function reset(){from.set(today());model.value='';bs.value=be.value='';picker.clear();error.textContent='';paintModel()}
 form.onsubmit=e=>{e.preventDefault();error.textContent='';status.textContent='';load();const day=from.iso(),m=isShift?shiftById(model.value):scaleById(model.value),ids=[...picker.picked].filter(id=>P.byId(id)),errs=[];
  if(!day)errs.push('Informe a data de início (DD/MM/AAAA).');if(!m)errs.push('Selecione o modelo de '+noun+'.');else if(!m.active)errs.push('Este modelo está inativo.');if(!ids.length)errs.push('Selecione ao menos um colaborador.');
  if(isShift&&m&&(bs.value||be.value))errs.push(...timeErrors(m.start,m.end,bs.value,be.value).map(x=>x.replace('O intervalo','O intervalo individual')));
  if(errs.length){error.textContent=errs.join(' ');return}
  const same=ids.filter(id=>{const c=current(id,kind,day);return c&&c.modelId===m.id&&c.from===day&&(c.breakStart||'')===(bs.value||'')});
  if(!addLinks(kind,m.id,ids,day,isShift&&bs.value?[bs.value,be.value]:null)){error.textContent='Não foi possível salvar neste navegador.';return}
  const n=ids.length;reset();V.render();status.textContent=n+' colaborador(es) vinculado(s) a "'+m.name+'" a partir de '+dateBR(day)+'.'+(same.length?' '+same.length+' já tinha(m) este vínculo nesta data; o registro foi repetido no histórico.':'')};
 /* Individual break: a new link for one person with the same model, starting on the chosen date. */
 function breakDialog(p){const cur=current(p.id,'shift');const m=cur&&shiftById(cur.modelId);if(!m)return;
  dialog('Intervalo individual de '+p.name,(field,f)=>{f.append(el('p','profiles-note','Modelo "'+m.name+'": '+shiftText(m)+'. A alteração vale só para '+p.name+'; o modelo e os demais colaboradores não mudam.'));
   const d=DB.field('A partir de *');d.set(today());f.append(d.label);const a=field('Início do intervalo',time()),b=field('Fim do intervalo',time());a.value=cur.breakStart||m.breakStart||'';b.value=cur.breakEnd||m.breakEnd||'';
   const useModel=el('input');useModel.type='checkbox';const l=el('label','jornada-check');l.append(useModel,el('span',null,'Voltar a usar o intervalo do modelo'));f.append(l);useModel.onchange=()=>{a.disabled=b.disabled=useModel.checked};return {d,a,b,useModel}},
   ({d,a,b,useModel})=>{const day=d.iso();if(!day)return 'Informe a data (DD/MM/AAAA).';if(day<cur.from)return 'A data não pode ser anterior ao início do vínculo atual ('+dateBR(cur.from)+').';
    const brk=useModel.checked?null:[a.value,b.value];if(brk){if(!brk[0]&&!brk[1])return 'Informe o intervalo ou marque "Voltar a usar o intervalo do modelo".';const e=timeErrors(m.start,m.end,brk[0],brk[1]);if(e.length)return e.join(' ')}
    load();return addLinks('shift',m.id,[p.id],day,brk)?null:'Não foi possível salvar neste navegador.'},'Salvar intervalo',()=>{V.render();status.textContent='Intervalo de '+p.name+' atualizado. O modelo "'+m.name+'" não foi alterado.'})}
 function historyDialog(p){dialog('Histórico de '+noun+' — '+p.name,(field,f)=>{const ls=linksOf(p.id,kind).reverse(),day=today();if(!ls.length){f.append(el('p','profiles-note','Nenhum vínculo registrado.'));return}
   const {t,tb}=table(['A partir de','Modelo',isShift?'Horário no vínculo':'Dias no vínculo','Situação']);const cur=current(p.id,kind,day);
   for(const l of ls){const s=l.snapshot||{},tr=el('tr');const sit=l===cur?'Vigente':l.from>day?'Programado':'Encerrado';
    tr.append(el('td',null,dateBR(l.from)),el('td',null,s.name||modelOf(l)?.name||'—'),el('td',null,isShift?(s.start+' às '+s.end+' · intervalo '+(l.breakStart?breakText(l.breakStart,l.breakEnd)+' (individual)':breakText(s.breakStart,s.breakEnd))):daysText(s.days||[])),el('td',null,sit));tb.append(tr)}
   const w=el('div','uniforms-table-wrap');w.append(t);f.append(w)},null)}
 /* Scale exceptions: a dated note for one person; cancelling keeps the record. */
 const listNote=el('p','profiles-note'),wrap=el('div','uniforms-table-wrap'),exWrap=el('div','uniforms-table-wrap');
 V.body.append(form,el('h3','uniforms-heading',isShift?'Horários vinculados':'Escalas vinculadas'),listNote,wrap);if(!isShift){const go=button('Abrir Escala Individual',()=>show('calendar'));V.body.append(el('h3','uniforms-heading','Folgas e exceções anteriores'),el('p','profiles-note','Registros feitos antes da Escala Individual, mantidos como histórico. Novas folgas e trocas são lançadas por semana em DES - Escala Individual.'),go,exWrap)};
 V.render=()=>{paintModel();picker.render();if(!from.iso())from.set(today());wrap.replaceChildren();const w=storageWarning();if(w)wrap.append(w);const day=today();
  const rows=P.get().people.filter(p=>linksOf(p.id,kind).length).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));listNote.textContent=rows.length?rows.length+' colaborador(es) com '+noun+' vinculado(a).':'Nenhum colaborador com '+noun+' vinculado(a).';
  if(rows.length){const {t,tb}=table(isShift?['Colaborador','Cargo','Horário','Intervalo','Desde','Ações']:['Colaborador','Cargo','Escala','Trabalho','Folga','Desde','Ações']);
   for(const p of rows){const ef=effective(p.id,day),cur=isShift?ef.shiftLink:ef.scaleLink,next=upcoming(p.id,kind,day)[0],m=cur&&modelOf(cur),tr=el('tr'),a=el('td','uniforms-row-actions');
    const since=el('td',null,cur?dateBR(cur.from):'—');if(next){since.append(el('br'),el('small',null,'Muda em '+dateBR(next.from)+': '+(modelOf(next)?.name||'—')))}
    if(p.status!=='ATIVO')tr.classList.add('is-cancelled');
    a.append(iconButton('Histórico de '+noun+' de '+p.name,ICON.eye,()=>historyDialog(p)));if(isShift&&m&&p.status==='ATIVO')a.append(iconButton('Intervalo individual de '+p.name,CLOCK,()=>breakDialog(p),'is-accent'));
    const name=el('td',null,p.name);if(m&&!m.active)name.append(el('br'),el('small',null,'Modelo inativo'));
    if(isShift){const brk=el('td',null,ef.shift?breakText(ef.breakStart,ef.breakEnd):'—');if(ef.ownBreak)brk.append(el('br'),el('small',null,'Individual'));tr.append(name,el('td',null,p.jobName||'—'),el('td',null,m?m.name+' · '+m.start+' às '+m.end:next?'A partir de '+dateBR(next.from):'—'),brk,since,a)}
    else tr.append(name,el('td',null,p.jobName||'—'),el('td',null,m?m.name:next?'A partir de '+dateBR(next.from):'—'),el('td',null,m?daysText(m.days):'—'),el('td',null,m?offText(m.days):'—'),since,a);tb.append(tr)}wrap.append(t)}
  if(!isShift){exWrap.replaceChildren();const list=data.exceptions.filter(x=>!x.cancelledAt).sort((a,b)=>b.date.localeCompare(a.date));if(!list.length){exWrap.append(el('p','profiles-note','Nenhuma folga ou exceção registrada.'));return}
   const {t,tb}=table(['Data','Colaborador','Tipo','Escala na data','Observação','Ações']);for(const x of list){const p=P.byId(x.personId),tr=el('tr'),a=el('td','uniforms-row-actions');
    a.append(iconButton('Cancelar registro de '+x.kind,ICON.ban,()=>confirmDialog('Cancelar este registro?',x.kind+' de '+(p?.name||'—')+' em '+dateBR(x.date)+' ficará marcada como cancelada. O registro não é apagado.','Cancelar registro',()=>{transact(d=>{d.exceptions.find(y=>y.id===x.id).cancelledAt=nowIso()});return null},()=>V.render())));
    tr.append(el('td',null,dateBR(x.date)),el('td',null,p?.name||'—'),el('td',null,x.kind),el('td',null,scaleById(x.scaleId)?.name||'—'),el('td',null,x.note||'—'),a);tb.append(tr)}exWrap.append(t)}};
 V.reset=reset}
makeLinker('shift');makeLinker('scale');


/* ---------- Escala individual por semana, horários alternativos e feriados ----------
   The DP decides who works and who is off on each date; nothing is distributed automatically. A date without a saved
   entry only shows what the linked scale model says. Saved entries and the log of changes are only appended. */
const SLOTS=[['main','Horário principal'],['alt2','Horário alternativo 2'],['alt3','Horário alternativo 3'],['sunday','Horário de domingo'],['holiday','Horário de feriado']];
const slotName=k=>(SLOTS.find(s=>s[0]===k)||[,k])[1];
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_ORDER=[1,2,3,4,5,6,0];
const isoAdd=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const dowOf=iso=>new Date(iso+'T12:00:00').getDay();
const weekStart=iso=>isoAdd(iso,-((dowOf(iso)+6)%7));
const monthStart=iso=>iso.slice(0,8)+'01';
const holidayOn=day=>data.holidays.find(h=>!h.cancelledAt&&h.date===day)||null;
/* Alternative shifts chosen for a person (appended with a start date; the latest one on or before the day applies). */
function setOf(pid,day){const l=data.sets.filter(s=>s.personId===pid&&s.from<=day).sort((a,b)=>a.from.localeCompare(b.from)||a.createdAt.localeCompare(b.createdAt));return l[l.length-1]||null}
function shiftFor(pid,day,slot){const ef=effective(pid,day);if(slot==='main')return ef.shift?{shift:ef.shift,breakStart:ef.breakStart,breakEnd:ef.breakEnd}:null;
 const id=setOf(pid,day)?.[slot],s=id&&shiftById(id);return s?{shift:s,breakStart:s.breakStart,breakEnd:s.breakEnd}:null}
const netOf=x=>x?calc(x.shift.start,x.shift.end,x.breakStart,x.breakEnd).net:null;
/* What a date holds for a person: the saved entry when there is one, otherwise the scale model's own days (explicit=false). */
function dayInfo(pid,day){const e=data.days[pid]?.[day],dow=dowOf(day),h=holidayOn(day);
 if(e)return {...e,explicit:true,holiday:h,minutes:e.work?netOf(shiftFor(pid,day,e.slot))||0:0};
 const sc=effective(pid,day).scale,set=setOf(pid,day),work=sc?sc.days.includes(dow):null,slot=h&&set?.holiday?'holiday':dow===0&&set?.sunday?'sunday':'main';
 return {work,slot,note:'',explicit:false,holiday:h,minutes:work?netOf(shiftFor(pid,day,slot))||0:0}}
const weekDays=day=>{const s=weekStart(day);return WEEK_ORDER.map((_,i)=>isoAdd(s,i))};
const weekMinutes=(pid,day)=>weekDays(day).reduce((t,d)=>t+(dayInfo(pid,d).minutes||0),0);
function periodStats(pid,days){const r={work:0,off:0,none:0,sundayWork:0,sundayOff:0,holidayWork:0,holidayOff:0,minutes:0};
 for(const d of days){const i=dayInfo(pid,d),dow=dowOf(d);if(i.work==null)r.none++;else if(i.work){r.work++;r.minutes+=i.minutes||0}else r.off++;
  if(dow===0&&i.work!=null){i.work?r.sundayWork++:r.sundayOff++}if(i.holiday&&i.work!=null){i.work?r.holidayWork++:r.holidayOff++}}return r}
const sessionUser=()=>{try{return JSON.parse(sessionStorage.getItem('cicluz-sync-aba')||'null')?.perfil?.nome||''}catch{return ''}};

{const V=makeView('calendar','DES - Escala Individual','Lançamentos Colaboradores','Escala de cada colaborador por semana, com os horários alternativos, de domingo e de feriado. O DP define quem trabalha e quem folga em cada dia: a plataforma não distribui folgas. Dias sem lançamento mostram apenas os dias do modelo de escala vinculado. Semana de segunda a domingo.');
 const pSel=el('select'),modeBar=el('div','people-banner-tools'),nav=el('div','people-banner-tools'),title=el('h3','uniforms-heading'),area=el('div'),setBox=el('div'),holBox=el('div');
 pSel.setAttribute('aria-label','Colaborador');const top=el('div','form-fields uniforms-form');top.append(lbl('Colaborador *',pSel,'uniforms-wide'));
 let mode='week',ref=today(),flash='',want='';
 const modeBtns={};for(const [k,n] of [['week','Semanal'],['month','Mensal'],['year','Anual']]){const b=button(n,()=>{mode=k;render()},'btn');b.dataset.mode=k;modeBtns[k]=b;modeBar.append(b)}
 const step=n=>{ref=mode==='week'?isoAdd(ref,7*n):mode==='month'?(()=>{const d=new Date(monthStart(ref)+'T12:00:00');d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10)})():(()=>{const d=new Date(ref+'T12:00:00');d.setFullYear(d.getFullYear()+n);return d.toISOString().slice(0,10)})();render()};
 nav.append(button('Anterior',()=>step(-1)),button('Próximo',()=>step(1)),button('Hoje',()=>{ref=today();render()}));
 const person=()=>P.byId(pSel.value);
 V.body.append(top,modeBar,nav,title,area,setBox,holBox);
 pSel.addEventListener('change',render);
 const sitText=x=>x.work==null?'Sem escala':x.work?'Trabalha ('+slotName(x.slot)+')':'Folga';

 function weekView(p){const days=weekDays(ref),{error,status}=messages();status.textContent=flash;flash='';
  if(!effective(p.id,ref).shift)area.append(el('p','people-alert','Este colaborador não tem horário principal vinculado nesta semana. Vincule em Lançamentos Colaboradores → DES - Lançamento de Horários antes de lançar dias de trabalho.'));
  const {t,tb}=table(['Dia','Situação','Horário','Observação','Jornada']);
  const totEl=el('p','profiles-note');totEl.setAttribute('aria-live','polite');
  const rows=days.map(d=>{const i=dayInfo(p.id,d),tr=el('tr'),dayTd=el('td',null,DAY_NAMES[dowOf(d)]+' '+dateBR(d).slice(0,5));if(i.holiday)dayTd.append(el('br'),el('small',null,'Feriado: '+i.holiday.name));
   const st=el('select'),sl=el('select'),nt=el('input'),out=el('td','uniforms-num');st.setAttribute('aria-label','Situação em '+dateBR(d));sl.setAttribute('aria-label','Horário em '+dateBR(d));nt.setAttribute('aria-label','Observação em '+dateBR(d));nt.maxLength=120;
   if(i.work==null)st.add(new Option('Escolher',''));st.add(new Option('Trabalha','1'));st.add(new Option('Folga','0'));st.value=i.work==null?'':i.work?'1':'0';
   for(const [k,n] of SLOTS){const x=shiftFor(p.id,d,k),o=new Option(n+(x?' · '+x.shift.start+' às '+x.shift.end:' · não cadastrado'),k);o.disabled=!x;sl.add(o)}sl.value=i.slot;nt.value=i.note||'';
   const r={d,st,sl,nt,out,was:i};const paint=()=>{const w=st.value==='1';sl.disabled=!w;out.textContent=w?hm(netOf(shiftFor(p.id,d,sl.value))):'—';tot()};r.paint=paint;
   st.addEventListener('change',paint);sl.addEventListener('change',paint);const td=n=>{const c=el('td');c.append(n);return c};tr.append(dayTd,td(st),td(sl),td(nt),out);tb.append(tr);return r});
  function tot(){const m=rows.reduce((a,r)=>a+(r.st.value==='1'?(netOf(shiftFor(p.id,r.d,r.sl.value))||0):0),0);totEl.textContent='Total da semana: '+hm(m)+' · '+rows.filter(r=>r.st.value==='1').length+' dia(s) de trabalho, '+rows.filter(r=>r.st.value==='0').length+' folga(s).'}
  rows.forEach(r=>r.paint());
  const copy=button('Copiar semana anterior',()=>{const s=weekDays(isoAdd(ref,-7));rows.forEach((r,idx)=>{const i=dayInfo(p.id,s[idx]);r.st.value=i.work==null?'':i.work?'1':'0';r.sl.value=shiftFor(p.id,r.d,i.slot)?i.slot:'main';r.nt.value=i.note||'';r.paint()});status.textContent='Semana anterior copiada para o formulário. Revise e salve: nada foi gravado ainda.'});
  const save=button('Salvar semana',()=>{error.textContent=status.textContent='';load();const errs=[];
   for(const r of rows){if(r.st.value==='')errs.push(dateBR(r.d)+': escolha Trabalha ou Folga.');else if(r.st.value==='1'&&!shiftFor(p.id,r.d,r.sl.value))errs.push(dateBR(r.d)+': '+slotName(r.sl.value)+' não cadastrado para este colaborador.')}
   if(errs.length){error.textContent=errs.join(' ');return}
   const at=nowIso(),by=sessionUser();let changed=0;if(!transact(d=>{const m=d.days[p.id]=d.days[p.id]||{};for(const r of rows){const w=r.st.value==='1',after={work:w,slot:w?r.sl.value:'main',note:r.nt.value.trim()},b=r.was;
     if(b.explicit&&b.work===after.work&&b.slot===after.slot&&(b.note||'')===after.note)continue;changed++;
     d.dayLog.push({id:newId(),personId:p.id,date:r.d,before:{work:b.work,slot:b.slot,note:b.note||'',explicit:b.explicit},after,at,by});m[r.d]={...after,at,by}}})){error.textContent='Não foi possível salvar neste navegador.';return}
   flash=changed?'Semana salva ('+changed+' dia(s) registrado(s)). Os registros anteriores ficam no histórico.':'Nada mudou nesta semana.';render()},'btn');
  const w=el('div','uniforms-table-wrap');w.append(t);const tools=el('div','people-banner-tools');tools.append(copy,save,button('Histórico de alterações',()=>logDialog(p)));status.setAttribute('role','status');
  area.append(w,totEl,tools,error,status)}

 const cellText=i=>i.work==null?'—':i.work?'T '+({main:'',alt2:'H2 ',alt3:'H3 ',sunday:'Dom ',holiday:'Fer '})[i.slot]+hm(i.minutes):'Folga';
 const summaryNote=st=>el('p','profiles-note','Dias de trabalho: '+st.work+' · Folgas: '+st.off+(st.none?' · Sem escala: '+st.none:'')+' · Domingos trabalhados: '+st.sundayWork+' · Domingos de folga: '+st.sundayOff+' · Feriados trabalhados: '+st.holidayWork+' · Feriados de folga: '+st.holidayOff+' · Horas: '+hm(st.minutes)+'. Dias sem lançamento seguem o modelo de escala.');
 function monthView(p){const first=monthStart(ref),dim=new Date(+first.slice(0,4),+first.slice(5,7),0).getDate(),all=Array.from({length:dim},(_,i)=>isoAdd(first,i)),st=periodStats(p.id,all);
  const t=el('table','uniforms-table schedules-month'),hr=el('tr');for(const k of WEEK_ORDER)hr.append(el('th',null,DAYS[k]));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);
  let tr=el('tr');for(let i=0;i<(dowOf(first)+6)%7;i++)tr.append(el('td'));
  for(const d of all){const i=dayInfo(p.id,d),td=el('td',i.work===false?'schedules-off':''),b=button(String(+d.slice(8)),()=>{mode='week';ref=d;render()},'schedules-day');b.setAttribute('aria-label','Abrir a semana de '+dateBR(d));td.append(b,el('small',null,cellText(i)));if(i.holiday)td.append(el('small','schedules-holiday','Feriado'));if(!i.explicit)td.title='Padrão do modelo de escala';tr.append(td);
   if(dowOf(d)===0){tb.append(tr);tr=el('tr')}}
  if(tr.children.length)tb.append(tr);const w=el('div','uniforms-table-wrap');w.append(t);area.append(w,summaryNote(st))}
 function yearView(p){const y=+ref.slice(0,4),{t,tb}=table(['Mês','Trabalho','Folgas','Domingos trab.','Domingos folga','Feriados trab.','Feriados folga','Horas']);const tot={work:0,off:0,sundayWork:0,sundayOff:0,holidayWork:0,holidayOff:0,minutes:0};
  for(let m=0;m<12;m++){const first=y+'-'+String(m+1).padStart(2,'0')+'-01',dim=new Date(y,m+1,0).getDate(),st=periodStats(p.id,Array.from({length:dim},(_,i)=>isoAdd(first,i)));for(const k in tot)tot[k]+=st[k];
   const tr=el('tr'),c=el('td');c.append(button(MONTHS[m],()=>{mode='month';ref=first;render()},'schedules-day'));tr.append(c,...[st.work,st.off,st.sundayWork,st.sundayOff,st.holidayWork,st.holidayOff].map(x=>el('td','uniforms-num',String(x))),el('td','uniforms-num',hm(st.minutes)));tb.append(tr)}
  const tr=el('tr');tr.append(el('td',null,'Ano '+y),...[tot.work,tot.off,tot.sundayWork,tot.sundayOff,tot.holidayWork,tot.holidayOff].map(x=>el('td','uniforms-num',String(x))),el('td','uniforms-num',hm(tot.minutes)));tb.append(tr);const w=el('div','uniforms-table-wrap');w.append(t);area.append(w,el('p','profiles-note','Dias sem lançamento seguem o modelo de escala vinculado. Feriados cadastrados em Feriados, abaixo.'))}

 function logDialog(p){dialog('Histórico da escala — '+p.name,(field,f)=>{const l=data.dayLog.filter(x=>x.personId===p.id).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,200);if(!l.length){f.append(el('p','profiles-note','Nenhuma alteração registrada.'));return}
   const {t,tb}=table(['Registrado em','Data','Antes','Depois','Por']);for(const x of l){const tr=el('tr');tr.append(el('td',null,dateBR(x.at.slice(0,10))+' '+x.at.slice(11,16)),el('td',null,dateBR(x.date)),el('td',null,x.before.explicit?sitText(x.before):'Padrão do modelo: '+sitText(x.before)),el('td',null,sitText(x.after)+(x.after.note?' · '+x.after.note:'')),el('td',null,x.by||'—'));tb.append(tr)}const w=el('div','uniforms-table-wrap');w.append(t);f.append(w)},null)}

 /* Horários alternativos do colaborador (optional) */
 function setsView(p){setBox.replaceChildren();setBox.append(el('h3','uniforms-heading','Horários do colaborador'));const ef=effective(p.id,ref),cur=setOf(p.id,ref);
  setBox.append(el('p','profiles-note','Horário principal: '+(ef.shift?ef.shift.name+' · '+shiftText(ef.shift):'não vinculado')+'. Os alternativos, de domingo e de feriado são opcionais e usam os modelos de DES - Horários.'));
  const f=el('form','form-fields uniforms-form');f.noValidate=true;const sels={},from=DB.field('A partir de *');from.set(today());
  for(const [k] of SLOTS.filter(s=>s[0]!=='main')){const s=el('select');s.add(new Option('Não usar',''));for(const m of data.shifts.filter(x=>x.active||x.id===cur?.[k]).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))s.add(new Option(m.name+' · '+m.start+' às '+m.end,m.id));s.value=cur?.[k]||'';sels[k]=s}
  const {error,status}=messages(),act=el('div','uniforms-wide actions'),sv=el('button','btn','Salvar horários');sv.type='submit';act.append(sv);status.textContent=flash;flash='';
  f.append(from.label,lbl('Horário alternativo 2',sels.alt2),lbl('Horário alternativo 3',sels.alt3),lbl('Horário de domingo',sels.sunday),lbl('Horário de feriado',sels.holiday),error,status,act);
  f.onsubmit=e=>{e.preventDefault();error.textContent=status.textContent='';load();const d=from.iso();if(!d){error.textContent='Informe a data de início (DD/MM/AAAA).';return}
   const rec={alt2:sels.alt2.value,alt3:sels.alt3.value,sunday:sels.sunday.value,holiday:sels.holiday.value},same=cur&&['alt2','alt3','sunday','holiday'].every(k=>(cur[k]||'')===rec[k]);if(same){status.textContent='Nada mudou nos horários.';return}
   if(!transact(x=>x.sets.push({id:newId(),personId:p.id,from:d,...rec,createdAt:nowIso(),by:sessionUser()}))){error.textContent='Não foi possível salvar neste navegador.';return}flash='Horários salvos a partir de '+dateBR(d)+'. Os anteriores ficam no histórico.';render()};
  setBox.append(f);const hist=data.sets.filter(s=>s.personId===p.id).sort((a,b)=>b.from.localeCompare(a.from)||b.createdAt.localeCompare(a.createdAt));
  if(hist.length){const {t,tb}=table(['A partir de','Alt. 2','Alt. 3','Domingo','Feriado']);const nm=id=>id?shiftById(id)?.name||'—':'—';for(const s of hist){const tr=el('tr');tr.append(el('td',null,dateBR(s.from)),el('td',null,nm(s.alt2)),el('td',null,nm(s.alt3)),el('td',null,nm(s.sunday)),el('td',null,nm(s.holiday)));tb.append(tr)}const w=el('div','uniforms-table-wrap');w.append(t);setBox.append(el('h4',null,'Histórico dos horários'),w)}}

 /* Feriados (manual) */
 function holidaysView(){holBox.replaceChildren();holBox.append(el('h3','uniforms-heading','Feriados'),el('p','profiles-note','Cadastre manualmente os feriados que valem para a escala. A plataforma não traz lista de feriados.'));
  const f=el('form','form-fields uniforms-form');f.noValidate=true;const d=DB.field('Data *'),n=el('input');n.maxLength=60;const {error,status}=messages(),act=el('div','uniforms-wide actions'),sv=el('button','btn','Cadastrar feriado');sv.type='submit';act.append(sv);f.append(d.label,lbl('Nome do feriado *',n),error,status,act);
  f.onsubmit=e=>{e.preventDefault();error.textContent=status.textContent='';load();const iso=d.iso(),nm=n.value.trim(),errs=[];if(!iso)errs.push('Informe a data (DD/MM/AAAA).');if(!nm)errs.push('Informe o nome do feriado.');if(iso&&holidayOn(iso))errs.push('Já existe um feriado cadastrado nesta data.');if(errs.length){error.textContent=errs.join(' ');return}
   if(!transact(x=>x.holidays.push({id:newId(),date:iso,name:nm,createdAt:nowIso()}))){error.textContent='Não foi possível salvar neste navegador.';return}render()};
  holBox.append(f);const list=data.holidays.filter(h=>!h.cancelledAt).sort((a,b)=>a.date.localeCompare(b.date));
  if(!list.length){holBox.append(el('p','profiles-note','Nenhum feriado cadastrado.'));return}
  const {t,tb}=table(['Data','Feriado','Ações']);for(const h of list){const tr=el('tr'),a=el('td','uniforms-row-actions');a.append(iconButton('Cancelar feriado '+h.name,ICON.ban,()=>confirmDialog('Cancelar este feriado?',h.name+' em '+dateBR(h.date)+' deixa de valer para a escala. O registro não é apagado.','Cancelar feriado',()=>{transact(x=>{x.holidays.find(y=>y.id===h.id).cancelledAt=nowIso()});render();return null},()=>{})));tr.append(el('td',null,dateBR(h.date)),el('td',null,h.name),a);tb.append(tr)}const w=el('div','uniforms-table-wrap');w.append(t);holBox.append(w)}

 function render(){load();area.replaceChildren();setBox.replaceChildren();const keep=want||pSel.value;want='';pSel.replaceChildren(new Option('Selecione o colaborador',''));for(const p of P.selectable().filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))pSel.add(new Option(p.name+(p.jobName?' · '+p.jobName:''),p.id));pSel.value=keep;
  for(const k in modeBtns)modeBtns[k].setAttribute('aria-pressed',String(k===mode));
  title.textContent=mode==='week'?'Semana de '+dateBR(weekStart(ref))+' a '+dateBR(isoAdd(weekStart(ref),6)):mode==='month'?MONTHS[+ref.slice(5,7)-1]+' de '+ref.slice(0,4):'Ano '+ref.slice(0,4);
  const p=person();holidaysView();if(!p){area.append(el('p','profiles-note','Selecione o colaborador para ver e editar a escala.'));return}
  const w=storageWarning();if(w)area.append(w);(mode==='week'?weekView:mode==='month'?monthView:yearView)(p);setsView(p)}
 V.render=opts=>{if(opts?.personId)want=opts.personId;render()};V.reset=()=>{};
}

/* ---------- Ficha individual ---------- */
function section(p){load();const day=today(),ef=effective(p.id,day),sec=el('section','profiles-section jornada-file-section');sec.append(el('h3',null,'Horário e escala'));
 const rows=[['Cargo',p.jobName],['Setor',p.sector],['Modelo de horário',ef.shift?ef.shift.name+' · '+ef.shift.start+' às '+ef.shift.end:''],['Intervalo',ef.shift?breakText(ef.breakStart,ef.breakEnd)+(ef.ownBreak?' · individual':' · do modelo'):''],['Horário desde',ef.shiftLink?dateBR(ef.shiftLink.from):''],
  ['Modelo de escala',ef.scale?ef.scale.name+' · '+daysText(ef.scale.days):''],['Folga',ef.scale?offText(ef.scale.days):''],['Escala desde',ef.scaleLink?dateBR(ef.scaleLink.from):'']];
 const d=el('dl','profiles-info');for(const [k,v] of rows)d.append(el('dt',null,k),el('dd',null,v||'—'));sec.append(d);
 const next=[...upcoming(p.id,'shift',day),...upcoming(p.id,'scale',day)].sort((a,b)=>a.from.localeCompare(b.from));for(const n of next)sec.append(el('p','profiles-note','Programado: '+(n.kind==='shift'?'horário':'escala')+' "'+(modelOf(n)?.name||'—')+'" a partir de '+dateBR(n.from)+'.'));
 const ex=data.exceptions.filter(x=>x.personId===p.id&&!x.cancelledAt).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);if(ex.length)sec.append(el('p','profiles-note','Folgas e exceções recentes: '+ex.map(x=>dateBR(x.date)+' ('+x.kind+')').join(', ')+'.'));
 if(p.status==='ATIVO'){const tools=el('div','people-banner-tools');tools.append(button('Vincular horário',()=>show('shift-links')),button('Vincular escala',()=>show('scale-links')),button('Escala individual',()=>show('calendar',{personId:p.id})));sec.append(tools)}return sec}

window.showJornada=(key,opts)=>show(key,opts);
window.CicluzJornada={load,get:()=>data,weekMinutes,dayInfo,weekStart,shiftFor,netOf,effective,current,upcoming,linksOf,section,calc,daysText,offText,show};
})();
