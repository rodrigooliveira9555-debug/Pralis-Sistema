/* Período de Teste — between Cadastro Simples and Exame Admissional. Deadlines are recomputed on every render; approval is always the DP's manual decision. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!P||!U||!DB)return;
const {el,button,iconButton,svg,ICON,fold,dateBR,today,enumField,dialog,confirmDialog}=U;
const ACCENT='#7c3aed',PATH=menuCrumb(2,'Lançamentos Colaboradores','DES - Período de Teste'),HOURGLASS='M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9';
const STATUSES=['Aguardando início','Em andamento','Prazo encerrado','Aprovado para continuidade','Não aprovado','Cancelado'];
const DECISION_STATUS=new Set(['Aprovado para continuidade','Não aprovado']),DATE_STATUS=new Set(['Aguardando início','Em andamento','Prazo encerrado']);
const PILL={'Aguardando início':'p-yellow','Em andamento':'p-yellow','Prazo encerrado':'p-red','Aprovado para continuidade':'p-green','Não aprovado':'p-red',Cancelado:'p-red'};
const KIND_PILL={waiting:'p-yellow',running:'p-yellow',today:'p-red',ended:'p-red',approved:'p-green',rejected:'p-red',cancelled:'p-red'};
const data=()=>P.get();
const jobText=p=>p?[p.jobName,p.shift&&'Turno '+p.shift].filter(Boolean).join(' · '):'';
/* Only APTO candidates who still need the period: Cadastro Simples OK, exame admissional APTO, no decision yet. */
const eligible=p=>p.status==='CANDIDATO'&&P.isFlow2(p)&&P.trialReady(p)&&!p.trial?.decision;
const dateStatus=(start,end)=>{const t=today();return t<start?'Aguardando início':t>end?'Prazo encerrado':'Em andamento'};

const view=el('section','view');view.id='trial-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(HOURGLASS);const heading=el('div');heading.append(el('h2',null,'DES - Período de Teste'),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,'Lançamentos Colaboradores')());
const alerts=el('div','people-alerts');alerts.setAttribute('role','status');
body.append(el('div','form-note','Etapa de acompanhamento definida pelo DP, entre o Exame Admissional (APTO) e o Cadastro Completo com Dependente. Não gera contrato de experiência, folha, vínculo ou descontos. O prazo encerrado não aprova o candidato: a decisão é sempre do DP.'),alerts);

/* ---------- Formulário ---------- */
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const formTitle=el('h3','uniforms-wide uniforms-heading','Registrar período de teste');
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const cand=enumField('Colaborador *','Buscar candidato');
const jobOut=el('input');jobOut.readOnly=true;jobOut.placeholder='Selecione o candidato';
const start=DB.field('Data de início do teste *'),end=DB.field('Data final do teste *');
const daysOut=el('input');daysOut.readOnly=true;daysOut.placeholder='Calculado pelas datas';
const deadline=el('div','uniforms-wide occurrences-period');deadline.setAttribute('aria-live','polite');
const status=el('select');STATUSES.forEach(s=>{const o=new Option(s,s);if(DECISION_STATUS.has(s))o.disabled=true;status.add(o)});
const notes=el('textarea');notes.rows=4;notes.addEventListener('focusout',e=>e.stopPropagation());
const decision=el('div','uniforms-wide people-decision');
const formError=el('p','uniforms-wide profiles-error');formError.setAttribute('role','alert');const formStatus=el('p','uniforms-wide profiles-note');formStatus.setAttribute('role','status');
const actions=el('div','uniforms-wide actions');const save=el('button','btn','Salvar');save.type='submit';actions.append(button('Cancelar',()=>{resetForm();formStatus.textContent='Edição descartada.'}),save);
form.append(formTitle,cand.label,lbl('Função e turno',jobOut),start.label,end.label,lbl('Quantidade de dias',daysOut),lbl('Status do período de teste *',status),deadline,lbl('Observações',notes,'uniforms-wide'),decision,formError,formStatus,actions);
const history=el('div','uniforms-history');body.append(form,history);

function candOptions(cur=cand.select.value){const q=fold(cand.search.value);cand.select.replaceChildren(new Option('Selecione o candidato',''));const list=data().people.filter(p=>eligible(p)||p.id===cur);
 if(!list.length)cand.select.add(new Option('Nenhum candidato com exame admissional APTO aguardando o período',''));for(const p of list)if(p.id===cur||fold(p.name).includes(q))cand.select.add(new Option(p.name+(p.jobName?' · '+p.jobName:'')+(p.trial?.decision?' (decidido)':''),p.id));cand.select.value=cur}
