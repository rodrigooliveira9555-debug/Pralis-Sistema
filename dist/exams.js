/* Exame Admissional (and other occupational exams), following the AcessaMed+ Trabalho referral form. Records live in the Gestão de Pessoas registry. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR,PH=window.CicluzPhoneBR,F=window.CicluzFieldRules;if(!P||!U||!DB||!PH||!F)return;
const {el,button,iconButton,svg,ICON,fold,newId,dateBR,today,enumField,dialog,confirmDialog}=U;
const ACCENT='#7c3aed',PATH=menuCrumb(2,'Lançamentos Colaboradores','DES - Exames Ocupacionais'),STETHO=telaIcone.exame;
const TYPES=['ADMISSIONAL','PERIÓDICO','DEMISSIONAL','MUDANÇA DE FUNÇÃO','RETORNO AO TRABALHO','PORTADOR DE DEFICIÊNCIA'];
const UNITS={CENTRO:{label:'Centro',address:'Av. Getúlio Vargas, 209 e 245',city:'Juiz de Fora — MG'},BENFICA:{label:'Benfica',address:'R. Martins Barbosa, 175',city:'Juiz de Fora — MG'}};
const CLINIC={name:'AcessaMed+ Trabalho',phone:'(32) 3031-6269',mobile:'(32) 99813-4294',site:'www.acessamedmais.com.br',hours:'Horário de atendimento: de segunda a sexta-feira, das 7h às 19h.',payment:'boleto bancário com vencimento dez dias fora o mês em que o exame foi realizado. É reservado o direito de não atender cliente com débito vencido.'};
const SCHEDULE=['Pendente','Agendado','Realizado','Cancelado'],RESULTS=['Aguardando resultado','APTO','NÃO APTO'];
const RESULT_PILL={'Aguardando resultado':'p-yellow',APTO:'p-green','NÃO APTO':'p-red'},SCHEDULE_PILL={Pendente:'p-yellow',Agendado:'p-yellow',Realizado:'p-green',Cancelado:'p-red'};
const CHAT='M4 20l1.5-4A8 8 0 1 1 8 18.5zM9 9.5c0 3 2.5 5.5 5.5 5.5';
const nice=t=>t.charAt(0)+t.slice(1).toLocaleLowerCase('pt-BR');
const data=()=>P.get();
/* Signatures are drawn for demonstration only and kept in memory, never in storage. */
const signatures=new Map();

const cnpjDigits=v=>String(v||'').replace(/\D/g,'').slice(0,14);
const cnpjMask=v=>{const d=cnpjDigits(v);return d.slice(0,2)+(d.length>2?'.'+d.slice(2,5):'')+(d.length>5?'.'+d.slice(5,8):'')+(d.length>8?'/'+d.slice(8,12):'')+(d.length>12?'-'+d.slice(12):'')};
function cnpjValid(v){const d=cnpjDigits(v);if(d.length!==14||/^(\d)\1+$/.test(d))return false;const calc=n=>{let s=0,w=n-7;for(let i=0;i<n;i++){s+=+d[i]*w--;if(w<2)w=9}const r=s%11;return r<2?0:11-r};return calc(12)===+d[12]&&calc(13)===+d[13]}
const timeMask=v=>{const d=String(v||'').replace(/\D/g,'').slice(0,4);return d.slice(0,2)+(d.length>2?':'+d.slice(2):'')};
const timeValid=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v||'');
window.CicluzTimeBR={mask:timeMask,valid:timeValid};
function catalog(){try{return jobsCurrent().map(e=>({name:e.j.nome,cbo:e.j.cbo||''}))}catch{return []}}

const view=el('section','view');view.id='exams-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(STETHO);const heading=el('div');heading.append(el('h2',null,'DES - Exames Ocupacionais'),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,'Lançamentos Colaboradores')());
const addButton=button('',()=>{resetForm();formStatus.textContent=''},'shortcut-circle');addButton.title='Novo exame';addButton.setAttribute('aria-label','Novo exame');addButton.innerHTML=svg(ICON.plus);head.querySelector('.shortcut-actions').append(addButton);
body.append(el('div','form-note','Guia de encaminhamento de exames — '+CLINIC.name+'. Demonstração local: registros neste navegador; a assinatura desenhada fica só na memória e não tem validade jurídica. Nenhuma mensagem é enviada automaticamente.'));

