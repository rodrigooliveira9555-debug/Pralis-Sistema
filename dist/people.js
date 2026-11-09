/* Gestão de Pessoas — one registry for candidates and collaborators, keyed by id. Every tab reads it; names are never used as links. */
(()=>{
'use strict';
const D=window.CicluzUniformData,U=window.CicluzUniformUI,F=window.CicluzFieldRules,PH=window.CicluzPhoneBR;if(!D||!U||!F||!PH)return;
const {el,button,iconButton,svg,ICON,fold,newId,dateBR,confirmDialog}=U;
const KEY='cicluz-pessoas-v1',ACCENT='#7c3aed';

/* ---------- Registry ---------- */
let data={version:1,people:[],exams:[],companies:[]},loadError=false;
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){if(saved.version!==1||!Array.isArray(saved.people))throw Error('format');saved.exams=Array.isArray(saved.exams)?saved.exams:[];saved.companies=Array.isArray(saved.companies)?saved.companies:[];data=saved}loadError=false}catch{loadError=true}if(!loadError&&!data.seeded)seed()}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
/* The earlier demonstration collaborators keep their ids so existing uniform and occurrence records stay linked. */
function seed(){const now=new Date().toISOString();transact(d=>{for(const c of D.demoCollaborators)if(!d.people.some(p=>p.id===c.id))d.people.push({id:c.id,name:c.name,jobName:c.jobName,status:c.active?'ATIVO':'INATIVO',demo:true,createdAt:now,history:[{at:now,text:'Colaborador demonstrativo incluído no cadastro único.'}]});d.seeded=true})}
load();
const byId=id=>data.people.find(p=>p.id===id);
const log=(p,text)=>{(p.history=p.history||[]).push({at:new Date().toISOString(),text})};
const maskCpf=v=>{const d=String(v||'').replace(/\D/g,'');return d.length===11?'•••.'+d.slice(3,6)+'.'+d.slice(6,9)+'-••':'—'};
const admissionExams=p=>data.exams.filter(e=>e.personId===p.id&&e.type==='ADMISSIONAL'&&e.scheduleStatus!=='Cancelado').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
const isApto=p=>admissionExams(p).some(e=>e.result==='APTO');
/* Who appears in uniforms and occurrences: registered collaborators, not candidates. */
function selectable(){load();return data.people.filter(p=>p.status==='ATIVO'||p.status==='INATIVO').map(p=>({id:p.id,name:p.name,jobName:p.jobName||'',active:p.status==='ATIVO'}))}

/* Período de Teste deadlines, computed from today's date whenever a screen renders; no background jobs. */
const dayDiff=(a,b)=>Math.round((Date.parse(b+'T12:00:00')-Date.parse(a+'T12:00:00'))/864e5);
const trialDays=(start,end)=>start&&end&&end>=start?dayDiff(start,end)+1:null;
const ENDED_ALERT='O período de teste deste candidato foi encerrado. É necessário registrar a decisão do Departamento Pessoal.';
function trialInfo(p){const t=p.trial;if(!t?.start||!t?.end)return null;if(t.decision==='aprovado')return {kind:'approved',text:'Aprovado para continuidade'};if(t.decision==='reprovado')return {kind:'rejected',text:'Não aprovado'};if(t.status==='Cancelado')return {kind:'cancelled',text:'Cancelado'};
 const today=U.today();if(today<t.start)return {kind:'waiting',text:'Aguardando início em '+dateBR(t.start)+' (faltam '+dayDiff(today,t.start)+' dia(s))'};if(today===t.end)return {kind:'today',text:'Vence hoje ('+dateBR(t.end)+')',alert:'O período de teste deste candidato termina hoje. Prepare a decisão do Departamento Pessoal.'};
 if(today<t.end){const n=dayDiff(today,t.end);return {kind:'running',text:'Em andamento · '+n+' dia'+(n>1?'s':'')+' restante'+(n>1?'s':'')}}return {kind:'ended',text:'Prazo encerrado em '+dateBR(t.end)+' · aguardando decisão do DP',alert:ENDED_ALERT}}
/* Candidates created by the current flow (flow 2) pass through Período de Teste; earlier records keep the previous one.
   Order: Cadastro Simples → Exame Admissional (APTO) → Período de Teste (aprovado) → Cadastro Completo → ativação. */
const isFlow2=p=>p.flow===2;
const examReady=p=>p.simple?.status==='ok';
const trialReady=p=>isFlow2(p)&&p.simple?.status==='ok'&&isApto(p);
const completeReady=p=>isApto(p)&&(!isFlow2(p)||p.trial?.decision==='aprovado');
/* Records left by the removed Entrevista tab without approval stay in the history but out of the admission lists. */
const inAdmission=p=>!p.demo&&p.status==='CANDIDATO'&&!(p.interview&&p.interview.status!=='Aprovado para continuidade'&&!p.simple);

