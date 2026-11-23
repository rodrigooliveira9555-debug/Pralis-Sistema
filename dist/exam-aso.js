/* Exames ocupacionais — andamento do exame (10 situações), recebimento do ASO (físico ou WhatsApp, lançado à mão), conferência e alertas.
   Só frontend: o arquivo do ASO fica no IndexedDB de Documentações (nunca no localStorage); a aptidão é sempre a que consta no ASO do médico e só
   vale depois da conferência do DP. Nada é recebido automaticamente: não há bot, OCR nem integração. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,G=window.CicluzGP,DB=window.CicluzDateBR;if(!P||!U||!G||!DB)return;
const {el,button,dateBR,today,fold}=U;
const isoPlus=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const nice=t=>t?t.charAt(0)+t.slice(1).toLocaleLowerCase('pt-BR'):'';

/* ---------- Situação do exame (derivada dos registros; nada é gravado duplicado) ---------- */
function statusOf(x){const t=today();
 if(x.scheduleStatus==='Cancelado')return ['Cancelado',''];
 if(x.result==='NÃO APTO')return ['Concluído — inapto','p-red'];
 if(x.result==='APTO')return ['Concluído — apto','p-green'];
 if(x.aso&&!x.aso.checkedAt)return ['ASO recebido — aguardando conferência','p-yellow'];
 if(x.scheduleStatus==='Realizado')return ['Realizado — aguardando ASO','p-red'];
 if(x.scheduleStatus==='Pendente'||!x.date)return ['Pendente de agendamento','p-red'];
 if(x.date<t)return ['Reagendamento necessário','p-red'];
 if(x.preparedAt)return x.date===t?['Aguardando realização','p-yellow']:['Encaminhamento preparado','p-yellow'];
 return ['Agendado','p-yellow']}
const asoState=x=>!x.aso?'Sem ASO':x.aso.checkedAt?'ASO conferido':'ASO aguardando conferência';

/* ---------- Recebimento do ASO ---------- */
const guardApto=(x,result)=>{const person=P.byId(x.personId);return x.type==='ADMISSIONAL'&&x.result==='APTO'&&result!=='APTO'&&(person?.trial||person?.complete?.token||person?.status==='ATIVO')?'Este APTO já liberou as próximas etapas de '+x.personName+'; não é possível alterá-lo nesta demonstração.':null};
function applyConclusion(d,e,aso,result){const pp=d.people.find(y=>y.id===e.personId);e.aso=aso;e.scheduleStatus='Realizado';e.result=result;e.updatedAt=new Date().toISOString();
 P.log(pp,'ASO '+(aso.origin==='WhatsApp'?'recebido por WhatsApp':'recebido fisicamente')+' e conferido — exame '+nice(e.type).toLowerCase()+': '+result+' (conforme o ASO).'+(e.type==='ADMISSIONAL'&&result==='APTO'?(P.isFlow2(pp)?' Período de Teste liberado.':' Cadastro Completo liberado.'):e.type==='ADMISSIONAL'&&result==='NÃO APTO'?' Fluxo de admissão não avança automaticamente.':''))}