/* ---------- Formulário (guia) ---------- */
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const formTitle=el('h3','uniforms-wide uniforms-heading','Novo encaminhamento');
const section=t=>el('h3','uniforms-wide uniforms-heading exams-section',t);
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const text=(max=120)=>{const i=el('input');i.type='text';i.maxLength=max;return i};
const keep=n=>{n.addEventListener('focusout',e=>e.stopPropagation());return n};
/* Companies defined by the user; the CNPJ comes from the chosen company and is not typed. */
const COMPANIES=[{name:'Comercial tudinupao LTDA',cnpj:'08351168000153'},{name:'Comercial Lisboa Alimentos LTDA',cnpj:'34055795000157'}];
const company=el('select');company.add(new Option('Selecione a empresa',''));COMPANIES.forEach(c=>company.add(new Option(c.name,c.name)));
const cnpj=keep(text(18));cnpj.readOnly=true;cnpj.tabIndex=-1;cnpj.placeholder='Preenchido pela empresa selecionada';
const authorizer=text(),authorizerList=el('datalist');authorizerList.id='exams-authorizer-options';authorizer.setAttribute('list',authorizerList.id);
const authPhone=el('input');authPhone.type='tel';authPhone.inputMode='tel';authPhone.placeholder='(32) 99999-9999';authPhone.maxLength=15;authPhone.addEventListener('input',()=>{authPhone.value=PH.mask(authPhone.value)});
const person=enumField('Nome do colaborador *','Buscar colaborador');
const birth=DB.field('Data de nascimento');const cpf=text(14);cpf.inputMode='numeric';const rg=keep(text(20));const sector=text(80);const job=text(120);const admission=DB.field('Data de admissão');
const whats=el('input');whats.type='tel';whats.inputMode='tel';whats.placeholder='(32) 99999-9999';whats.maxLength=15;whats.addEventListener('input',()=>{whats.value=PH.mask(whats.value)});
const newSector=text(80);const newJob=el('select');const cbo=keep(text(10));cbo.placeholder='Preenchido pelo cadastro de Cargos';
const type=el('select');type.add(new Option('Selecione',''));TYPES.forEach(t=>type.add(new Option(t,t)));
const complementary=el('select');complementary.add(new Option('Selecione',''));['SIM','NÃO','NÃO SABE'].forEach(t=>complementary.add(new Option(t,t)));
const unit=el('select');unit.add(new Option('Selecione',''));Object.keys(UNITS).forEach(k=>unit.add(new Option(k,k)));
/* One maps address per unit, shared by the Ver localização button and the WhatsApp message. */
const mapsUrl=u=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(CLINIC.name+', '+u.address+', Juiz de Fora - MG');
const unitAddress=el('div','uniforms-wide exams-address');const mapBtn=button('Ver localização',()=>{const u=UNITS[unit.value];if(u)U.openExternal(mapsUrl(u))});
const day=DB.field('Agendado para — Dia');const hour=el('input');hour.type='text';hour.inputMode='numeric';hour.placeholder='HH:MM';hour.maxLength=5;hour.addEventListener('input',()=>{hour.value=timeMask(hour.value)});
const scheduleStatus=el('select');SCHEDULE.forEach(s=>scheduleStatus.add(new Option(s,s)));
const referrer=text();const referDate=DB.field('Data de encaminhamento');
const sigBox=el('div','uniforms-wide exams-signature');const sig=el('canvas');sig.width=600;sig.height=160;sig.setAttribute('aria-label','Assinatura desenhada do responsável (demonstração)');sig.setAttribute('role','img');let sigDirty=false;
sigBox.append(el('span','uniforms-enum-label','Assinatura do responsável (desenho demonstrativo, sem validade jurídica)'),sig,button('Limpar assinatura',()=>{clearSig();renderPreview()}));
(()=>{const g=sig.getContext('2d');let drawing=false;const at=e=>{const r=sig.getBoundingClientRect();return [(e.clientX-r.left)*sig.width/r.width,(e.clientY-r.top)*sig.height/r.height]};
 sig.addEventListener('pointerdown',e=>{drawing=true;sig.setPointerCapture(e.pointerId);g.lineWidth=2.4;g.lineCap='round';g.strokeStyle='#27272a';g.beginPath();g.moveTo(...at(e))});
 sig.addEventListener('pointermove',e=>{if(!drawing)return;g.lineTo(...at(e));g.stroke();sigDirty=true});
 const end=()=>{if(drawing){drawing=false;renderPreview()}};sig.addEventListener('pointerup',end);sig.addEventListener('pointercancel',end)})();