/* Five admission stages, derived from the records — never stored separately, so they cannot disagree. */
function stages(p){const s=[];const simpleOk=p.simple?.status==='ok',exam=admissionExams(p)[0],apto=isApto(p),complete=p.complete?.status==='concluido',active=p.status==='ATIVO'||p.status==='INATIVO',v2=isFlow2(p),tr=trialInfo(p);
 const LABELS=[['simple','Cadastro Simples'],['exam','Exame Admissional'],['trial','Período de Teste'],['complete','Cadastro Completo'],['active','Colaborador Cadastrado']];
 if(p.demo)return LABELS.map(([k,l],i)=>({key:k,label:l,state:i===4?'done':'legacy',text:i===4?(p.status==='ATIVO'?'Ativo':'Inativo'):'Cadastro anterior (demonstração)'}));
 s.push({key:'simple',label:'Cadastro Simples',...(!p.simple?{state:'pending',text:'Cadastro pendente'}:!simpleOk?{state:'progress',text:'Cadastro em andamento'}:{state:'done',text:'Cadastro OK'})});
 s.push({key:'exam',label:'Exame Admissional',...(!examReady(p)?{state:'blocked',text:'Bloqueada: Cadastro Simples não está OK'}:apto?{state:'done',text:'APTO'}:!exam?{state:'pending',text:'Pendente: agendar exame'}:exam.result==='NÃO APTO'?{state:'failed',text:'NÃO APTO · acompanhamento do DP'}:{state:'progress',text:exam.scheduleStatus+(exam.date?' · '+dateBR(exam.date)+(exam.time?' '+exam.time:''):'')+' · aguardando resultado'})});
 s.push({key:'trial',label:'Período de Teste',...(!v2?{state:'legacy',text:'Não registrado (cadastro anterior)'}:tr?.kind==='approved'?{state:'done',text:tr.text}:!trialReady(p)?{state:'blocked',text:'Bloqueada: exame admissional sem resultado APTO'}:!tr?{state:'pending',text:'Pendente: registrar início e fim'}:tr.kind==='rejected'||tr.kind==='cancelled'?{state:'failed',text:tr.text}:tr.kind==='ended'||tr.kind==='today'?{state:'attention',text:tr.text}:{state:'progress',text:tr.text})});
 s.push({key:'complete',label:'Cadastro Completo',...(!completeReady(p)?{state:'blocked',text:!apto?'Bloqueada: exame admissional sem resultado APTO':'Bloqueada: Período de Teste sem aprovação'}:complete?{state:'done',text:'Concluído em '+dateBR(p.complete.savedAt?.slice(0,10))}:p.complete?.token?{state:'progress',text:'Link gerado · aguardando preenchimento'}:{state:'pending',text:'Pendente: gerar link'})});
 s.push({key:'active',label:'Colaborador Cadastrado',...(active?{state:'done',text:p.status==='ATIVO'?'Ativo desde '+dateBR(p.activatedAt?.slice(0,10)):'Inativo'}:!complete?{state:'blocked',text:'Ainda não ativado'}:{state:'pending',text:'Aguardando ativação pelo DP'})});
 return s}
function nextStep(p){const s=stages(p),cur=s.find(x=>x.state!=='done'&&x.state!=='legacy');if(!cur)return 'Fluxo de admissão concluído.';const tr=trialInfo(p);return ({trial:cur.state==='failed'?'Período de Teste '+tr.text.toLowerCase()+': registro mantido, sem liberar o Cadastro Completo.':cur.state==='attention'?tr.alert:tr?'Acompanhe o Período de Teste e registre a decisão do DP ao final.':'Registre o Período de Teste.',simple:p.simple?'Revise o Cadastro Simples e marque como OK.':'Preencha e salve o Cadastro Simples.',exam:cur.state==='failed'?'Resultado NÃO APTO registrado: o DP decide o acompanhamento; o fluxo não avança automaticamente.':cur.state==='progress'?'Registre o resultado do exame quando recebido; com APTO, o candidato segue para o Período de Teste.':'Agende o Exame Admissional.',complete:p.complete?.token?'Abra o link e conclua o Cadastro Completo.':'Gere o link do Cadastro Completo.',active:'Confira os dados e ative o colaborador.'})[cur.key]}
const STATE_LABEL={pending:'Pendente',progress:'Em andamento',done:'Concluída',blocked:'Bloqueada',failed:'Não aprovado',attention:'Atenção',legacy:'Anterior'};
/* Candidates whose Período de Teste needs the DP's attention today. */
function trialAlerts(){return data.people.filter(p=>p.status==='CANDIDATO'&&isFlow2(p)).map(p=>({p,info:trialInfo(p)})).filter(x=>x.info&&(x.info.kind==='ended'||x.info.kind==='today'))}
function stepper(p){const ss=stages(p),now=ss.findIndex(s=>s.state!=='done'&&s.state!=='legacy');return window.CicluzStepper.create({layout:'timeline',label:'Etapas de admissão',steps:ss.map(s=>({label:s.label,state:s.state,status:STATE_LABEL[s.state],text:s.text})),current:now}).el}