cand.search.addEventListener('input',()=>candOptions());
cand.select.addEventListener('change',()=>{const p=P.byId(cand.select.value);if(p?.trial)loadTrial(p);else{jobOut.value=jobText(p);renderDates();renderDecision()}});
/* Dates drive the day count, the deadline indicator and, while no decision exists, the date-based status. */
function renderDates(){const s=start.iso(),e=end.iso();end.node.setCustomValidity(s&&e&&e<s?'A data final não pode ser anterior à inicial.':'');const n=P.trialDays(s,e);daysOut.value=n?n+' dia'+(n>1?'s':'')+' corrido'+(n>1?'s':''):'';
 const p=P.byId(cand.select.value);deadline.classList.remove('is-emphasis','is-alert');
 if(s&&e&&e<s){deadline.textContent='A data final não pode ser anterior à inicial.';deadline.classList.add('is-alert');return}
 if(!n){deadline.textContent='Informe início e fim para calcular a quantidade de dias e o prazo.';return}
 if(!p?.trial?.decision&&status.value!=='Cancelado'&&DATE_STATUS.has(status.value))status.value=dateStatus(s,e);
 const info=P.trialInfo({...p,trial:{...(p?.trial||{}),start:s,end:e,status:status.value}});deadline.textContent=(info.alert||'Prazo: '+info.text);if(info.alert)deadline.classList.add('is-alert');else if(info.kind==='running'||info.kind==='waiting')deadline.classList.add('is-emphasis')}
for(const f of [start,end])f.node.addEventListener('input',renderDates);status.addEventListener('change',renderDates);
function renderDecision(){decision.replaceChildren();const p=P.byId(cand.select.value);decision.append(el('span','uniforms-enum-label','Decisão do DP'));
 if(!p){decision.append(el('p','profiles-note','Selecione um candidato.'));return}
 if(p.trial?.decision){const ok=p.trial.decision==='aprovado';decision.append(el('p','people-next',(ok?'Continuidade aprovada':'Continuidade não aprovada')+' em '+dateBR(p.trial.decidedAt.slice(0,10))+'.'));if(ok&&p.status==='CANDIDATO')decision.append(button(p.complete?.token?'Ver link do Cadastro Completo':'Gerar Link de Cadastro Completo',()=>window.CicluzExams?.linkDialog(p.id),'btn'));return}
 if(!p.trial){decision.append(el('p','profiles-note','Salve o período de teste para registrar a decisão.'));return}
 const tools=el('div','people-banner-tools');tools.append(button('Aprovar Continuidade',()=>decide(p,true),'btn'),button('Não aprovar continuidade',()=>decide(p,false)));decision.append(tools)}
function resetForm(){cand.search.value='';candOptions('');jobOut.value='';start.set('');end.set('');status.value='Aguardando início';notes.value='';formTitle.textContent='Registrar período de teste';formError.textContent='';renderDates();renderDecision()}
function loadTrial(p){cand.search.value='';candOptions(p.id);jobOut.value=jobText(p);const t=p.trial||{};start.set(t.start||'');end.set(t.end||'');status.value=t.status||'Aguardando início';notes.value=t.notes||'';formTitle.textContent=(p.trial?'Período de teste de ':'Registrar período de teste de ')+p.name;formError.textContent='';renderDates();renderDecision()}
form.onsubmit=e=>{e.preventDefault();formError.textContent='';formStatus.textContent='';const p=P.byId(cand.select.value),s=start.iso(),f=end.iso(),errors=[];
 if(!p)errors.push('Selecione o candidato.');else if(!eligible(p)&&!p.trial)errors.push('Somente candidatos com exame admissional APTO podem iniciar o Período de Teste.');if(!s)errors.push('Informe a data de início (DD/MM/AAAA).');if(!f)errors.push('Informe a data final (DD/MM/AAAA).');if(s&&f&&f<s)errors.push('A data final não pode ser anterior à inicial.');
 if(errors.length){formError.textContent=errors.join(' ');return}
 const now=new Date().toISOString(),keep=p.trial?.decision;const st=keep?p.trial.status:status.value;
 const ok=P.transact(d=>{const x=d.people.find(y=>y.id===p.id);const first=!x.trial;x.trial={...(x.trial||{}),start:s,end:f,days:P.trialDays(s,f),status:st,notes:notes.value,updatedAt:now,createdAt:x.trial?.createdAt||now};P.log(x,first?'Período de Teste registrado: '+dateBR(s)+' a '+dateBR(f)+' ('+x.trial.days+' dias corridos).':'Período de Teste atualizado: '+dateBR(s)+' a '+dateBR(f)+' · '+st+'.')});
 if(!ok){formError.textContent='Não foi possível salvar neste navegador.';return}loadTrial(P.byId(p.id));renderAll();formStatus.textContent='Período de teste salvo: '+p.name+' · '+daysOut.value+'. Registre a decisão do DP ao final do prazo.'};
function decide(p,approve){const info=P.trialInfo(p),early=info&&(info.kind==='running'||info.kind==='waiting');
 confirmDialog(approve?'Aprovar continuidade?':'Não aprovar continuidade?',(approve?p.name+' será liberado(a) para o Cadastro Completo com Dependente.':p.name+' não seguirá para o Cadastro Completo. O histórico é mantido.')+(early?' Atenção: o período ainda não terminou ('+info.text+').':''),approve?'Aprovar Continuidade':'Confirmar não aprovação',()=>P.transact(d=>{const x=d.people.find(y=>y.id===p.id);x.trial.decision=approve?'aprovado':'reprovado';x.trial.decidedAt=new Date().toISOString();x.trial.status=approve?'Aprovado para continuidade':'Não aprovado';P.log(x,'Decisão do DP no Período de Teste: '+(approve?'aprovado para continuidade; liberado para o Cadastro Completo com Dependente.':'não aprovado; Cadastro Completo não liberado.'))})?null:'Não foi possível salvar neste navegador.',()=>{loadTrial(P.byId(p.id));renderAll();formStatus.textContent=approve?p.name+' aprovado(a) para continuidade. Gere o link do Cadastro Completo com Dependente.':'Decisão registrada: '+p.name+' não aprovado(a).'})}