function clearSig(){sig.getContext('2d').clearRect(0,0,sig.width,sig.height);sigDirty=false}
const preview=el('div','uniforms-wide exams-guide');preview.setAttribute('aria-label','Pré-visualização da guia');
const msgBox=el('div','uniforms-wide exams-message');const msgText=el('pre','exams-message-text');const sendBtn=button('Enviar Agendamento por WhatsApp',()=>sendWhatsapp(currentDraft()),'btn');const msgHint=el('small','profiles-note');msgBox.append(el('span','uniforms-enum-label','Mensagem para o colaborador'),msgText,msgHint,sendBtn);
const formError=el('p','uniforms-wide profiles-error');formError.setAttribute('role','alert');const formStatus=el('p','uniforms-wide profiles-note');formStatus.setAttribute('role','status');
const actions=el('div','uniforms-wide actions');const save=el('button','btn','Agendar Exame');save.type='submit';actions.append(button('Cancelar',()=>{resetForm();formStatus.textContent='Encaminhamento descartado.'}),save);
form.append(formTitle,
 section('Informações da empresa'),lbl('Empresa',company),lbl('CNPJ',cnpj),lbl('Nome da pessoa que autorizou os exames',authorizer),authorizerList,lbl('Telefone da pessoa que autorizou os exames',authPhone),
 section('Informações do colaborador'),person.label,lbl('WhatsApp do colaborador',whats),birth.label,lbl('CPF',cpf),lbl('RG',rg),lbl('Setor atual',sector),lbl('Cargo atual',job),admission.label,
 section('Se trocar de função e setor'),lbl('Novo setor',newSector),lbl('Novo cargo',newJob),lbl('CBO',cbo),
 section('Exame'),lbl('Tipo de exame clínico *',type),lbl('Possui exames complementares?',complementary),
 section('Unidade de atendimento'),lbl('Unidade *',unit),unitAddress,
 section('Data e horário do exame'),day.label,lbl('Hora',hour),el('p','uniforms-wide profiles-note',CLINIC.hours),lbl('Status do agendamento',scheduleStatus),
 section('Responsável pelo encaminhamento'),lbl('Nome do responsável pelo encaminhamento',referrer),referDate.label,sigBox,
 section('Pré-visualização da guia'),preview,section('Envio por WhatsApp'),msgBox,formError,formStatus,actions);
const history=el('div','uniforms-history');body.append(form,history);

let draft={editingId:null};
function personOptions(){const q=fold(person.search.value),cur=person.select.value;person.select.replaceChildren(new Option('Selecione o colaborador',''));for(const p of data().people)if(p.id===cur||fold(p.name).includes(q))person.select.add(new Option(p.name+(({CANDIDATO:' (candidato)',INATIVO:' (inativo)'})[p.status]||''),p.id));person.select.value=cur}
person.search.addEventListener('input',personOptions);
/* Selecting a person fills what the registry already knows; the exam keeps its own copy, so the registry is never overwritten here. */
function fillPerson(){const p=P.byId(person.select.value);if(!p)return;birth.set(p.birthDate||'');cpf.value=p.cpf?F.cpfMask(p.cpf):'';rg.value=p.rg||'';sector.value=p.sector||'';job.value=p.jobName||'';admission.set(p.admissionDate||'');whats.value=p.whatsapp?PH.mask(p.whatsapp):'';if(!type.value&&p.status==='CANDIDATO')type.value='ADMISSIONAL';renderPreview()}
person.select.addEventListener('change',fillPerson);
function fillJobs(){const cur=newJob.value;newJob.replaceChildren(new Option('Sem troca de cargo',''));for(const j of catalog())if(![...newJob.options].some(o=>o.value===j.name))newJob.add(new Option(j.name+(j.cbo?' · CBO '+j.cbo:''),j.name));if(cur&&![...newJob.options].some(o=>o.value===cur))newJob.add(new Option(cur,cur));newJob.value=cur}
newJob.addEventListener('change',()=>{const j=catalog().find(x=>x.name===newJob.value);cbo.value=j?.cbo||'';renderPreview()});
function fillCompanies(){const c=data().companies.find(x=>fold(x.name)===fold(company.value));authorizerList.replaceChildren(...(c?.authorizers||[]).map(a=>new Option(a.phone?PH.mask(a.phone):'',a.name)))}
function companyCnpj(name){return COMPANIES.find(c=>c.name===name)?.cnpj||data().companies.find(x=>x.name===name)?.cnpj||''}
company.addEventListener('change',()=>{const d=companyCnpj(company.value);cnpj.value=d?cnpjMask(d):'';fillCompanies();renderPreview()});
authorizer.addEventListener('input',()=>{const c=data().companies.find(x=>fold(x.name)===fold(company.value));const a=c?.authorizers?.find(x=>fold(x.name)===fold(authorizer.value));if(a?.phone)authPhone.value=PH.mask(a.phone)});
function renderUnit(){const u=UNITS[unit.value];unitAddress.replaceChildren();if(!u){unitAddress.append(el('span','profiles-note','Selecione a unidade para ver o endereço.'));return}unitAddress.append(el('b',null,CLINIC.name+' — Unidade '+u.label),el('span',null,u.address+' · '+u.city),mapBtn)}
unit.addEventListener('change',()=>{renderUnit();renderPreview()});