/* Demonstration link: a random token tied to the person; no CPF/RG in the URL. Works only inside this browser. */
const linkFor=p=>p.complete?.token?location.origin+location.pathname+'#cadastro-completo/'+p.complete.token:'';
function generateLink(id){const p=byId(id);if(!p||!completeReady(p))return null;if(p.complete?.token)return linkFor(p);transact(d=>{const x=d.people.find(y=>y.id===id);x.complete={...(x.complete||{}),token:newId(),linkAt:new Date().toISOString(),status:x.complete?.status||'pendente'};log(x,'Link do Cadastro Completo gerado (demonstração local).')});return linkFor(byId(id))}
async function copyLink(id){const link=linkFor(byId(id));if(!link)return false;try{await navigator.clipboard.writeText(link);return true}catch{const t=el('textarea');t.value=link;document.body.append(t);t.select();const ok=document.execCommand('copy');t.remove();return ok}}
function activate(id){const p=byId(id);if(!p||p.complete?.status!=='concluido'||!completeReady(p)||p.status==='ATIVO')return 'Para ativar, o exame admissional deve estar APTO, o Período de Teste aprovado e o Cadastro Completo concluído.';return transact(d=>{const x=d.people.find(y=>y.id===id);x.status='ATIVO';x.activatedAt=new Date().toISOString();log(x,'Colaborador ativado pelo DP.')})?null:'Não foi possível salvar neste navegador.'}
/* Desligamento: the collaborator stays ATIVO while it is in progress; only the DP's confirmation makes it INATIVO. Nothing is deleted. */
const inDismissal=p=>p?.status==='ATIVO'&&p.dismissal?.status==='andamento';
const dismissalExams=p=>data.exams.filter(e=>e.personId===p.id&&e.type==='DEMISSIONAL'&&e.scheduleStatus!=='Cancelado'&&(!p.dismissal?.startedAt||String(e.createdAt)>=p.dismissal.startedAt)).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
function startDismissal(id){const p=byId(id);if(!p||p.status!=='ATIVO')return 'Somente colaboradores ativos podem iniciar o desligamento.';if(inDismissal(p))return null;
 return transact(d=>{const x=d.people.find(y=>y.id===id);if(x.dismissal)(x.pastDismissals=x.pastDismissals||[]).push(x.dismissal);x.dismissal={status:'andamento',startedAt:new Date().toISOString()};log(x,'Desligamento iniciado: em andamento, encaminhado ao Exame Demissional.')})?null:'Não foi possível salvar neste navegador.'}
function concludeDismissal(id,{date,notes}){const p=byId(id);if(!inDismissal(p))return 'Este colaborador não tem desligamento em andamento.';const exam=dismissalExams(p)[0];
 return transact(d=>{const x=d.people.find(y=>y.id===id),now=new Date().toISOString();x.status='INATIVO';x.dismissal={...x.dismissal,status:'concluido',date,notes:notes||'',examId:exam?.id||null,examResult:exam?exam.result:null,concludedAt:now};log(x,'Desligamento concluído pelo DP em '+dateBR(date)+'; colaborador marcado como inativo. Exame demissional: '+(exam?exam.result+' ('+exam.scheduleStatus+')':'não registrado')+'.')})?null:'Não foi possível salvar neste navegador.'}
function cancelDismissal(id){const p=byId(id);if(!inDismissal(p))return null;return transact(d=>{const x=d.people.find(y=>y.id===id);x.dismissal={...x.dismissal,status:'cancelado',cancelledAt:new Date().toISOString()};log(x,'Desligamento cancelado pelo DP; colaborador segue ativo.')})?null:'Não foi possível salvar neste navegador.'}
function setInactive(id,inactive){return transact(d=>{const x=d.people.find(y=>y.id===id);x.status=inactive?'INATIVO':'ATIVO';log(x,inactive?'Colaborador marcado como inativo.':'Colaborador reativado.')})?null:'Não foi possível salvar neste navegador.'}