/* ---------- Alertas e histórico ---------- */
function renderAlerts(){alerts.replaceChildren();for(const {p,info} of P.trialAlerts()){const box=el('div','people-alert');box.append(el('b',null,p.name+' — '+info.text),el('span',null,info.alert));const btn=button('Registrar decisão',()=>{loadTrial(p);form.scrollIntoView({block:'start',behavior:'smooth'})});box.append(btn);alerts.append(box)}}
const hStatus=el('p','profiles-note');hStatus.setAttribute('role','status');const hTable=el('div','uniforms-table-wrap');history.append(el('h3','uniforms-heading','Períodos de teste'),hStatus,hTable);
/* Pending decisions first (nearest deadline on top), decided periods afterwards. */
function renderHistory(){hTable.replaceChildren();const all=data().people.filter(p=>p.trial),list=[...all].sort((a,b)=>(a.trial.decision?1:0)-(b.trial.decision?1:0)||a.trial.end.localeCompare(b.trial.end));
 hStatus.textContent=all.length?all.length+' período(s) de teste · aguardando decisão primeiro.':'Nenhum período de teste registrado.';if(!list.length)return;
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Candidato','Cargo','Início','Fim','Dias','Status','Prazo','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const p of list){const t=p.trial,i=P.trialInfo(p),tr=el('tr');if(i&&(i.kind==='ended'||i.kind==='today'))tr.classList.add('is-attention');if(t.status==='Cancelado')tr.classList.add('is-cancelled');const st=el('td');st.append(el('span','pill '+PILL[t.status],t.status));const dl=el('td');dl.append(el('span','pill '+(KIND_PILL[i?.kind]||''),i?.text||'—'));
  tr.append(el('td',null,p.name),el('td',null,p.jobName||'—'),el('td',null,dateBR(t.start)),el('td',null,dateBR(t.end)),el('td','uniforms-num',String(t.days)),st,dl);const a=el('td','uniforms-row-actions');
  a.append(iconButton('Visualizar detalhes',ICON.eye,()=>details(p)),iconButton('Editar período',ICON.edit,()=>{loadTrial(p);form.scrollIntoView({block:'start',behavior:'smooth'})},'is-accent'));
  if(!t.decision&&t.status!=='Cancelado')a.append(iconButton('Aprovar Continuidade',ICON.ok,()=>decide(p,true),'is-accent'),iconButton('Não aprovar continuidade',ICON.ban,()=>decide(p,false)));
  if(t.decision==='aprovado'&&p.status==='CANDIDATO')a.append(iconButton(p.complete?.token?'Ver link do Cadastro Completo':'Gerar Link de Cadastro Completo',ICON.link,()=>window.CicluzExams?.linkDialog(p.id),'is-accent'));tr.append(a);tbody.append(tr)}table.append(thead,tbody);hTable.append(table)}
function details(p){dialog('Período de teste — '+p.name,(f,form)=>{const t=p.trial,i=P.trialInfo(p),d=el('dl','profiles-info');for(const [k,v] of [['Candidato',p.name],['Cargo',p.jobName||'Não informado'],['Início',dateBR(t.start)],['Fim',dateBR(t.end)],['Quantidade de dias',t.days+' dias corridos'],['Status',t.status],['Prazo',i?.text||'—'],['Decisão do DP',t.decision?(t.decision==='aprovado'?'Aprovado para continuidade':'Não aprovado')+' em '+dateBR(t.decidedAt.slice(0,10)):'Pendente'],['Observações',t.notes||'Nenhuma']])d.append(el('dt',null,k),el('dd',null,v));form.append(d)})}
function renderAll(){P.load();renderAlerts();candOptions();renderHistory()}

function showTrial(opts={}){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Período de Teste';P.load();resetForm();formStatus.textContent='';if(opts.personId){const p=P.byId(opts.personId);if(p)loadTrial(p)}renderAll();normalizeHeaderActions(view)}
window.showTrial=showTrial;
/* Module indicator: the Período de Teste card shows how many deadlines need a decision, recomputed whenever the card list is built. */
const cards=document.getElementById('sector-content');
if(cards)new MutationObserver(()=>{const card=cards.querySelector('.section-card[data-target=trial]');if(!card||card.querySelector('.people-card-alert'))return;P.load();const n=P.trialAlerts().length;if(n){const b=el('span','pill p-red people-card-alert',n+' alerta'+(n>1?'s':'')+' de prazo');card.querySelector('small')?.after(b)}}).observe(cards,{childList:true,subtree:true});
})();
