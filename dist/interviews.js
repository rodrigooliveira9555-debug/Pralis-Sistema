/* Entrevista — first admission stage. Creates the candidate in the Gestão de Pessoas registry; later stages update the same record. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR,T=window.CicluzTimeBR,F=window.CicluzFieldRules;if(!P||!U||!DB||!T||!F)return;
const {el,button,iconButton,svg,ICON,fold,newId,dateBR,today,dialog,confirmDialog}=U;
const ACCENT='#7c3aed',PATH='Cadastros / Gestão de Pessoas / Entrevista',CHAT='M4 5h16v11H9l-5 4zM8 9h8M8 12h5';
const STATUSES=[['Agendada','p-yellow'],['Realizada','p-yellow'],['Aprovado para continuidade','p-green'],['Não aprovado','p-red'],['Cancelada','p-red']];
const pillOf=s=>(STATUSES.find(x=>x[0]===s)||[,''])[1];
const data=()=>P.get();
const interviewed=()=>data().people.filter(p=>p.interview);

const view=el('section','view');view.id='interviews-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(CHAT);const heading=el('div');heading.append(el('h2',null,'Entrevista'),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>openSection(sections[7][0],'Gestão de Pessoas','people-settings',ACCENT));
const addButton=button('',()=>{resetForm();formStatus.textContent='';nameIn.focus()},'shortcut-circle');addButton.title='Nova Entrevista';addButton.setAttribute('aria-label','Nova Entrevista');addButton.innerHTML=svg(ICON.plus);head.querySelector('.shortcut-actions').append(addButton);
body.append(el('div','form-note','Primeira etapa da admissão. O candidato aprovado segue para o Cadastro Simples pelo botão Dar Continuidade, com o mesmo registro. Dados guardados neste navegador.'));

const form=el('form','form-fields uniforms-form');form.noValidate=true;
const formTitle=el('h3','uniforms-wide uniforms-heading','Nova entrevista');
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const nameIn=el('input');nameIn.type='text';nameIn.maxLength=160;nameIn.autocomplete='off';
/* The label holds "CPF", so the platform's shared CPF mask applies while typing. */
const cpfIn=el('input');cpfIn.type='text';cpfIn.inputMode='numeric';cpfIn.maxLength=14;cpfIn.placeholder='000.000.000-00';cpfIn.autocomplete='off';
const dateIn=DB.field('Data da entrevista *');
const timeIn=el('input');timeIn.type='text';timeIn.inputMode='numeric';timeIn.maxLength=5;timeIn.placeholder='HH:MM';const times=el('datalist');times.id='interview-times';for(let h=7;h<=19;h++)for(const m of ['00','30'])times.append(new Option(String(h).padStart(2,'0')+':'+m));timeIn.setAttribute('list',times.id);timeIn.addEventListener('input',()=>{if(!/^\d{2}:\d{2}$/.test(timeIn.value))timeIn.value=T.mask(timeIn.value)});
const status=el('select');STATUSES.forEach(([s])=>status.add(new Option(s,s)));
const notes=el('textarea');notes.rows=4;notes.addEventListener('focusout',e=>e.stopPropagation());
const dup=el('div','uniforms-wide');
const formError=el('p','uniforms-wide profiles-error');formError.setAttribute('role','alert');const formStatus=el('p','uniforms-wide profiles-note');formStatus.setAttribute('role','status');
const actions=el('div','uniforms-wide actions');const save=el('button','btn','Salvar');save.type='submit';const cont=button('Dar Continuidade',()=>continueCandidate(draft.editingId));actions.append(button('Cancelar',()=>{resetForm();formStatus.textContent='Edição descartada.'}),cont,save);
form.append(formTitle,lbl('Nome completo do candidato *',nameIn),lbl('CPF *',cpfIn),dateIn.label,lbl('Horário da entrevista',timeIn),times,lbl('Status da entrevista *',status),lbl('Observações da entrevista',notes,'uniforms-wide'),dup,formError,formStatus,actions);
const history=el('div','uniforms-history');body.append(form,history);

