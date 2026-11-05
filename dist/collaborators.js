/* Colaboradores Cadastrados: list, admission tracking and the individual file. The file reads exams, occurrences and uniform movements by collaborator id; it copies nothing. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,F=window.CicluzFieldRules,PH=window.CicluzPhoneBR;if(!P||!U)return;
const {el,button,iconButton,svg,ICON,fold,dateBR,enumField,dialog,confirmDialog,uniformName,money}=U;
const ACCENT='#7c3aed',PATH='Cadastros / Gestão de Pessoas / Colaboradores Cadastrados';
const STATUS_PILL={ATIVO:['Ativo','p-green'],INATIVO:['Inativo','p-red'],CANDIDATO:['Em admissão','p-yellow']};
const data=()=>P.get();
const pill=(t,c)=>el('span','pill '+c,t);

const view=el('section','view');view.id='collaborators-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(ICON.user);const heading=el('div'),title=el('h2',null,'Colaboradores Cadastrados'),subtitle=el('p',null,PATH);heading.append(title,subtitle);head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
let back=()=>openSection(sections[7][0],'Gestão de Pessoas','people-settings',ACCENT);addShortcuts(view.id,()=>back());
const note=el('div','form-note','Central do Departamento Pessoal neste navegador. Exames, ocorrências e uniformes aparecem na ficha pelo identificador do colaborador. Colaboradores marcados como demonstrativos vieram dos exemplos anteriores.');
const tabs=el('div','uniforms-tabs');tabs.setAttribute('role','tablist');const tabDefs=[['list','Colaboradores'],['tracking','Acompanhamento da admissão']],tabBtn={},tabPanel={};
for(const [k,l] of tabDefs){const b=button(l,()=>selectTab(k),'uniforms-tab');b.setAttribute('role','tab');b.id='collab-tab-'+k;tabBtn[k]=b;tabs.append(b);const pnl=el('div','uniforms-section');pnl.setAttribute('role','tabpanel');pnl.setAttribute('aria-labelledby',b.id);tabPanel[k]=pnl}
const fileBox=el('div','uniforms-section people-file');
body.append(note,tabs,tabPanel.list,tabPanel.tracking,fileBox);
let active='list';
function selectTab(k){active=k;fileBox.hidden=true;tabs.hidden=false;for(const [x,b] of Object.entries(tabBtn)){b.setAttribute('aria-selected',String(x===k));b.tabIndex=x===k?0:-1;tabPanel[x].hidden=x!==k}title.textContent='Colaboradores Cadastrados';subtitle.textContent=PATH;back=()=>openSection(sections[7][0],'Gestão de Pessoas','people-settings',ACCENT);if(k==='list')renderList();else renderTracking()}

/* ---------- Lista ---------- */
const lp=tabPanel.list;
/* One simple name search (shared magnifier); candidates in progress stay in the Acompanhamento tab. */
const searchLabel=el('label','uniforms-simple-search','Buscar por nome'),fText=el('input');fText.type='search';fText.placeholder='Nome do colaborador…';fText.setAttribute('aria-label','Buscar colaborador por nome');searchLabel.append(fText);fText.addEventListener('input',()=>renderList());
const lStatus=el('p','profiles-note');lStatus.setAttribute('role','status');const lTable=el('div','uniforms-table-wrap');lp.append(el('h3','uniforms-heading','Colaboradores'),searchLabel,lStatus,lTable);
const lastDone=p=>[...P.stages(p)].reverse().find(s=>s.state==='done')?.label||'Nenhuma';
const canActivate=p=>p.status==='CANDIDATO'&&P.completeReady(p)&&p.complete?.status==='concluido';
const ORDER={ATIVO:0,CANDIDATO:1,INATIVO:2};
function renderList(){P.load();lTable.replaceChildren();const q=fold(fText.value);const all=data().people.filter(p=>p.status!=='CANDIDATO'||canActivate(p));const list=all.filter(p=>!q||fold(p.name).includes(q)).sort((a,b)=>ORDER[a.status]-ORDER[b.status]||a.name.localeCompare(b.name,'pt-BR'));
 const n=s=>all.filter(p=>p.status===s).length;lStatus.textContent=n('ATIVO')+' ativo(s) · '+n('INATIVO')+' inativo(s)'+(n('CANDIDATO')?' · '+n('CANDIDATO')+' aguardando ativação':'')+'. Ativos primeiro; candidatos em andamento ficam em Acompanhamento da admissão.';if(!list.length){lTable.append(el('p','profiles-empty',q?'Nenhum colaborador com esse nome.':'Nenhum colaborador cadastrado.'));return}
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Nome completo','CPF','Cargo','Setor','Admissão','Status','Etapa concluída','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const p of list){const tr=el('tr');if(p.status==='INATIVO')tr.classList.add('is-cancelled');const st=el('td');const [t,c]=STATUS_PILL[p.status]||[p.status,''];st.append(pill(t,c));if(p.demo)st.append(el('small','people-demo',' demonstrativo'));
  const nameBtn=button(p.name,()=>openFile(p.id),'profiles-job-link');const nc=el('td');nc.append(nameBtn);
  tr.append(nc,el('td',null,P.maskCpf(p.cpf)),el('td',null,p.jobName||'—'),el('td',null,p.sector||'—'),el('td',null,dateBR(p.admissionDate)),st,el('td',null,lastDone(p)));
  const a=el('td','uniforms-row-actions');a.append(iconButton('Visualizar Colaborador',ICON.eye,()=>openFile(p.id)));if(canActivate(p))a.append(iconButton('Ativar Colaborador',ICON.ok,()=>activateDialog(p),'is-accent'));if(p.status==='ATIVO')a.append(iconButton('Marcar como inativo',ICON.power,()=>inactiveDialog(p,true)));if(p.status==='INATIVO')a.append(iconButton('Reativar colaborador',ICON.power,()=>inactiveDialog(p,false),'is-accent'));tr.append(a);tbody.append(tr)}
 table.append(thead,tbody);lTable.append(table)}