function openAso(x,after=()=>{}){x=P.get().exams.find(e=>e.id===x.id)||x;const prev=x.aso;
 G.modal('Receber ASO — '+x.personName+' · '+nice(x.type),(field,f)=>{
  f.append(el('p','profiles-note','Lançamento manual do ASO recebido. Anexar a imagem não torna o colaborador apto: o resultado é o que consta no ASO assinado pelo médico e só vale depois da sua conferência.'));
  const origin=field('Como o ASO chegou *',el('select'));origin.add(new Option('Recebimento físico','Físico'));origin.add(new Option('WhatsApp da empresa','WhatsApp'));origin.value=prev?.origin||'Físico';
  const ff=G.fileField('Foto ou arquivo do ASO *');f.append(ff.label);
  const issued=DB.field('Data de emissão do ASO *'),recv=DB.field('Data de recebimento *');f.append(issued.label,recv.label);issued.set(prev?.issuedAt||'');recv.set(prev?.receivedAt||today());
  const doctor=field('Médico emissor',el('input')),crm=field('CRM do médico',el('input'));doctor.maxLength=80;crm.maxLength=20;crm.dataset.textoLivre='1';doctor.value=prev?.doctor||'';crm.value=prev?.crm||'';
  const apt=field('Resultado de aptidão que consta no ASO *',el('select'));apt.add(new Option('Selecione',''));for(const r of ['APTO','NÃO APTO'])apt.add(new Option(r,r));apt.value=prev?.aptidao||'';
  const next=DB.field('Próximo exame periódico previsto (conforme o PCMSO)');f.append(next.label);next.set(prev?.nextPeriodicAt||'');
  const lc=el('label','jornada-check'),ck=el('input');ck.type='checkbox';lc.append(ck,el('span',null,'Conferi o ASO: o resultado acima é o que consta no documento. (Sem conferir, o ASO fica aguardando conferência.)'));f.append(lc);
  if(prev?.file)f.append(el('p','profiles-note','Já há um arquivo anexado ('+prev.file.name+'). Anexe outro só se for substituir.'));
  return {origin,ff,issued,recv,doctor,crm,apt,next,ck}},
 async c=>{const iso=c.issued.iso(),rv=c.recv.iso(),file=c.ff.input.files?.[0],errs=[];
  if(!file&&!prev?.file)errs.push('Anexe a foto ou o arquivo do ASO.');if(!iso)errs.push('Informe a data de emissão.');if(!rv)errs.push('Informe a data de recebimento.');else if(iso&&rv<iso)errs.push('O recebimento não pode ser anterior à emissão.');
  if(c.origin.value==='Físico'&&(!c.doctor.value.trim()||!c.crm.value.trim()))errs.push('No recebimento físico, informe o médico emissor e o CRM conforme o documento.');
  if(!c.apt.value)errs.push('Informe o resultado de aptidão que consta no ASO.');
  const g=c.ck.checked?guardApto(x,c.apt.value):null;if(g)errs.push(g);if(errs.length)return errs.join(' ');
  let meta=prev?.file||null;if(file){const r=await G.storeFile(file);if(r.error)return r.error;meta=r.meta}
  const aso={origin:c.origin.value,file:meta,issuedAt:iso,receivedAt:rv,doctor:c.doctor.value.trim(),crm:c.crm.value.trim(),aptidao:c.apt.value,nextPeriodicAt:c.next.iso()||'',recordedAt:new Date().toISOString(),recordedBy:G.userName(),checkedAt:c.ck.checked?new Date().toISOString():null,checkedBy:c.ck.checked?G.userName():''};
  const ok=P.transact(d=>{const e=d.exams.find(y=>y.id===x.id);if(c.ck.checked)applyConclusion(d,e,aso,aso.aptidao);else{e.aso=aso;e.scheduleStatus='Realizado';e.updatedAt=new Date().toISOString();P.log(d.people.find(y=>y.id===e.personId),'ASO '+(aso.origin==='WhatsApp'?'recebido por WhatsApp':'recebido fisicamente')+' — aguardando conferência do DP.')}});
  if(!ok)return 'Não foi possível salvar neste navegador.';after();return null},'Salvar ASO')}
function conferAso(x,after=()=>{}){x=P.get().exams.find(e=>e.id===x.id)||x;const a=x.aso;if(!a)return;
 G.modal('Conferir ASO — '+x.personName,(field,f)=>{f.append(el('p','profiles-note','ASO recebido '+(a.origin==='WhatsApp'?'por WhatsApp':'fisicamente')+' em '+dateBR(a.receivedAt)+', emitido em '+dateBR(a.issuedAt)+(a.doctor?' por '+a.doctor+(a.crm?' (CRM '+a.crm+')':''):'')+'. Resultado lançado: '+a.aptidao+'.'));
  const see=button('Ver arquivo do ASO',()=>G.viewFile('ASO — '+x.personName,a.file),'btn secondary');f.append(see);const lc=el('label','jornada-check'),ck=el('input');ck.type='checkbox';lc.append(ck,el('span',null,'Conferi o documento: o resultado '+a.aptidao+' é o que consta no ASO assinado pelo médico.'));f.append(lc);return {ck}},
 c=>{if(!c.ck.checked)return 'Marque a conferência para concluir.';const g=guardApto(x,a.aptidao);if(g)return g;
  const ok=P.transact(d=>{const e=d.exams.find(y=>y.id===x.id);applyConclusion(d,e,{...e.aso,checkedAt:new Date().toISOString(),checkedBy:G.userName()},e.aso.aptidao)});if(!ok)return 'Não foi possível salvar neste navegador.';after();return null},'Concluir conferência')}