let draft={editingId:null};
/* Duplicate CPF is checked while typing, against every person in the registry. */
function checkDuplicate(){dup.replaceChildren();const cpf=cpfIn.value.replace(/\D/g,'');if(cpf.length!==11)return null;const other=data().people.find(p=>p.cpf===cpf&&p.id!==draft.editingId);if(!other)return null;const box=el('p','people-alert');box.append(el('span',null,'Já existe cadastro com este CPF: '+other.name+' ('+({ATIVO:'colaborador ativo',INATIVO:'colaborador inativo',CANDIDATO:'candidato'})[other.status]+'). '));if(other.interview)box.append(button('Abrir entrevista existente',()=>editInterview(other)));else box.append(button('Ver ficha',()=>window.showCollaborators?.({personId:other.id})));dup.append(box);return other}
cpfIn.addEventListener('input',()=>{queueMicrotask(checkDuplicate)});
function renderCont(){const p=draft.editingId&&P.byId(draft.editingId);cont.hidden=!(p&&p.interview.status==='Aprovado para continuidade'&&!p.interview.continuedAt);status.disabled=!!p?.interview.continuedAt;if(p?.interview.continuedAt)status.title='Status fixado: o candidato já seguiu para o Cadastro Simples.';else status.removeAttribute('title')}
function resetForm(){draft={editingId:null};formTitle.textContent='Nova entrevista';nameIn.value='';cpfIn.value='';dateIn.set(today());timeIn.value='';status.value='Agendada';notes.value='';dup.replaceChildren();formError.textContent='';renderCont()}
function editInterview(p){draft={editingId:p.id};formTitle.textContent='Editar entrevista de '+p.name;nameIn.value=p.name;cpfIn.value=F.cpfMask(p.cpf);dateIn.set(p.interview.date);timeIn.value=p.interview.time||'';status.value=p.interview.status;notes.value=p.interview.notes||'';dup.replaceChildren();formError.textContent='';renderCont();formStatus.textContent=p.interview.continuedAt?'Este candidato já seguiu para o Cadastro Simples; nome e CPF continuam editáveis aqui e no Cadastro Simples.':'Editando a entrevista.';form.scrollIntoView({block:'start',behavior:'smooth'})}
form.onsubmit=e=>{e.preventDefault();formError.textContent='';formStatus.textContent='';const errors=[],cpf=cpfIn.value.replace(/\D/g,''),date=dateIn.iso(),own=draft.editingId&&P.byId(draft.editingId);
 if(!nameIn.value.trim())errors.push('Informe o nome completo do candidato.');if(!F.cpfValid(cpf))errors.push('Informe um CPF válido.');else if(checkDuplicate())errors.push('CPF já cadastrado: abra o registro existente em vez de criar outro.');
 if(!date)errors.push('Informe a data da entrevista (DD/MM/AAAA).');if(timeIn.value&&!T.valid(timeIn.value))errors.push('Horário inválido (HH:MM).');
 if(errors.length){formError.textContent=errors.join(' ');return}
 const now=new Date().toISOString(),fields={status:own?.interview.continuedAt?own.interview.status:status.value,date,time:timeIn.value,notes:notes.value};let id=own?.id;
 const ok=P.transact(d=>{let p=d.people.find(x=>x.id===id);if(!p){p={id:newId(),status:'CANDIDATO',flow:2,createdAt:now,history:[]};d.people.push(p);id=p.id;P.log(p,'Entrevista registrada ('+fields.status+').')}else if(p.interview.status!==fields.status)P.log(p,'Status da entrevista: '+p.interview.status+' → '+fields.status+'.');else P.log(p,'Entrevista atualizada.');
  p.name=nameIn.value.trim();p.cpf=cpf;p.interview={...(p.interview||{}),...fields,updatedAt:now,createdAt:p.interview?.createdAt||now}});
 if(!ok){formError.textContent='Não foi possível salvar neste navegador.';return}const p=P.byId(id);
 if(p.interview.status==='Aprovado para continuidade'&&!p.interview.continuedAt){editInterview(p);formStatus.textContent='Entrevista salva: '+p.name+' aprovado(a). Clique em Dar Continuidade para seguir ao Cadastro Simples.'}else{resetForm();formStatus.textContent='Entrevista salva: '+p.name+' · '+p.interview.status+'.'}renderHistory()};
function continueCandidate(id){const p=P.byId(id);if(!p||p.interview.status!=='Aprovado para continuidade'){formError.textContent='Marque o status Aprovado para continuidade e salve antes de dar continuidade.';return}
 confirmDialog('Dar continuidade?',p.name+' seguirá para o Cadastro Simples com nome e CPF já preenchidos. O mesmo registro acompanha todas as etapas.','Dar Continuidade',()=>P.transact(d=>{const x=d.people.find(y=>y.id===id);x.interview.continuedAt=new Date().toISOString();P.log(x,'Entrevista aprovada; continuidade para o Cadastro Simples.')})?null:'Não foi possível salvar neste navegador.',()=>{P.editSimple(id)})}