function activateDialog(p,after=refresh){confirmDialog('Ativar colaborador?',p.name+' concluiu o Exame Admissional (APTO), o Período de Teste (aprovado) e o Cadastro Completo. Ao ativar, passa a constar como colaborador ativo e fica disponível em Ocorrências e Uniformes.','Ativar Colaborador',()=>P.activate(p.id),after)}
function inactiveDialog(p,inactive){confirmDialog(inactive?'Marcar como inativo?':'Reativar colaborador?',inactive?p.name+' continuará com todo o histórico, marcado como inativo. Nenhum desligamento é executado pelo sistema.':p.name+' voltará a constar como ativo.','Confirmar',()=>P.setInactive(p.id,inactive),refresh)}
function refresh(){if(!fileBox.hidden&&currentFile)openFile(currentFile);else selectTab(active)}

/* ---------- Acompanhamento ---------- */
const tp=tabPanel.tracking;const cand=enumField('Candidato','Buscar candidato');const trackBox=el('div','people-track');const trackTable=el('div','uniforms-table-wrap');const trackStatus=el('p','profiles-note');trackStatus.setAttribute('role','status');
const tBox=el('div','form-fields uniforms-selector');cand.label.classList.add('uniforms-wide');tBox.append(cand.label);
tp.append(el('h3','uniforms-heading','Acompanhamento da admissão'),el('p','profiles-note','Selecione um candidato para ver o progresso e a próxima etapa. Nada avança automaticamente quando há validações pendentes.'),tBox,trackBox,trackStatus,el('h3','uniforms-heading','Candidatos em admissão'),trackTable);
cand.search.addEventListener('input',()=>candOptions());cand.select.addEventListener('change',renderTrack);
function candOptions(cur=cand.select.value){const q=fold(cand.search.value);cand.select.replaceChildren(new Option('Selecione o candidato',''));for(const p of data().people.filter(x=>!x.demo))if(p.id===cur||(p.status==='CANDIDATO'&&fold(p.name).includes(q)))cand.select.add(new Option(p.name+(p.status==='CANDIDATO'?'':' (já ativado)'),p.id));cand.select.value=cur}
function nextActions(p){const s=P.stages(p),tools=el('div','people-banner-tools'),cur=s.find(x=>x.state!=='done'&&x.state!=='legacy');if(!cur){tools.append(button('Visualizar Colaborador',()=>openFile(p.id),'btn'));return tools}
 if(cur.key==='simple')tools.append(button('Abrir Cadastro Simples',()=>P.editSimple(p.id),'btn'));
 if(cur.key==='trial')tools.append(button(cur.state==='attention'?'Registrar decisão do Período de Teste':'Abrir Período de Teste',()=>window.showTrial?.({personId:p.id}),'btn'));
 if(cur.key==='exam')tools.append(button(cur.state==='progress'?'Registrar Resultado no Exame Admissional':'Agendar Exame Admissional',()=>window.showExams?.({personId:cur.state==='progress'?'':p.id,type:cur.state==='progress'?'':'ADMISSIONAL'}),'btn'));
 if(cur.key==='complete'){if(!p.complete?.token)tools.append(button('Gerar Link de Cadastro Completo',()=>{window.CicluzExams?.linkDialog(p.id);renderTrack()},'btn'));else tools.append(button('Abrir Cadastro Completo',()=>P.openComplete(p.id),'btn'),button('Copiar Link',async()=>{trackStatus.textContent=await P.copyLink(p.id)?'Link copiado. Ele funciona somente neste navegador.':'Não foi possível copiar o link.'}))}
 if(cur.key==='active')tools.append(button('Ativar Colaborador',()=>activateDialog(p,()=>{renderTrack()}),'btn'));
 tools.append(button('Visualizar ficha',()=>openFile(p.id)));return tools}