function currentDraft(){const p=P.byId(person.select.value);return {personId:person.select.value,personName:p?.name||'',company:{name:company.value.trim(),cnpj:cnpjDigits(cnpj.value),authorizer:authorizer.value.trim(),authorizerPhone:PH.digits(authPhone.value)},snapshot:{birthDate:birth.iso(),cpf:cpf.value.replace(/\D/g,''),rg:rg.value.trim(),sector:sector.value.trim(),jobName:job.value.trim(),admissionDate:admission.iso()},change:{sector:newSector.value.trim(),jobName:newJob.value,cbo:cbo.value.trim()},whatsapp:PH.digits(whats.value),type:type.value,complementary:complementary.value,unit:unit.value,date:day.iso(),time:hour.value,scheduleStatus:scheduleStatus.value,referrer:{name:referrer.value.trim(),date:referDate.iso()}}}
function message(e){if(!e.type||!e.unit||!e.date||!timeValid(e.time))return null;const u=UNITS[e.unit];
 /* Demissional: same units, addresses and maps link; the text names the exam and the company. No CPF/RG. */
 if(e.type==='DEMISSIONAL'){const name=e.personName||P.byId(e.personId)?.name||'';return 'Olá'+(name?', '+name:'')+'!\n\nSeu Exame Demissional foi agendado.\n\n'+(e.company?.name?'Empresa: '+e.company.name+'\n':'')+'Clínica: '+CLINIC.name+'\nUnidade: '+u.label+'\nData: '+dateBR(e.date)+'\nHorário: '+e.time+'\nEndereço: '+u.address+' — Juiz de Fora/MG\nLocalização (Google Maps): '+mapsUrl(u)+'\n\nPor favor, compareça na data e no horário informados.'}
 return 'Olá! Seu exame ocupacional foi agendado.\n\nTipo de exame: '+nice(e.type)+'\nData: '+dateBR(e.date)+'\nHorário: '+e.time+'\nClínica: '+CLINIC.name+'\nUnidade: '+u.label+'\nEndereço: '+u.address+' — Juiz de Fora/MG\nComo chegar (Google Maps): '+mapsUrl(u)+'\n\nPor favor, compareça na data e horário informados.'}