/* ---------- Histórico ---------- */
const hStatus=el('p','profiles-note');hStatus.setAttribute('role','status');const hTable=el('div','uniforms-table-wrap');history.append(el('h3','uniforms-heading','Histórico de entrevistas'),hStatus,hTable);
const stageOf=p=>{const s=P.stages(p).find(x=>x.state!=='done'&&x.state!=='legacy');return s?s.label:'Admissão concluída'};
function renderHistory(){P.load();hTable.replaceChildren();const list=interviewed().sort((a,b)=>(b.interview.date+(b.interview.time||'')).localeCompare(a.interview.date+(a.interview.time||'')));
 hStatus.textContent=list.length?list.length+' entrevista(s), da mais recente à mais antiga.':'Nenhuma entrevista registrada.';if(!list.length)return;
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Nome','CPF','Data','Horário','Status','Etapa atual','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const p of list){const iv=p.interview,tr=el('tr');if(iv.status==='Cancelada')tr.classList.add('is-cancelled');const st=el('td');st.append(el('span','pill '+pillOf(iv.status),iv.status));
  tr.append(el('td',null,p.name),el('td',null,P.maskCpf(p.cpf)),el('td',null,dateBR(iv.date)),el('td',null,iv.time||'—'),st,el('td',null,stageOf(p)));const a=el('td','uniforms-row-actions');
  a.append(iconButton('Visualizar Detalhes',ICON.eye,()=>showDetails(p)),iconButton('Editar entrevista',ICON.edit,()=>editInterview(p),'is-accent'));
  if(iv.status==='Aprovado para continuidade'&&!iv.continuedAt)a.append(iconButton('Dar Continuidade',ICON.ok,()=>continueCandidate(p.id),'is-accent'));
  if(!iv.continuedAt&&iv.status!=='Cancelada')a.append(iconButton('Cancelar entrevista',ICON.ban,()=>confirmDialog('Cancelar entrevista?','A entrevista de '+p.name+' ficará no histórico com o status Cancelada.','Confirmar cancelamento',()=>P.transact(d=>{const x=d.people.find(y=>y.id===p.id);x.interview.status='Cancelada';x.interview.updatedAt=new Date().toISOString();P.log(x,'Entrevista cancelada.')})?null:'Não foi possível salvar.',renderAll)));
  if(!iv.continuedAt)a.append(iconButton('Excluir entrevista',ICON.trash,()=>confirmDialog('Excluir entrevista?','O registro de '+p.name+' será removido. Ele ainda não seguiu para o Cadastro Simples. Esta ação não pode ser desfeita.','Confirmar exclusão',()=>P.transact(d=>{d.people=d.people.filter(x=>x.id!==p.id)})?null:'Não foi possível salvar.',()=>{if(draft.editingId===p.id)resetForm();renderHistory()}),'is-danger'));
  tr.append(a);tbody.append(tr)}table.append(thead,tbody);hTable.append(table)}
function renderAll(){if(draft.editingId){const p=P.byId(draft.editingId);if(p)editInterview(p);else resetForm()}renderHistory()}
function showDetails(p){dialog('Entrevista — '+p.name,(f,form)=>{const iv=p.interview,d=el('dl','profiles-info');for(const [k,v] of [['Nome completo',p.name],['CPF',F.cpfMask(p.cpf)],['Data',dateBR(iv.date)],['Horário',iv.time||'Não informado'],['Status',iv.status],['Continuidade',iv.continuedAt?'Seguiu para o Cadastro Simples em '+dateBR(iv.continuedAt.slice(0,10)):'Não'],['Etapa atual',stageOf(p)],['Observações',iv.notes||'Nenhuma']])d.append(el('dt',null,k),el('dd',null,v));form.append(d,P.stepper(p))})}

function showInterviews(opts={}){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Entrevista';P.load();resetForm();formStatus.textContent='';if(opts.personId){const p=P.byId(opts.personId);if(p?.interview)editInterview(p)}renderHistory();normalizeHeaderActions(view)}
window.showInterviews=showInterviews;
})();