/* ---------- Etapa 1: Cadastro Simples — the admission starts here ---------- */
const simpleView=document.getElementById('cadastro-simples'),simpleFields=simpleView?.querySelector('.form-fields');
if(simpleView&&simpleFields){
 const DB=window.CicluzDateBR;
 /* Turno keeps the options the platform form already offered; the static demo inputs are replaced. */
 const shiftOptions=[...simpleFields.querySelectorAll('select')].find(s=>/Turno/.test(s.closest('label')?.textContent||''))?.querySelectorAll('option');
 const SHIFTS=shiftOptions?[...shiftOptions].map(o=>o.textContent.trim()).filter(t=>t&&t!=='Selecione'):['Manhã','Tarde','Integral'];
 simpleFields.replaceChildren();
 simpleView.querySelector('.form-note').textContent='Primeira etapa da admissão. Salvar Cadastro mantém em andamento; Marcar Cadastro como OK conclui a etapa e libera o Exame Admissional.';
 [...simpleView.querySelectorAll('.content > p')].forEach(p=>{if(/Endereço, dependentes/.test(p.textContent))p.remove()});
 const lbl=(name,node)=>{const l=el('label',null,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
 const nameIn=el('input');nameIn.type='text';nameIn.maxLength=120;nameIn.autocomplete='off';nameIn.placeholder='Nome completo do candidato';
 /* The shared CPF rule (label "CPF") masks and checks the digits. */
 const cpfIn=el('input');cpfIn.type='text';cpfIn.inputMode='numeric';cpfIn.maxLength=14;cpfIn.placeholder='000.000.000-00';cpfIn.autocomplete='off';
 const phone=el('input');phone.type='tel';phone.inputMode='tel';phone.placeholder='(32) 99999-9999';phone.maxLength=15;phone.autocomplete='tel';phone.addEventListener('input',()=>{phone.value=PH.mask(phone.value)});
 /* Text input with e-mail keyboard: format is checked here, so the browser bubble never pre-empts the message. */
 const email=el('input');email.type='text';email.inputMode='email';email.autocomplete='email';email.maxLength=120;email.placeholder='nome@exemplo.com';email.addEventListener('focusout',e=>e.stopPropagation());
 const birth=DB.field('Data de nascimento *');
 const job=U.enumField('Função *','Buscar função');
 const shift=el('select');shift.add(new Option('Selecione',''));SHIFTS.forEach(s=>shift.add(new Option(s,s)));
 const dup=el('div');
 /* One cargo (Função) and, optionally, several áreas/setores/locais by id (Estrutura organizacional). Options follow the
   cargo's Ficha when it lists units; still-valid choices survive a change of cargo. Empty never blocks the flow. */
const orgBox=el('fieldset','people-org');const orgPicked=new Set();const orgList=el('div','people-org-list'),orgNote=el('p','profiles-note'),orgErr=el('p','people-org-error');orgBox.append(el('legend',null,'Áreas, setores e locais (opcional)'),orgNote,orgList,orgErr);
function orgAllowed(){const O=window.CicluzOrg;if(!O)return [];const all=O.flat().filter(n=>!n.inactive||orgPicked.has(n.id));const card=window.CicluzJobCards?.forJobName(job.select.value)?.card;const ids=card?.unitIds?.length?new Set(card.unitIds):null;return ids?all.filter(n=>ids.has(n.id)||orgPicked.has(n.id)):all}
function renderOrg(){const list=orgAllowed();const card=window.CicluzJobCards?.forJobName(job.select.value)?.card;orgList.replaceChildren();
 orgNote.textContent=!list.length?'Nenhuma área cadastrada em DES - Área / Setor / Local.':card?.unitIds?.length?'Mostrando as unidades ligadas à Ficha do cargo '+job.select.value+'.':'Sem ficha de cargo com unidades: todas as unidades ativas são exibidas.';
 for(const n of list){const l=el('label','profiles-choice profiles-unit'),c=el('input');c.type='checkbox';c.checked=orgPicked.has(n.id);c.onchange=()=>{c.checked?orgPicked.add(n.id):orgPicked.delete(n.id);paintOrg()};l.style.setProperty('--unit-indent',String(n.level-1));l.append(c,el('span',null,n.name+(n.inactive?' (inativo)':'')),el('small',null,n.levelName));orgList.append(l)}paintOrg()}
function paintOrg(){const bad=window.CicluzOrg?.invalidSelection([...orgPicked])||[];orgErr.textContent=bad.length?'Combinação inválida: '+bad.join('; ')+'.':''}
function orgSet(ids){orgPicked.clear();for(const id of ids||[])orgPicked.add(id);renderOrg()}
job.select.addEventListener('change',()=>{const allowed=new Set(orgAllowed().map(n=>n.id));for(const id of [...orgPicked])if(!allowed.has(id))orgPicked.delete(id);renderOrg()});
simpleFields.append(lbl('Nome completo *',nameIn),lbl('CPF *',cpfIn),lbl('WhatsApp *',phone),lbl('E-mail',email),birth.label,job.label,lbl('Turno *',shift),orgBox);
 const err=el('p','profiles-error');err.setAttribute('role','alert');const msg=el('p','profiles-note');msg.setAttribute('role','status');
 const title=el('h3','uniforms-heading','Novo cadastro simples');simpleFields.before(title);
 /* Foto do documento: o aparelho lê nome, CPF e data de nascimento (nada sai do navegador) e só preenche os campos; a imagem não é guardada aqui, ela vai depois para a pasta do colaborador em Documentos. */
 const scanBox=CicluzDocCapture.create('Foto do documento','Fotografe ou selecione o RG, o CPF ou a CNH: o nome, o CPF e a data de nascimento são preenchidos abaixo. WhatsApp e e-mail são digitados.',{tipos:['RG','CPF','CNH'],frenteVerso:true});
 let lido={};
 scanBox.addEventListener('doc-capture',async e=>{const {file,block,side}=e.detail,kind=CicluzDocCapture.tipo(block);CicluzDocCapture.estado(block,{texto:'Lendo o '+kind+'…',ativo:false});
  try{const text=(await window.CicluzOccurrenceReader.read(file,p=>CicluzDocCapture.estado(block,{texto:'Lendo o '+kind+'… '+p+'%',ativo:false}))).text,extraido=window.CicluzIdentityReader.extract(text),done=[];if(side!=='verso')lido={};for(const k of Object.keys(extraido))if(!lido[k])lido[k]=extraido[k];const found=lido;
   if(found.name){nameIn.value=found.name;done.push('nome')}if(found.cpf){cpfIn.value=F.cpfMask(found.cpf);done.push('CPF')}if(found.birth){birth.set(found.birth);done.push('data de nascimento')}
   for(const x of [nameIn,cpfIn])x.dispatchEvent(new Event('input',{bubbles:true}));
   CicluzDocCapture.estado(block,{texto:done.length?'Preenchido: '+done.join(', ')+'. Confira antes de salvar.':'Não consegui ler este documento. Tire outra foto, de frente, com boa luz e sem reflexo.'})}
  catch{CicluzDocCapture.estado(block,{texto:'Não foi possível ler a foto neste aparelho. Preencha os campos à mão.'})}
  finally{CicluzDocCapture.estado(block,{ativo:true})}});
 title.after(scanBox);
 const actions=el('div','actions people-simple-actions');const saveBtn=button('Salvar Cadastro',()=>saveSimple(false),'btn');const okBtn=button('Marcar Cadastro como OK',()=>saveSimple(true),'btn secondary footer-save-accent');actions.append(button('Cancelar',cancelSimple),okBtn,saveBtn);
 simpleFields.after(dup,err,msg,actions);
 const list=el('div','uniforms-history people-simple-list');const listStatus=el('p','profiles-note');const listTable=el('div','uniforms-table-wrap');list.append(el('h3','uniforms-heading','Acompanhamento dos candidatos'),listStatus,listTable);simpleView.querySelector('.content').append(list);
 let editing=null,dirty=false,busy=false;
 function jobOptions(cur=job.select.value){let jobs=[];try{jobs=[...new Set(jobsCurrent().map(e=>e.j.nome))].sort((a,b)=>a.localeCompare(b,'pt-BR'))}catch{}const q=fold(job.search.value);job.select.replaceChildren(new Option('Selecione a função',''));for(const j of jobs)if(j===cur||fold(j).includes(q))job.select.add(new Option(j,j));if(cur&&!jobs.includes(cur))job.select.add(new Option(cur,cur));job.select.value=cur}
 job.search.addEventListener('input',()=>jobOptions());
 /* One person per CPF: an existing record is opened instead of creating another. */
 function duplicateOf(){const cpf=cpfIn.value.replace(/\D/g,'');if(cpf.length!==11)return null;return data.people.find(p=>p.cpf===cpf&&p.id!==editing)||null}
 function checkDuplicate(){dup.replaceChildren();const other=duplicateOf();if(!other)return null;const box=el('p','people-alert');box.append(el('span',null,'Já existe cadastro com este CPF: '+other.name+' ('+({ATIVO:'colaborador ativo',INATIVO:'colaborador inativo',CANDIDATO:'candidato em admissão'})[other.status]+'). '));
  box.append(other.status==='CANDIDATO'?button('Abrir cadastro existente',()=>{dirty=false;selectCandidate(other.id)},'btn'):button('Ver em Colaboradores Cadastrados',()=>window.showCollaborators?.({personId:other.id}),'btn'));dup.append(box);return other}
 cpfIn.addEventListener('input',()=>queueMicrotask(checkDuplicate));
 function paintButtons(){saveBtn.disabled=okBtn.disabled=busy||loadError;const locked=!!(editing&&byId(editing)?.simple?.status==='ok');cpfIn.readOnly=locked;cpfIn.tabIndex=locked?-1:0;cpfIn.title=locked?'CPF confirmado no Cadastro Simples OK.':''}
 function fill(p){editing=p?.id||null;nameIn.value=p?.name||'';cpfIn.value=p?.cpf?F.cpfMask(p.cpf):'';phone.value=p?.whatsapp?PH.mask(p.whatsapp):'';email.value=p?.email||'';birth.set(p?.birthDate||'');jobOptions(p?.jobName||'');shift.value=p?.shift||'';orgSet(p?.orgUnitIds||[]);title.textContent=p?'Cadastro simples de '+p.name:'Novo cadastro simples';dirty=false;err.textContent='';dup.replaceChildren();paintButtons()}
 function selectCandidate(id){if(dirty&&editing!==id){confirmDialog('Descartar alterações?','As alterações não salvas serão descartadas.','Descartar',()=>{loadCandidate(id);return null},()=>{});return}loadCandidate(id)}
 function loadCandidate(id){load();fill(id?byId(id):null);msg.textContent=id?(byId(id).simple?.status==='ok'?'Cadastro já marcado como OK; alterações salvas continuam válidas.':'Complete os campos e salve.'):''}
 /* Any correction clears the previous message, so it never contradicts the browser's own field warning. */
 for(const n of [nameIn,cpfIn,phone,email,birth.node,shift])n.addEventListener('input',()=>{dirty=true;err.textContent=''});shift.addEventListener('change',()=>{dirty=true});job.select.addEventListener('change',()=>{dirty=true});
 function resetSimple(){fill(null)}
 function cancelSimple(){if(!dirty){resetSimple();msg.textContent='Nenhuma alteração pendente.';return}confirmDialog('Cancelar edição?','As alterações não salvas serão descartadas. Nenhum cadastro salvo é excluído e o status do candidato não muda.','Descartar alterações',()=>{const id=editing;resetSimple();if(id)loadCandidate(id);msg.textContent='Alterações descartadas.';return null},()=>{})}
 function validateSimple(){load();const errors=[],b=birth.iso(),cpf=cpfIn.value.replace(/\D/g,'');
  if(!nameIn.value.trim())errors.push('Informe o nome completo.');
  if(!F.cpfValid(cpf))errors.push(cpf?'CPF inválido.':'Informe o CPF.');else if(checkDuplicate())errors.push('CPF já cadastrado: abra o registro existente em vez de criar outro.');
  if(!PH.valid(phone.value))errors.push(phone.value?'WhatsApp inválido. Use DDD + número, ex.: (32) 99999-9999.':'Informe o WhatsApp.');
  if(email.value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim()))errors.push('E-mail em formato inválido.');
  if(!birth.node.value)errors.push('Informe a data de nascimento.');else if(!b)errors.push('Data de nascimento inválida (DD/MM/AAAA).');else if(b>U.today())errors.push('A data de nascimento não pode ser futura.');
  if(!job.select.value)errors.push('Selecione a função.');if(!shift.value)errors.push('Selecione o turno.');return errors}
 /* Salvar keeps the stage in progress; Marcar como OK is the official conclusion, confirmed once. */
 function saveSimple(markOk){if(busy)return;err.textContent='';msg.textContent='';const errors=validateSimple();{const bad=window.CicluzOrg?.invalidSelection([...orgPicked])||[];if(bad.length)errors.push('Áreas, setores e locais: combinação inválida ('+bad.join('; ')+').')}if(errors.length){err.textContent=errors.join(' ');return}
  const name=nameIn.value.trim(),cur=editing&&byId(editing);const commit=()=>{busy=true;paintButtons();const now=new Date().toISOString(),fields={name,cpf:cpfIn.value.replace(/\D/g,''),whatsapp:PH.digits(phone.value),email:email.value.trim(),birthDate:birth.iso(),jobName:job.select.value,shift:shift.value,orgUnitIds:[...orgPicked]};{const sec=window.CicluzOrg?.namesOf(fields.orgUnitIds,2)||[];if(sec.length)fields.sector=sec.join(', ')}let id=editing;
   const ok=transact(d=>{let x=id&&d.people.find(y=>y.id===id);if(!x){x={id:newId(),status:'CANDIDATO',flow:2,createdAt:now,history:[]};d.people.push(x);id=x.id;log(x,'Candidato incluído pelo Cadastro Simples.')}if(x.simple?.status==='ok')fields.cpf=x.cpf;if(x.jobName&&x.jobName!==fields.jobName)log(x,'Cargo alterado de '+x.jobName+' para '+(fields.jobName||'—')+'.');if(JSON.stringify(x.orgUnitIds||[])!==JSON.stringify(fields.orgUnitIds))log(x,'Áreas/setores/locais: '+((window.CicluzOrg?.namesOf(fields.orgUnitIds)||[]).join(', ')||'nenhum')+'.');Object.assign(x,fields);const wasOk=x.simple?.status==='ok';x.simple={status:markOk||wasOk?'ok':'andamento',savedAt:now,okAt:markOk&&!wasOk?now:x.simple?.okAt};log(x,markOk&&!wasOk?'Cadastro Simples marcado como OK; liberado para o Exame Admissional.':'Cadastro Simples salvo'+(wasOk?' (já concluído).':' (em andamento).'))});
   busy=false;if(!ok){if(!cur)id=null;paintButtons();err.textContent='Não foi possível salvar neste navegador.';return null}fill(byId(id));renderSimpleList();
   msg.textContent=markOk?'Cadastro Simples concluído: '+name+' está disponível no Exame Admissional.':'Cadastro salvo: '+name+' (em andamento). Marque como OK para concluir a etapa.';return null};
  if(markOk&&cur?.simple?.status!=='ok')confirmDialog('Marcar Cadastro como OK?','O Cadastro Simples de '+name+' será concluído e o candidato ficará disponível no Exame Admissional.','Marcar Cadastro como OK',commit,()=>{});else commit()}
 function renderSimpleList(){load();listTable.replaceChildren();const people=data.people.filter(inAdmission).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));listStatus.textContent=people.length?people.length+' candidato(s) em admissão. Colaboradores ativados aparecem em Colaboradores Cadastrados.':'Nenhum candidato em admissão.';if(!people.length)return;
  const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Nome completo','CPF','Função','Turno','Etapa atual','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
  for(const p of people){const tr=el('tr'),all=stages(p),cur=all.find(s=>s.state!=='done'&&s.state!=='legacy')||all[all.length-1];const st=el('td');st.append(el('span','pill '+({pending:'p-yellow',progress:'p-yellow',attention:'p-red',failed:'p-red',blocked:'p-red',done:'p-green'})[cur.state],cur.label+': '+cur.text));
   tr.append(el('td',null,p.name),el('td',null,maskCpf(p.cpf)),el('td',null,p.jobName||'—'),el('td',null,p.shift||'—'),st);const a=el('td','uniforms-row-actions');
   a.append(iconButton('Abrir cadastro',ICON.edit,()=>{selectCandidate(p.id);simpleView.querySelector('.content').scrollTo({top:0,behavior:'smooth'})},'is-accent'));
   if(p.simple?.status==='ok'&&!isApto(p))a.append(iconButton('Exame Admissional',ICON.calendar,()=>window.showExams?.({personId:p.id,type:'ADMISSIONAL'})));else if(trialReady(p)&&p.trial?.decision!=='aprovado')a.append(iconButton('Período de Teste',ICON.calendar,()=>window.showTrial?.({personId:p.id})));
   a.append(iconButton('Ver acompanhamento',ICON.eye,()=>window.showCollaborators?.({tab:'tracking',personId:p.id})));tr.append(a);tbody.append(tr)}table.append(thead,tbody);listTable.append(table)}
 new MutationObserver(()=>{if(simpleView.classList.contains('show')&&!simpleView.dataset.peopleShown){simpleView.dataset.peopleShown='1';load();if(editing&&!byId(editing))fill(null);jobOptions();renderSimpleList()}else if(!simpleView.classList.contains('show'))delete simpleView.dataset.peopleShown}).observe(simpleView,{attributes:true,attributeFilter:['class']});
 resetSimple();
 window.CicluzSimpleForm={edit:id=>{openView('cadastro-simples',menuCrumb(2,'Cadastros Geral Colaboradores','DES - Simples Colaborador'));loadCandidate(id);renderSimpleList()}};
}