function sendWhatsapp(e){const m=message(e);if(!m)return;const n=e.whatsapp;U.openExternal('https://wa.me/'+(n&&PH.valid(n)?'55'+n:'')+'?text='+encodeURIComponent(m))}
function guide(e,signatureUrl){const g=el('article','exams-guide-sheet');const row=(k,v)=>{const d=el('div','exams-guide-row');d.append(el('span',null,k),el('b',null,v||'—'));return d};const p=P.byId(e.personId);const u=UNITS[e.unit];
 const top=el('header','exams-guide-top');top.append(el('b',null,CLINIC.name),el('span',null,'Guia de encaminhamento de exames'));g.append(top);
 const block=(t,rows)=>{const s=el('section','exams-guide-block');s.append(el('h4',null,t),...rows);g.append(s)};
 block('Empresa',[row('Empresa',e.company.name),row('CNPJ',e.company.cnpj?cnpjMask(e.company.cnpj):''),row('Autorizado por',e.company.authorizer),row('Telefone',e.company.authorizerPhone?PH.mask(e.company.authorizerPhone):'')]);
 const stamp=el('div','exams-stamp');if(e.company.name||e.company.cnpj){stamp.append(el('b',null,e.company.name||'Empresa não informada'),el('span',null,e.company.cnpj?'CNPJ '+cnpjMask(e.company.cnpj):'CNPJ não informado'))}else stamp.append(el('span',null,'Área do carimbo e número do CNPJ'));stamp.append(el('small',null,'Representação visual para pré-visualização — não é carimbo oficial.'));g.append(stamp);
 block('Colaborador',[row('Nome',e.personName||p?.name),row('Nascimento',dateBR(e.snapshot.birthDate)),row('CPF',e.snapshot.cpf?F.cpfMask(e.snapshot.cpf):''),row('RG',e.snapshot.rg),row('Setor atual',e.snapshot.sector),row('Cargo atual',e.snapshot.jobName),row('Admissão',dateBR(e.snapshot.admissionDate))]);
 if(e.change.sector||e.change.jobName)block('Se trocar de função e setor',[row('Novo setor',e.change.sector),row('Novo cargo',e.change.jobName),row('CBO',e.change.cbo)]);
 block('Exame',[row('Tipo de exame clínico',e.type),row('Exames complementares',e.complementary),row('Unidade',u?u.label+' — '+u.address+', '+u.city:''),row('Agendado para',e.date?dateBR(e.date)+(e.time?' às '+e.time:''):''),row('Status',e.scheduleStatus)]);
 const sigEl=el('div','exams-guide-sign');if(signatureUrl){const i=el('img');i.src=signatureUrl;i.alt='Assinatura desenhada (demonstração)';sigEl.append(i)}sigEl.append(el('span',null,(e.referrer.name||'Responsável pelo encaminhamento')+(e.referrer.date?' · '+dateBR(e.referrer.date):'')));block('Responsável pelo encaminhamento',[sigEl]);
 const foot=el('footer','exams-guide-foot');foot.append(el('p',null,CLINIC.hours),el('p',null,'Condições de pagamento: '+CLINIC.payment),el('p',null,'Telefone: '+CLINIC.phone+' · Celular: '+CLINIC.mobile+' · Site: '+CLINIC.site));g.append(foot);return g}
function renderPreview(){const e=currentDraft();preview.replaceChildren(guide(e,sigDirty?sig.toDataURL():null));const m=message(e);msgText.textContent=m||'Preencha tipo de exame, unidade, dia e hora (HH:MM) para montar a mensagem.';sendBtn.disabled=!m;msgHint.textContent=m?(e.whatsapp&&PH.valid(e.whatsapp)?'Abre o WhatsApp para '+PH.mask(e.whatsapp)+' com a mensagem pronta; o envio é confirmado por você. CPF e RG não são incluídos.':'Sem WhatsApp válido do colaborador: o WhatsApp abre para você escolher o contato. CPF e RG não são incluídos.'):''}
form.addEventListener('input',renderPreview);form.addEventListener('change',renderPreview);