/* ---------- Alertas ---------- */
function alerts(){const exams=P.get().exams.filter(e=>e.scheduleStatus!=='Cancelado'),t=today(),s=G.settings(),lim=isoPlus(t,s.nextDays);
 const named=l=>l.map(e=>({name:e.personName,text:nice(e.type)+(e.date?' · '+dateBR(e.date):'')}));
 const pend=exams.filter(e=>statusOf(e)[0]==='Pendente de agendamento'),prox=exams.filter(e=>e.scheduleStatus==='Agendado'&&e.date&&e.date>=t&&e.date<=lim),miss=exams.filter(e=>statusOf(e)[0]==='Reagendamento necessário'),
  waitAso=exams.filter(e=>statusOf(e)[0]==='Realizado — aguardando ASO'),conf=exams.filter(e=>statusOf(e)[0]==='ASO recebido — aguardando conferência');
 const lead=isoPlus(t,s.periodicLeadDays),per=[];for(const p of P.get().people){const ex=exams.filter(e=>e.personId===p.id&&e.aso?.nextPeriodicAt).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
  if(!ex)continue;const due=ex.aso.nextPeriodicAt;if(due<=lead&&!exams.some(e=>e.personId===p.id&&e.type==='PERIÓDICO'&&e.date&&e.date>=ex.date&&e.id!==ex.id))per.push({name:p.name,text:'previsto para '+dateBR(due)+(due<t?' (vencido)':'')})}
 return [['Exames pendentes',named(pend),true],['Agendamentos próximos (até '+s.nextDays+' dia(s))',named(prox),false],['Exames não realizados',named(miss),true],['ASOs aguardando recebimento',named(waitAso),true],['ASOs aguardando conferência',named(conf),true],['Exames periódicos a programar',per,true]]}
function renderAlerts(box){box.replaceChildren();if(!G.officialWhatsapp()){const w=el('p','people-alert');w.append(document.createTextNode('WhatsApp oficial da Gestão de Pessoas não configurado: ASOs e documentos não têm um número de referência. '),button('Configurar',()=>window.showGpConfig?.()));box.append(w)}const tiles=el('div','exams-alerts'),detail=el('div','exams-alert-detail');detail.hidden=true;let open=null;
 for(const [name,list,attn] of alerts()){const b=el('button','exams-alert'+(list.length&&attn?' is-attn':''));b.type='button';b.setAttribute('aria-expanded','false');b.append(el('b',null,String(list.length)),el('small',null,name));
  b.onclick=()=>{if(open===name){open=null;detail.hidden=true;b.setAttribute('aria-expanded','false');return}open=name;tiles.querySelectorAll('button').forEach(x=>x.setAttribute('aria-expanded','false'));b.setAttribute('aria-expanded','true');detail.replaceChildren(el('b',null,name));
   if(list.length){const ul=el('ul','avaliacoes-list');for(const i of list)ul.append(el('li',null,i.name+' — '+i.text));detail.append(ul)}else detail.append(el('p','profiles-note','Nenhum registro.'));detail.hidden=false};tiles.append(b)}
 box.append(tiles,detail)}

/* ---------- Histórico para a ficha (referências aos registros originais; sem dado clínico) ---------- */
function historyRows(personId){const PR=window.CicluzProviders;return P.get().exams.filter(e=>e.personId===personId).sort((a,b)=>String(b.date||b.createdAt).localeCompare(String(a.date||a.createdAt))).map(e=>{const r=PR?.resolve(e.unit);return {id:e.id,type:e.type,date:e.date,provider:r?.provider.name||'',address:r?(r.address.label+' — '+r.address.street+', '+r.address.city):'',status:statusOf(e)[0],result:e.result,aso:asoState(e),file:e.aso?.file||null,changes:(P.byId(personId)?.history||[]).filter(h=>/exame|ASO/i.test(h.text||'')).length}})}

window.CicluzExamFlow={statusOf,openAso,conferAso,renderAlerts,alerts,historyRows,asoState,markPrepared:id=>P.transact(d=>{const e=d.exams.find(x=>x.id===id);if(e&&!e.preparedAt)e.preparedAt=new Date().toISOString()})};
})();