function renderTrack(){trackBox.replaceChildren();const p=P.byId(cand.select.value);if(!p){trackBox.append(el('p','profiles-empty','Nenhum candidato selecionado.'));return}const info=P.trialInfo(p);if(info?.alert&&!p.trial.decision)trackBox.append(el('p','people-alert',info.alert));trackBox.append(P.stepper(p),el('p','people-next',P.nextStep(p)),nextActions(p))}
const STAGE_PILL={done:'p-green',pending:'p-yellow',progress:'p-yellow',attention:'p-red',failed:'p-red',blocked:'p-red'};
function renderTracking(){P.load();candOptions();renderTrack();trackTable.replaceChildren();const list=data().people.filter(P.inAdmission);if(!list.length){trackTable.append(el('p','profiles-empty','Nenhum candidato em admissão. Inicie pelo Cadastro Simples.'));return}
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Candidato',...P.stages(list[0]).map(s=>s.label),''])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const p of list){const tr=el('tr');if(P.stages(p).some(s=>s.state==='attention'))tr.classList.add('is-attention');tr.append(el('td',null,p.name));for(const s of P.stages(p)){const td=el('td');td.append(pill(s.text,STAGE_PILL[s.state]||''));tr.append(td)}const a=el('td','uniforms-row-actions');a.append(iconButton('Ver acompanhamento de '+p.name,ICON.eye,()=>{cand.select.value=p.id;renderTrack();trackBox.scrollIntoView({block:'start',behavior:'smooth'})}));tr.append(a);tbody.append(tr)}table.append(thead,tbody);trackTable.append(table)}

/* ---------- Ficha individual ---------- */
let currentFile=null;
const sectionBox=(t,...children)=>{const s=el('section','profiles-section');s.append(el('h3',null,t),...children);return s};
const dl=rows=>{const d=el('dl','profiles-info');for(const [k,v] of rows)d.append(el('dt',null,k),el('dd',null,v||'—'));return d};
function tableOf(headers,rows,empty){if(!rows.length)return el('p','profiles-note',empty);const w=el('div','uniforms-table-wrap'),t=el('table','uniforms-table'),hr=el('tr');headers.forEach(h=>hr.append(el('th',null,h)));const th=el('thead');th.append(hr);const tb=el('tbody');for(const r of rows){const tr=el('tr');if(r.cancelled)tr.classList.add('is-cancelled');for(const c of r.cells){if(c instanceof Node){const td=el('td');td.append(c);tr.append(td)}else tr.append(el('td',null,c==null||c===''?'—':String(c)))}tb.append(tr)}t.append(th,tb);w.append(t);return w}
function openFile(id){P.load();const p=P.byId(id);if(!p)return selectTab('list');currentFile=id;tabs.hidden=true;Object.values(tabPanel).forEach(x=>x.hidden=true);fileBox.hidden=false;fileBox.replaceChildren();title.textContent=p.name;subtitle.textContent='Colaboradores Cadastrados / Ficha individual';back=()=>{currentFile=null;selectTab(active)};
 const registered=p.status==='ATIVO'||p.status==='INATIVO';const [st,sc]=STATUS_PILL[p.status]||[p.status,''];
 const top=el('div','people-file-top');top.append(pill(st,sc),el('span','profiles-note',p.demo?'Colaborador demonstrativo':P.nextStep(p)));
 const tools=el('div','people-banner-tools');tools.append(button('← Voltar à lista',()=>back()));
 if(registered){tools.append(button('Registrar Ocorrência',()=>window.CicluzOccurrences?.show({collaboratorId:p.id}),'btn'),button('Registrar Uniforme',()=>window.showUniforms?.('launch',{collaboratorId:p.id}),'btn'),button('Agendar Exame',()=>window.showExams?.({personId:p.id})))}
 else tools.append(nextActions(p));
 if(!p.demo)tools.append(button('Editar Cadastro Simples',()=>P.editSimple(p.id)));if(canActivate(p))tools.append(button('Ativar Colaborador',()=>activateDialog(p),'btn'));
 /* Período de Teste details (and a past Entrevista, when one exists) join the admission section. */
 const stagesSec=sectionBox('Etapas de admissão',P.stepper(p)),iv=p.interview,tr=p.trial,ti=P.trialInfo(p);
 if(ti?.alert&&!tr.decision)stagesSec.append(el('p','people-alert',ti.alert));
 if(iv){stagesSec.append(el('h4','people-subtitle','Entrevista'),dl([['Data e horário',dateBR(iv.date)+(iv.time?' às '+iv.time:'')],['Status',iv.status],['Continuidade',iv.continuedAt?'Em '+dateBR(iv.continuedAt.slice(0,10)):'Não'],['Observações',iv.notes]]))}
 if(tr){stagesSec.append(el('h4','people-subtitle','Período de Teste'),dl([['Período',dateBR(tr.start)+' a '+dateBR(tr.end)+' ('+tr.days+' dias corridos)'],['Status',tr.status],['Prazo',ti?.text],['Decisão do DP',tr.decision?(tr.decision==='aprovado'?'Aprovado para continuidade':'Não aprovado')+' em '+dateBR(tr.decidedAt.slice(0,10)):'Pendente'],['Observações',tr.notes]]))}
 fileBox.append(top,tools,stagesSec);
 /* Dados pessoais: Cadastro Simples + Cadastro Completo */
 const personal=[['Nome completo',p.name],['CPF',p.cpf&&F?F.cpfMask(p.cpf):''],['Data de nascimento',dateBR(p.birthDate)],['RG',p.rg],['Função / cargo',p.jobName],['Setor',p.sector],['Turno',p.shift],['Data de admissão',dateBR(p.admissionDate)],['WhatsApp',p.whatsapp&&PH?PH.mask(p.whatsapp):''],['Status',st+(p.activatedAt?' desde '+dateBR(p.activatedAt.slice(0,10)):'')]];
 const completeRows=p.complete?.summary||[];const sec=sectionBox('Dados Pessoais',dl(personal));sec.append(el('h4','people-subtitle','Cadastro Completo'),completeRows.length?dl(completeRows):el('p','profiles-note',p.demo?'Sem Cadastro Completo nesta demonstração.':'Cadastro Completo ainda não concluído.'));fileBox.append(sec);
 const deps=p.complete?.deps||[];const depSec=sectionBox('Dependentes');if(!deps.length)depSec.append(el('p','profiles-note',p.complete?.status==='concluido'?'Nenhum dependente informado.':'Disponível após o Cadastro Completo.'));deps.forEach((rows,i)=>{depSec.append(el('h4','people-subtitle','Dependente '+(i+1)),dl(rows))});fileBox.append(depSec);
 /* Documents: none are persisted; occurrence attachments exist only in this session's memory. */
 const occ=(window.CicluzOccurrences?.list()||[]).filter(r=>r.collaboratorId===p.id);const docs=[];for(const r of occ)for(const a of window.CicluzOccurrences.attachments(r.id))docs.push({r,a});
 const docSec=sectionBox('Documentos',el('p','profiles-note','Fotos e arquivos não são guardados nesta demonstração (Cadastro Completo e Ocorrências). Abaixo, apenas anexos de ocorrências carregados nesta sessão.'));docSec.append(tableOf(['Documento','Origem',''],docs.map(({r,a})=>({cells:[a.name,'Ocorrência '+r.type+' · '+dateBR(r.date),button('Visualizar',()=>viewDoc(a))]})),'Nenhum documento disponível nesta sessão.'));fileBox.append(docSec);
 const exams=data().exams.filter(e=>e.personId===p.id).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
 fileBox.append(sectionBox('Exames',tableOf(['Data','Tipo','Unidade','Status','Resultado'],exams.map(e=>({cancelled:e.scheduleStatus==='Cancelado',cells:[e.date?dateBR(e.date)+(e.time?' '+e.time:''):'—',e.type,e.unit,e.scheduleStatus,e.result]})),'Nenhum exame registrado.')));
 fileBox.append(sectionBox('Ocorrências',tableOf(['Data','Tipo','Dias','Status','Comunicado','Motivo'],occ.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>({cancelled:r.status==='Cancelada',cells:[dateBR(r.date),r.type,r.days||'—',r.status,r.communicated,(r.reason||'').slice(0,120)]})),'Nenhuma ocorrência registrada.')));
 let moves=[];try{window.CicluzUniformStore.load();moves=window.CicluzUniformStore.get().movements.filter(m=>m.collaboratorId===p.id)}catch{}const rows=[];for(const m of moves.sort((a,b)=>b.date.localeCompare(a.date)))for(const i of m.items)rows.push({cancelled:m.status==='CANCELADO',cells:[dateBR(m.date),m.type,uniformName(i.uniformId),i.quantity,m.type==='VENDIDO'&&Number.isInteger(i.unitPrice)?money(i.unitPrice*i.quantity):'—',({ATIVO:'Registrado',CORRIGIDO:'Corrigido',CANCELADO:'Cancelado'})[m.status]||m.status]});
 fileBox.append(sectionBox('Uniformes',tableOf(['Data','Movimentação','Uniforme','Quantidade','Valor da venda','Status'],rows,'Nenhuma movimentação de uniforme.')));
 /* Histórico geral: registry events plus records of the other tabs, newest first. */
 const events=[...(p.history||[]).map(h=>({at:h.at,text:h.text})),...occ.map(r=>({at:r.createdAt,text:'Ocorrência '+r.type+' de '+dateBR(r.date)+' · '+r.status+(r.revisions?.length?' (alterada '+r.revisions.length+'x)':'')})),...moves.map(m=>({at:m.createdAt,text:'Uniforme '+m.type+' em '+dateBR(m.date)+': '+m.items.map(i=>uniformName(i.uniformId)+' ×'+i.quantity).join(', ')+(m.status==='CANCELADO'?' · cancelado':m.status==='CORRIGIDO'?' · corrigido':'')}))].filter(e=>e.at).sort((a,b)=>String(b.at).localeCompare(String(a.at)));
 fileBox.append(sectionBox('Histórico Geral',tableOf(['Quando','Evento'],events.map(e=>({cells:[new Date(e.at).toLocaleString('pt-BR'),e.text]})),'Nenhum evento registrado.')));
 normalizeHeaderActions(view);view.querySelector('.content').scrollTo?.({top:0})}
function viewDoc(a){dialog(a.name,(f,form)=>{const fig=el('figure','occurrences-viewer');if(a.type==='application/pdf'){const fr=el('iframe');fr.src=a.url;fr.title=a.name;fig.append(fr)}else{const i=el('img');i.src=a.url;i.alt=a.name;fig.append(i)}form.append(fig)})}

function showCollaborators(opts={}){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Colaboradores Cadastrados';P.load();currentFile=null;
 if(opts.personId&&opts.tab!=='tracking'){selectTab('list');openFile(opts.personId)}else{selectTab(opts.tab==='tracking'?'tracking':'list');if(opts.personId){candOptions(opts.personId);renderTrack()}}normalizeHeaderActions(view)}
window.showCollaborators=showCollaborators;
})();