function resetForm(){draft={editingId:null};formTitle.textContent='Novo encaminhamento';save.textContent='Agendar Exame';for(const n of [company,cnpj,authorizer,authPhone,cpf,rg,sector,job,whats,newSector,cbo,referrer,hour,person.search])n.value='';person.select.value='';personOptions();birth.set('');admission.set('');day.set('');referDate.set(today());type.value='';complementary.value='';unit.value='';scheduleStatus.value='Pendente';fillJobs();newJob.value='';clearSig();fillCompanies();renderUnit();formError.textContent='';renderPreview()}
form.onsubmit=ev=>{ev.preventDefault();formError.textContent='';formStatus.textContent='';const e=currentDraft(),errors=[],p=P.byId(e.personId),own=draft.editingId&&data().exams.find(x=>x.id===draft.editingId);
 if(!p)errors.push('Selecione o colaborador.');if(!e.type)errors.push('Selecione o tipo de exame clínico.');if(!e.unit)errors.push('Selecione a unidade de atendimento.');
 if(cnpj.value&&!cnpjValid(cnpj.value))errors.push('CNPJ inválido.');if(authPhone.value&&!PH.valid(authPhone.value))errors.push('Telefone de quem autorizou inválido.');if(whats.value&&!PH.valid(whats.value))errors.push('WhatsApp do colaborador inválido.');if(cpf.value&&!F.cpfValid(cpf.value))errors.push('CPF inválido.');
 for(const [f,name] of [[birth,'Data de nascimento'],[admission,'Data de admissão'],[day,'Dia do agendamento'],[referDate,'Data de encaminhamento']])if(f.node.value&&!f.iso())errors.push(name+' inválida (DD/MM/AAAA).');
 if(hour.value&&!timeValid(hour.value))errors.push('Hora inválida (HH:MM).');if(e.scheduleStatus==='Agendado'&&(!e.date||!timeValid(e.time)))errors.push('Para marcar como Agendado, informe dia e hora.');
 if(p&&e.type==='ADMISSIONAL'){if(p.demo||p.status!=='CANDIDATO')errors.push('Exame ADMISSIONAL é para candidatos em admissão; use outro tipo para colaboradores já cadastrados.');else if(p.simple?.status!=='ok')errors.push('O Cadastro Simples de '+p.name+' ainda não está OK.');else if(!P.examReady(p))errors.push('O Cadastro Simples de '+p.name+' ainda não está OK.');else if(P.isApto(p)&&!(own&&own.result==='APTO'))errors.push(p.name+' já possui exame admissional APTO.')}
 if(errors.length){formError.textContent=errors.join(' ');return}
 const now=new Date().toISOString();if(!own&&e.scheduleStatus==='Pendente'&&e.date&&timeValid(e.time))e.scheduleStatus='Agendado';
 const exam={...(own||{}),...e,id:own?.id||newId(),result:own?.result||'Aguardando resultado',createdAt:own?.createdAt||now,updatedAt:now};
 const ok=P.transact(d=>{d.exams=[...d.exams.filter(x=>x.id!==exam.id),exam];if(e.company.name){let c=d.companies.find(x=>fold(x.name)===fold(e.company.name));if(!c){c={name:e.company.name,cnpj:'',authorizers:[]};d.companies.push(c)}if(e.company.cnpj)c.cnpj=e.company.cnpj;if(e.company.authorizer&&!c.authorizers.some(a=>fold(a.name)===fold(e.company.authorizer)))c.authorizers.push({name:e.company.authorizer,phone:e.company.authorizerPhone});}
  const x=d.people.find(y=>y.id===e.personId);P.log(x,(own?'Exame '+nice(e.type).toLowerCase()+' atualizado':'Exame '+nice(e.type).toLowerCase()+' encaminhado')+' · '+UNITS[e.unit].label+(e.date?' · '+dateBR(e.date)+(e.time?' '+e.time:''):'')+' · '+e.scheduleStatus+'.')});
 if(!ok){formError.textContent='Não foi possível salvar neste navegador.';return}if(sigDirty)signatures.set(exam.id,sig.toDataURL());
 const msg=(own?'Exame atualizado':'Exame registrado')+': '+e.type+' · '+p.name+' · '+e.scheduleStatus+'. Registre o resultado no histórico quando recebido.';resetForm();renderHistory();formStatus.textContent=msg};
function editExam(x){draft={editingId:x.id};formTitle.textContent='Editar encaminhamento de '+x.personName;save.textContent='Salvar Exame';if(x.company.name&&![...company.options].some(o=>o.value===x.company.name))company.add(new Option(x.company.name+' (registro anterior)',x.company.name));company.value=x.company.name;cnpj.value=x.company.cnpj?cnpjMask(x.company.cnpj):'';authorizer.value=x.company.authorizer;authPhone.value=x.company.authorizerPhone?PH.mask(x.company.authorizerPhone):'';person.search.value='';person.select.value=x.personId;personOptions();
 birth.set(x.snapshot.birthDate);cpf.value=x.snapshot.cpf?F.cpfMask(x.snapshot.cpf):'';rg.value=x.snapshot.rg;sector.value=x.snapshot.sector;job.value=x.snapshot.jobName;admission.set(x.snapshot.admissionDate);whats.value=x.whatsapp?PH.mask(x.whatsapp):'';newSector.value=x.change.sector;fillJobs();if(x.change.jobName&&![...newJob.options].some(o=>o.value===x.change.jobName))newJob.add(new Option(x.change.jobName,x.change.jobName));newJob.value=x.change.jobName;cbo.value=x.change.cbo;
 type.value=x.type;complementary.value=x.complementary;unit.value=x.unit;renderUnit();day.set(x.date);hour.value=x.time;scheduleStatus.value=x.scheduleStatus;referrer.value=x.referrer.name;referDate.set(x.referrer.date);clearSig();const s=signatures.get(x.id);if(s){const img=new Image();img.onload=()=>{sig.getContext('2d').drawImage(img,0,0);sigDirty=true;renderPreview()};img.src=s}
 formError.textContent='';formStatus.textContent='Editando o encaminhamento. O resultado é registrado pelo botão Registrar Resultado no histórico.';renderPreview();form.scrollIntoView({block:'start',behavior:'smooth'})}