/* ---------- Etapa 3: Cadastro Completo bound to one person ---------- */
const completeView=document.getElementById('cadastro-completo'),steps=document.getElementById('form-steps');let boundId=null;
const fieldsOf=()=>[...steps.querySelectorAll('input,select,textarea')].filter(x=>x.type!=='file'&&!x.dataset.dateDisplay&&!x.dataset.datePicker);
const textOf=node=>{const l=node.closest('label');return l?[...l.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').replace(/\s*\*\s*$/,'').trim():''};
const banner=el('div','form-note people-complete-banner');
let syncPick=null;
if(completeView&&steps){completeView.querySelector('.form-note').after(banner);
 /* Primeiro campo do Cadastro Completo: escolher a pessoa do Cadastro Simples (só quem já pode seguir para o Completo). O vínculo é pelo ID e os dados vêm do Simples. Opcional: sem escolher, o Completo funciona como antes. */
 const pick=U.enumField('Colaborador do Cadastro Simples (opcional)','Buscar colaborador por nome ou CPF','people-complete-pick');
 const pickBox=el('div','people-complete-pickbox');pickBox.append(pick.label,el('p','profiles-note','Só aparecem as pessoas com Exame Admissional APTO (e Período de Teste aprovado). Ao escolher, nome, CPF, nascimento e contato vêm do Cadastro Simples.'));banner.after(pickBox);
 function pickOptions(cur=pick.select.value){load();const q=fold(pick.search.value),digits=pick.search.value.replace(/D/g,'');pick.select.replaceChildren(new Option('Selecione o colaborador',''));
  for(const p of data.people.filter(x=>inAdmission(x)&&completeReady(x)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')))if(p.id===cur||!q||fold(p.name).includes(q)||(digits&&String(p.cpf||'').includes(digits)))pick.select.add(new Option(p.name+(p.cpf?' · '+maskCpf(p.cpf):''),p.id));pick.select.value=cur||''}
 const typedData=()=>fieldsOf().some(x=>x.tagName!=='SELECT'&&!['checkbox','radio','hidden'].includes(x.type)&&x.value);
 pick.search.addEventListener('input',()=>pickOptions());pick.select.addEventListener('focus',()=>{if(!pick.select.value)pickOptions('')});
 pick.select.addEventListener('change',()=>{const id=pick.select.value;if(!id){bindComplete(null);return}
  if(!boundId&&typedData()){confirmDialog('Substituir os dados digitados?','Os dados já digitados neste formulário serão trocados pelos do Cadastro Simples.','Substituir',()=>{bindComplete(id,true);return null},()=>{pickOptions(boundId||'')});return}
  bindComplete(id,true)});

 syncPick=pickOptions;pickOptions('');
 document.addEventListener('click',e=>{if(e.target.closest('.section-card[data-target=form]'))bindComplete(null)},true);
 document.addEventListener('cicluz-registration-save',()=>{if(!boundId)return;const invalid=fieldsOf().find(x=>!x.disabled&&!x.checkValidity());if(invalid)return;const p=byId(boundId);if(!p)return;
  const summary=[],deps=[];const value=x=>x.type==='checkbox'||x.type==='radio'?(x.checked?'Sim':''):x.tagName==='SELECT'?(x.value?x.selectedOptions[0].text:''):x.dataset.dateNative?dateBR(x.value).replace('—',''):x.value;
  for(const x of fieldsOf()){if(x.closest('.dep-card'))continue;const v=value(x);if(v)summary.push([textOf(x),v])}
  steps.querySelectorAll('.dep-card').forEach(card=>{const rows=[];card.querySelectorAll('input,select,textarea').forEach(x=>{if(x.type==='file'||x.dataset.dateDisplay)return;const v=value(x);const l=x.type==='checkbox'?x.closest('label')?.textContent.trim():textOf(x);if(v&&l)rows.push([l,x.type==='checkbox'?'Informado':v])});deps.push(rows)});
  const now=new Date().toISOString(),birth=fieldsOf().find(x=>x.dataset.dateNative&&/nascimento/i.test(textOf(x))&&!x.closest('.dep-card'));
  const ok=transact(d=>{const x=d.people.find(y=>y.id===boundId);const first=x.complete?.status!=='concluido';x.complete={...(x.complete||{}),status:'concluido',savedAt:now,dependents:deps.length,fields:fieldsOf().map(f=>({type:f.dataset.dateNative?'date':f.type,value:f.value,checked:f.checked})),summary,deps};if(birth?.value)x.birthDate=birth.value;log(x,first?'Cadastro Completo concluído ('+deps.length+' dependente(s)); aguardando ativação pelo DP.':'Cadastro Completo atualizado.')});
  const status=completeView.querySelector('.registration-status');if(status)status.textContent=ok?'Cadastro Completo concluído para '+p.name+'. Próximo passo: ativação pelo DP em Colaboradores Cadastrados.':'Não foi possível salvar o vínculo com o candidato neste navegador.';renderBanner()});
 window.addEventListener('hashchange',openFromHash);setTimeout(openFromHash,0)}
function renderBanner(){banner.replaceChildren();const p=boundId&&byId(boundId);if(!p){banner.append(el('span',null,'Sem candidato vinculado. Para vincular, gere o link após o Exame Admissional APTO (Colaboradores Cadastrados → Acompanhamento ou Exame Admissional).'));return}
 banner.append(el('b',null,'Cadastro de '+p.name),el('span',null,' · link demonstrativo: funciona somente neste navegador; nada é enviado a outro dispositivo. '+(p.complete?.status==='concluido'?'Cadastro concluído.':'Preencha as etapas e conclua.')));
 const tools=el('div','people-banner-tools');tools.append(button('Concluir Cadastro',()=>document.dispatchEvent(new Event('cicluz-registration-save')),'btn'),button('Ver acompanhamento',()=>window.showCollaborators?.({tab:'tracking',personId:p.id})));banner.append(tools)}
/* A pasted link lands on the form itself: the start-up menu covering the screen is closed. */
function openFromHash(){const m=/^#cadastro-completo\/([\w-]+)$/.exec(location.hash);if(!m)return;load();const p=data.people.find(x=>x.complete?.token===m[1]);openView('cadastro-completo',menuCrumb(2,'Cadastros Geral Colaboradores','DES - Completo Colaborador C/Dependente'));document.dispatchEvent(new Event('cicluz-close-menu'));if(!p){bindComplete(null);banner.replaceChildren(el('b',null,'Link não encontrado neste navegador. '),el('span',null,'Links demonstrativos só existem no navegador em que foram gerados.'));return}bindComplete(p.id,true)}
function bindComplete(id,fill){boundId=id;renderBanner();syncPick?.(id||'');document.dispatchEvent(new CustomEvent('cicluz-complete-bound',{detail:{id}}));if(!id||!fill)return;const p=byId(id);
 steps.querySelectorAll('.dep-card').forEach(c=>c.remove());const saved=p.complete?.fields;
 if(saved){while(steps.querySelectorAll('.dep-card').length<(p.complete.dependents||0))document.getElementById('add-dependent').click();fieldsOf().forEach((x,i)=>{const s=saved[i];if(!s||s.type!==(x.dataset.dateNative?'date':x.type))return;if(['checkbox','radio'].includes(x.type))x.checked=!!s.checked;else x.value=s.value||''})}
 else{fieldsOf().forEach(x=>{if(['checkbox','radio'].includes(x.type))x.checked=false;else x.value=''});const set=(re,v)=>{const x=fieldsOf().find(f=>re.test(textOf(f))&&!f.closest('.dep-card')&&(f.dataset.dateNative||f.tagName!=='INPUT'||f.type!=='hidden'));if(x&&v)x.value=v};set(/^Nome completo/,p.name);set(/^CPF/,p.cpf?F.cpfMask(p.cpf):'');set(/^Data de nascimento/,p.birthDate);set(/^Telefone/,p.whatsapp?PH.mask(p.whatsapp):'');set(/^E-?mail/,p.email)}
 try{showStep(0)}catch{}const status=completeView.querySelector('.registration-status');if(status)status.textContent=saved?'Cadastro de '+p.name+' recuperado deste navegador.':'Dados já cadastrados de '+p.name+' preenchidos. Complete as demais informações.'}
function openComplete(id){const p=byId(id);if(!p?.complete?.token)return false;if(location.hash==='#cadastro-completo/'+p.complete.token)openFromHash();else location.hash='cadastro-completo/'+p.complete.token;return true}
function openView(id,crumb){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));document.getElementById(id).classList.add('show');const c=document.getElementById('crumb');if(c)c.textContent=crumb}

window.CicluzPeople={load,transact,get:()=>data,failed:()=>loadError,byId,selectable,stages,nextStep,stepper,isApto,admissionExams,maskCpf,log,isFlow2,examReady,trialReady,completeReady,inAdmission,trialInfo,trialDays,trialAlerts,dayDiff,linkFor,generateLink,copyLink,openComplete,activate,setInactive,inDismissal,dismissalExams,startDismissal,concludeDismissal,cancelDismissal,editSimple:id=>window.CicluzSimpleForm?.edit(id),openView};
})();