/* ---------- Resultado ---------- */
function registerResult(x){dialog('Registrar resultado — '+x.personName,f=>{const st=f('Status do agendamento',el('select'));SCHEDULE.forEach(s=>st.add(new Option(s,s)));st.value=x.scheduleStatus;const rs=f('Resultado do exame',el('select'));RESULTS.forEach(s=>rs.add(new Option(s,s)));rs.value=x.result;
 const note=el('p','profiles-note','Informe o resultado conforme o documento ou a informação oficial recebida. A aptidão nunca é determinada pelo sistema.');st.closest('form').append(note);return {st,rs}},({st,rs})=>{
 if(rs.value!=='Aguardando resultado'&&st.value!=='Realizado')return 'Para registrar APTO ou NÃO APTO, o status do agendamento deve ser Realizado.';
 const person=P.byId(x.personId);if(x.type==='ADMISSIONAL'&&x.result==='APTO'&&rs.value!=='APTO'&&(person?.trial||person?.complete?.token||person?.status==='ATIVO'))return 'Este APTO já liberou as próximas etapas de '+x.personName+'; não é possível alterá-lo nesta demonstração.';
 const ok=P.transact(d=>{const e=d.exams.find(y=>y.id===x.id);const changed=e.result!==rs.value||e.scheduleStatus!==st.value;e.scheduleStatus=st.value;e.result=rs.value;e.updatedAt=new Date().toISOString();if(changed){const pp=d.people.find(y=>y.id===e.personId);P.log(pp,'Resultado do exame '+nice(e.type).toLowerCase()+': '+e.result+' ('+e.scheduleStatus+').'+(e.type==='ADMISSIONAL'&&e.result==='APTO'?(P.isFlow2(pp)?' Período de Teste liberado.':' Cadastro Completo liberado.'):e.type==='ADMISSIONAL'&&e.result==='NÃO APTO'?' Fluxo de admissão não avança automaticamente.':''))}});
 if(!ok)return 'Não foi possível salvar neste navegador.';formStatus.textContent='Resultado registrado: '+x.personName+' · '+rs.value+'.'+(x.type==='ADMISSIONAL'&&rs.value==='APTO'?(P.isFlow2(P.byId(x.personId))?' Use Dar Continuidade para seguir ao Período de Teste.':' Use Gerar Link para liberar o Cadastro Completo.'):x.type==='DEMISSIONAL'&&P.inDismissal(P.byId(x.personId))?' O desligamento não é concluído automaticamente: use Concluir Desligamento quando o DP decidir.':'');return null},'Registrar Resultado',renderHistory)}
function linkDialog(personId){const link=P.generateLink(personId);if(!link)return;renderHistory();const p=P.byId(personId);dialog('Link do Cadastro Completo — '+p.name,(f,form)=>{const input=f('Link individual (demonstração)',el('input'));input.readOnly=true;input.value=link;const status=el('p','profiles-note');status.setAttribute('role','status');
 form.append(el('p','profiles-note','Este link abre o Cadastro Completo vinculado a '+p.name+' somente neste navegador. Sem servidor, ele não funciona em outro dispositivo e nenhum dado é recebido remotamente. Não contém CPF, RG ou outros dados pessoais.'),status);
 const tools=el('div','people-banner-tools');tools.append(button('Copiar Link',async()=>{status.textContent=await P.copyLink(personId)?'Link copiado.':'Não foi possível copiar; selecione o texto do campo.'}),button('Abrir Cadastro Completo',()=>{form.closest('dialog').close();P.openComplete(personId)},'btn'));form.append(tools)})}
window.CicluzExams={linkDialog};

/* ---------- Histórico ---------- */
const hStatus=el('p','profiles-note');hStatus.setAttribute('role','status');const hTable=el('div','uniforms-table-wrap');history.append(el('h3','uniforms-heading','Histórico de exames'),hStatus,hTable);
function renderHistory(){P.load();hTable.replaceChildren();const all=data().exams;const list=[...all].sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt)));
 hStatus.textContent=all.length?all.length+' exame(s), do agendamento mais recente ao mais antigo.':'Nenhum exame registrado.';if(!list.length)return;
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Agendado para','Colaborador','Tipo','Unidade','Status','Resultado','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const x of list){const tr=el('tr');if(x.scheduleStatus==='Cancelado')tr.classList.add('is-cancelled');const pill=(t,c)=>{const td=el('td');td.append(el('span','pill '+c,t));return td};
  tr.append(el('td',null,x.date?dateBR(x.date)+(x.time?' '+x.time:''):'—'),el('td',null,x.personName),el('td',null,x.type),el('td',null,UNITS[x.unit]?.label||'—'),pill(x.scheduleStatus,SCHEDULE_PILL[x.scheduleStatus]),pill(x.result,RESULT_PILL[x.result]));
  const a=el('td','uniforms-row-actions'),p=P.byId(x.personId);a.append(iconButton('Visualizar detalhes',ICON.eye,()=>showDetails(x)),iconButton('Registrar Resultado',ICON.ok,()=>registerResult(x),'is-accent'),iconButton('Editar exame',ICON.edit,()=>editExam(x),'is-accent'));
  if(message(x))a.append(iconButton('Enviar Agendamento por WhatsApp',CHAT,()=>sendWhatsapp(x)));
  /* APTO hands the candidate to the Período de Teste; the Cadastro Completo link only after the DP approves that period. */
  if(x.type==='ADMISSIONAL'&&x.result==='APTO'&&p&&p.status==='CANDIDATO'){if(P.trialReady(p)&&!p.trial?.decision)a.append(iconButton('Dar Continuidade — Período de Teste',ICON.ok,()=>window.showTrial?.({personId:p.id}),'is-accent'));if(P.completeReady(p))a.append(iconButton(p.complete?.token?'Ver link do Cadastro Completo':'Gerar Link de Cadastro Completo',ICON.link,()=>linkDialog(p.id),'is-accent'))}
  /* The result never concludes a dismissal; the DP does it here or in Colaboradores Cadastrados. */
  if(x.type==='DEMISSIONAL'&&P.inDismissal(p)&&P.dismissalExams(p)[0]?.id===x.id)a.append(iconButton('Concluir Desligamento',ICON.power,()=>window.CicluzDismissal?.conclude(p.id,renderHistory),'is-accent'));
  a.append(iconButton('Excluir exame',ICON.trash,()=>deleteExam(x),'is-danger'));tr.append(a);tbody.append(tr)}table.append(thead,tbody);hTable.append(table)}
function deleteExam(x){const p=P.byId(x.personId);if(x.type==='ADMISSIONAL'&&x.result==='APTO'&&(p?.trial||p?.complete?.token||p?.status==='ATIVO')){dialog('Exclusão não permitida',(f,form)=>form.append(el('p','uniforms-confirm-text','Este exame APTO já liberou as próximas etapas de '+x.personName+'. Para preservar o histórico da admissão, ele não pode ser excluído.')));return}
 confirmDialog('Excluir exame?','O exame '+x.type+' de '+x.personName+(x.date?' ('+dateBR(x.date)+')':'')+' será removido do histórico. Esta ação não pode ser desfeita.','Confirmar exclusão',()=>P.transact(d=>{d.exams=d.exams.filter(y=>y.id!==x.id);P.log(d.people.find(y=>y.id===x.personId),'Exame '+nice(x.type).toLowerCase()+' excluído do histórico.')})?(signatures.delete(x.id),formStatus.textContent='Exame excluído.',null):'Não foi possível salvar neste navegador.',()=>{if(draft.editingId===x.id)resetForm();renderHistory()})}
function showDetails(x){dialog('Guia — '+x.personName,(f,form)=>{form.append(guide(x,signatures.get(x.id)||null));const m=message(x);if(m)form.append(el('pre','exams-message-text',m))})}

function showExams(opts={}){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Exame Admissional';P.load();resetForm();formStatus.textContent='';if(opts.personId){person.select.value='';personOptions();person.select.value=opts.personId;fillPerson()}if(opts.type)type.value=opts.type;
 /* Demissional opened from the dismissal: company and CNPJ come from the collaborator's latest exam, when one exists. */
 if(opts.type==='DEMISSIONAL'&&opts.personId){const last=data().exams.filter(x=>x.personId===opts.personId&&x.company?.name).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];if(last){if(![...company.options].some(o=>o.value===last.company.name))company.add(new Option(last.company.name+' (registro anterior)',last.company.name));company.value=last.company.name;const d=companyCnpj(last.company.name)||last.company.cnpj;cnpj.value=d?cnpjMask(d):'';fillCompanies();authorizer.value=last.company.authorizer||'';authPhone.value=last.company.authorizerPhone?PH.mask(last.company.authorizerPhone):''}renderUnit();
  const p=P.byId(opts.personId);if(P.inDismissal(p))formStatus.textContent='Desligamento em andamento de '+p.name+': dados do colaborador preenchidos'+(last?', empresa do último exame':'')+'. Informe unidade, dia e hora e salve o agendamento.'}
 renderPreview();renderHistory();normalizeHeaderActions(view)}
window.showExams=showExams;
})();
