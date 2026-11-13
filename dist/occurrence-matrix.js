/* Ocorrências — categorias e subcategorias configuráveis (4 categorias principais), matriz disciplinar, histórico de reincidências,
   observação por áudio e prévia do documento. Categoria = o que aconteceu; subcategoria = detalhamento; tipo de ocorrência (advertência,
   suspensão, justa causa…) = a medida registrada, e continua em occurrences.js. Os níveis (leve, moderado, grave) são só classificação
   administrativa configurável: nada aqui aplica penalidade, calcula prazo legal ou conclui juridicamente. Os campos da matriz começam vazios.
   `cicluz-ocorrencias-matriz-v1`. O áudio fica no IndexedDB (nunca no localStorage) e não sai do aparelho: sem transcrição automática. */
(()=>{
'use strict';
const U=window.CicluzUniformUI,DB=window.CicluzDateBR,G=window.CicluzGP;if(!U||!DB||!G)return;
/* occurrences.js carrega antes de people.js: o cadastro de pessoas é lido só quando necessário. */
const P=new Proxy({},{get:(_,k)=>window.CicluzPeople?.[k]});
const {el,button,iconButton,ICON,fold,newId,dateBR,today,dialog,confirmDialog}=U;
const KEY='cicluz-ocorrencias-matriz-v1',ACCENT='#7c3aed',TITLE='DES - Categorias e Matriz Disciplinar',GROUP='Cadastros Geral Colaboradores';
const SEVERITY=['Leve','Moderado','Grave'];
const SEED=[
 ['Cumprimento de Horários e Disciplina',['Atraso','Saída antecipada','Descumprimento de intervalo','Falta injustificada','Falta justificada','Ausência de comunicação de atraso','Ausência de comunicação de falta','Descumprimento de escala']],
 ['Apresentação e Higiene Pessoal',['Uniforme incompleto','Uniforme inadequado','Ausência de crachá','Descumprimento de protocolo de apresentação','Descumprimento de protocolo de higiene','Uso de adereços incompatíveis com a atividade']],
 ['Cumprimento de Atividades e Rotinas',['Atividade não realizada','Descumprimento de procedimento','Falta de organização','Falta de limpeza','Falta de reposição','Descumprimento de rotina operacional']],
 ['Respeito, Comunicação e Relacionamento',['Desrespeito a colegas','Desrespeito a clientes','Desrespeito a fornecedores','Desrespeito à liderança','Comunicação inadequada','Conduta incompatível com normas internas']]];
/* Estados do fluxo de análise disciplinar (advertência, suspensão e justa causa). */
const FLOW=[['Rascunho',''],['Registrado','p-yellow'],['Aguardando análise do DP','p-yellow'],['Aguardando análise jurídica','p-yellow'],['Aprovado para formalização','p-yellow'],['Documento emitido','p-yellow'],['Aguardando ciência ou assinatura','p-yellow'],['Concluído','p-green'],['Cancelado','p-red']];
const DISCIPLINARY=['ADVERTÊNCIA','SUSPENSÃO','JUSTA CAUSA'];
const CONFIRMED=['Documento emitido','Aguardando ciência ou assinatura','Concluído'];
const isDisciplinary=t=>DISCIPLINARY.includes(t);
const isCancelled=s=>/^Cancelad/.test(s||'');
/* Registro confirmado como penalidade aplicada: cancelados e não confirmados não contam. */
const counts=r=>isCancelled(r.status)?false:isDisciplinary(r.type)?CONFIRMED.includes(r.status):!['Rascunho','Pendente','Em análise'].includes(r.status);

/* ---------- Dados ---------- */
let data={version:1,seeded:false,categories:[]},loadError=false;
const nowIso=()=>new Date().toISOString();
const mkSub=n=>({id:newId(),name:n,active:true,severity:'',guidance:'',needsDP:false,needsLegal:false,lookbackDays:null,alertRecurrences:null,priority:false});
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.categories))throw Error('format');data=s}loadError=false}catch{loadError=true}
 if(!loadError&&!data.seeded){data.seeded=true;for(const [n,subs] of SEED)data.categories.push({id:newId(),name:n,active:true,subs:subs.map(mkSub)});try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
const catById=id=>data.categories.find(c=>c.id===id)||null;
const subById=(cid,sid)=>catById(cid)?.subs.find(s=>s.id===sid)||null;
const label=(cid,sid)=>{const c=catById(cid),s=subById(cid,sid);return c?c.name+(s?' · '+s.name:''):''};
const activeCats=()=>{load();return data.categories.filter(c=>c.active)};

/* ---------- Listas de categorias e subcategorias (mantidas em DES - Tipos de Ocorrência) ---------- */
function addCategory(name){load();const n=String(name||'').trim();if(!n||loadError)return null;const ex=data.categories.find(c=>fold(c.name)===fold(n));if(ex){if(!ex.active)transact(d=>{d.categories.find(c=>c.id===ex.id).active=true});return ex.id}const id=newId();return transact(d=>d.categories.push({id,name:n,active:true,subs:[]}))?id:null}
function addSub(catId,name){load();const n=String(name||'').trim(),c=catById(catId);if(!n||!c||loadError)return null;const ex=c.subs.find(s=>fold(s.name)===fold(n));if(ex){if(!ex.active)transact(d=>{d.categories.find(x=>x.id===catId).subs.find(s=>s.id===ex.id).active=true});return ex.id}const sub=mkSub(n);return transact(d=>d.categories.find(x=>x.id===catId).subs.push(sub))?sub.id:null}

/* ---------- Pedaços do formulário de ocorrência ---------- */
function create(ctx){
 const lblx=(n,node,cls)=>{const l=el('label',cls,n);node.setAttribute('aria-label',n.replace(/\s*\*$/,''));l.append(node);return l};
 const catSel=el('select'),subSel=el('select'),info=el('div','uniforms-wide matrix-info');
 const catLabel=lblx('Categoria',catSel),subLabel=lblx('Subcategoria',subSel);
 /* seleção */
 const CATL=()=>window.CicluzOccurrenceCatalog,noteEl=el('p','uniforms-wide profiles-note');noteEl.setAttribute('role','status');
 const rowOf=id=>id?CATL()?.byId(id)||null:null;
 const rowsOfType=()=>{const t=ctx.type();return t?(CATL()?.catsOf(t)||[]):[]};
 const docField=el('input');docField.readOnly=true;docField.tabIndex=-1;docField.placeholder='Preenchido ao escolher a subcategoria';const docLabel=lblx('Documento associado',docField);
 /* subcategoria selecionada, no formato da matriz: a configuração vem do próprio cadastro do tipo */
 const S=()=>{const r=rowOf(subSel.value);return r?{id:r.subId||'',name:r.subcategory||'(sem subcategoria)',row:r,...(r.config||{})}:null};
 function fillCats(want='',reset=false){const keep=reset?'':(want||catSel.value),t=ctx.type();catSel.replaceChildren(new Option(t?'Selecione a categoria':'Escolha o tipo primeiro',''));const rows=rowsOfType(),ids=[...new Set(rows.map(r=>r.catId).filter(Boolean))],own=keep&&!ids.includes(keep)&&catById(keep);
  for(const id of ids)catSel.add(new Option(catById(id)?.name||'—',id));if(own)catSel.add(new Option(own.name+' (registro anterior)',own.id));catSel.value=[...catSel.options].some(o=>o.value===keep)?keep:'';catSel.disabled=!t||(!ids.length&&!own);
  const broken=rows.filter(r=>!r.catId||!r.subId&&r.subcategory).length;
  noteEl.textContent=!t?'':!rows.length?'Este tipo não tem categorias ativas cadastradas em DES - Tipos de Ocorrência; o lançamento segue sem classificação.':broken?'Há cadastro incompleto para este tipo: corrija em Cadastros Geral Colaboradores → DES - Tipos de Ocorrência.':'';fillSubs('',reset)}
 function fillSubs(want='',reset=false){const keep=reset?'':(want||subSel.value),c=catById(catSel.value);subSel.replaceChildren(new Option(c?'Selecione a subcategoria':'Escolha a categoria primeiro',''));
  if(c){const rows=rowsOfType().filter(r=>r.catId===c.id),own=keep&&!rows.some(r=>r.id===keep)&&rowOf(keep);for(const r of [...rows,...(own?[own]:[])])subSel.add(new Option((r.subcategory||'(sem subcategoria)')+(r.active?'':' (inativa)'),r.id));subSel.value=[...subSel.options].some(o=>o.value===keep)?keep:'';if(!rows.length&&!own)noteEl.textContent='Esta categoria não tem subcategorias ativas para este tipo: corrija em DES - Tipos de Ocorrência.'}
  subSel.disabled=!c||subSel.options.length<2;paintInfo();paintHistory();ctx.onRow?.(rowOf(subSel.value))}
 function paintInfo(){info.replaceChildren();docField.value='';docField.classList.remove('is-pending');const s=S();if(!s)return;const di=CATL()?.docInfo(s.row);
  if(!di||s.row.docCatId==='none'){docField.value='Pendência: sem documento vinculado (corrija em DES - Tipos de Ocorrência)';docField.classList.add('is-pending')}else docField.value=di.name+(di.note?' — '+di.note:'');
  if(s.severity||s.guidance||s.alertRecurrences||s.lookbackDays||s.needsDP||s.needsLegal){const box=el('div','matrix-panel'),dl=el('dl','profiles-info');box.append(el('b',null,'Apoio à decisão (configuração do cadastro)'));
   for(const [k,v] of [['Nível de gravidade',s.severity||'Não definido'],['Orientação administrativa',s.guidance||'—'],['Reincidências para alerta',s.alertRecurrences?String(s.alertRecurrences):'Não definido'],['Análise do DP',s.needsDP?'Necessária':'Não exigida'],['Análise jurídica',s.needsLegal?'Necessária':'Não exigida']])dl.append(el('dt',null,k),el('dd',null,v));
   box.append(dl,el('small','profiles-note','Apoio à decisão humana: nada aqui aplica advertência, suspensão ou justa causa.'));info.append(box)}}
 catSel.addEventListener('change',()=>fillSubs('',true));subSel.addEventListener('change',()=>{paintInfo();paintHistory();ctx.onRow?.(rowOf(subSel.value))});

 /* histórico de reincidências */
 const hist=el('section','uniforms-wide profiles-section matrix-history');const range=el('select'),from=DB.field('De'),to=DB.field('Até'),custom=el('div','matrix-range');
 for(const [v,n] of [['90','Últimos 90 dias'],['360','Últimos 360 dias'],['custom','Período personalizado']])range.add(new Option(n,v));range.setAttribute('aria-label','Período do histórico');custom.append(from.label,to.label);custom.hidden=true;
 const histBody=el('div'),histTitle=el('h4',null,'Histórico de ocorrências');hist.append(histTitle,lblx('Período de consulta',range),custom,histBody);
 range.addEventListener('change',()=>{custom.hidden=range.value!=='custom';paintHistory()});from.node.addEventListener('input',paintHistory);to.node.addEventListener('input',paintHistory);
 function window_(){const t=today(),ref=ctx.date()||t,days=Number(range.value);if(range.value==='custom')return {from:from.iso()||'',to:to.iso()||''};const d=new Date(ref+'T12:00:00');d.setDate(d.getDate()-days);return {from:d.toISOString().slice(0,10),to:ref}}
 function related(){const pid=ctx.collab(),cid=catSel.value;if(!pid||!cid)return [];const w=window_(),own=ctx.editingId();return ctx.records().filter(r=>r.id!==own&&r.collaboratorId===pid&&r.matrixCatId===cid&&(!w.from||r.date>=w.from)&&(!w.to||r.date<=w.to)).sort((a,b)=>b.date.localeCompare(a.date))}
 function paintHistory(){histBody.replaceChildren();hist.hidden=!ctx.collab()||!catSel.value;if(hist.hidden)return;histTitle.textContent='Histórico de ocorrências — '+(P.byId(ctx.collab())?.name||'');const l=related(),s=S();const confirmed=l.filter(counts);
  const sameSub=s?l.filter(r=>r.matrixSubId===s.id):[];const sameConfirmed=sameSub.filter(counts);
  histBody.append(el('p','profiles-note',l.length?l.length+' ocorrência(s) desta categoria no período · '+confirmed.length+' confirmada(s) (cancelados e não confirmados não contam como penalidade aplicada)'+(s?' · '+sameSub.length+' da subcategoria, '+sameConfirmed.length+' confirmada(s)':'')+'.':'Nenhuma ocorrência anterior desta categoria no período.'));
  if(s?.alertRecurrences&&sameConfirmed.length>=s.alertRecurrences){const a=el('p','people-alert');a.textContent='Alerta de reincidência (configurado): '+sameConfirmed.length+' registro(s) confirmado(s) de "'+s.name+'" no período (alerta a partir de '+s.alertRecurrences+'). Só um aviso para a análise humana: nada é aplicado automaticamente.';histBody.append(a)}
  if(s?.lookbackDays&&range.value!==String(s.lookbackDays))histBody.append(el('p','profiles-note','Período de consulta configurado para esta subcategoria: '+s.lookbackDays+' dias. Use "Período personalizado" para consultá-lo.'));
  if(l.length){const t=el('table','uniforms-table'),hr=el('tr');for(const h of ['Data','Tipo','Categoria','Subcategoria','Situação','Conta?'])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
   for(const r of l){const tr=el('tr');if(isCancelled(r.status))tr.classList.add('is-cancelled');tr.append(el('td',null,dateBR(r.date)),el('td',null,r.type),el('td',null,catById(r.matrixCatId)?.name||(r.matrixLabel||'').split(' · ')[0]||'—'),el('td',null,r.subcategoryName||subById(r.matrixCatId,r.matrixSubId)?.name||(r.matrixLabel||'').split(' · ')[1]||'—'),el('td',null,r.status),el('td',null,counts(r)?'Sim':'Não'));tb.append(tr)}t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);histBody.append(w)}}

 /* áudio (local; sem transcrição automática) */
 const audioBox=el('div','uniforms-wide matrix-audio');let rec=null,chunks=[],blob=null,url='',startedAt=0,seconds=0;
 const aMsg=el('p','profiles-note');aMsg.setAttribute('role','status');const player=el('audio');player.controls=true;player.hidden=true;
 const bRec=button('Gravar áudio',startRec,'btn secondary'),bStop=button('Parar gravação',stopRec,'btn secondary'),bDel=button('Descartar áudio',discard,'btn secondary');bStop.hidden=bDel.hidden=true;
 const supported=!!(navigator.mediaDevices?.getUserMedia&&window.MediaRecorder);
 const aTools=el('div','people-banner-tools');aTools.append(bRec,bStop,bDel);audioBox.append(el('span','uniforms-enum-label','Observação por áudio (opcional)'),aTools,aMsg,player);
 const infoMsg=supported?'O áudio é gravado e guardado só neste aparelho. Não há transcrição automática: digite ou revise o texto da observação à mão.':'Gravação de áudio indisponível neste navegador: digite a observação.';aMsg.textContent=infoMsg;bRec.disabled=!supported;
 async function startRec(){aMsg.textContent='';try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});chunks=[];rec=new MediaRecorder(stream);rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=()=>{stream.getTracks().forEach(t=>t.stop());seconds=Math.max(1,Math.round((Date.now()-startedAt)/1000));blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);player.src=url;player.hidden=false;bDel.hidden=false;bRec.hidden=false;bStop.hidden=true;aMsg.textContent='Áudio gravado ('+seconds+' s). Ouça, descarte ou salve a ocorrência para guardá-lo.'};startedAt=Date.now();rec.start();bRec.hidden=true;bStop.hidden=false;aMsg.textContent='Gravando…'}catch{aMsg.textContent='Não foi possível acessar o microfone. Verifique a permissão do navegador ou digite a observação.'}}
 function stopRec(){try{rec?.stop()}catch{}}
 function discard(){blob=null;if(url)URL.revokeObjectURL(url);url='';player.removeAttribute('src');player.hidden=true;bDel.hidden=true;aMsg.textContent='Áudio descartado.'}
 async function saveAudio(){if(!blob)return null;const id=newId();try{await window.CicluzDocuments.files.put(id,blob)}catch{return {error:'Não foi possível guardar o áudio neste navegador.'}}return {meta:{id,type:blob.type,size:blob.size,seconds}}}

 /* prévia do documento (não altera o status) */
 function previewDoc(){const p=P.byId(ctx.collab()),c=catById(catSel.value),s=S(),type=ctx.type(),iso=ctx.date();
  const rows=[['Empresa',G.companyName()||'Empresa não identificada pela sessão'],['Colaborador',p?.name||'—'],['Cargo',p?.jobName||'—'],['Data da ocorrência',iso?dateBR(iso):'—'],['Tipo de ocorrência',type||'—'],['Categoria',c?.name||'—'],['Subcategoria',s?.name||'—'],['Documento associado',docField.value||'—']];
  if(type==='SUSPENSÃO'&&ctx.days())rows.push(['Quantidade de dias',String(ctx.days())]);rows.push(['Motivo declarado',ctx.reason()||'—'],['Observação',ctx.note()||'—']);if(s?.severity)rows.push(['Nível (classificação administrativa)',s.severity]);const m=ctx.modelName();rows.push(['Modelo',m?'Modelo cadastrado: '+m:'Sem modelo oficial: prévia demonstrativa']);
  dialog('Prévia do documento',(f,form)=>{form.append(el('p','people-alert','Prévia'+(m?'':' demonstrativa')+': não é um documento emitido. Visualizar não altera o status da ocorrência e a plataforma não gera o texto jurídico.'));const dl=el('dl','profiles-info');for(const [k,v] of rows)dl.append(el('dt',null,k),el('dd',null,v));form.append(dl)})}
 const previewBtn=button('Visualizar documento',previewDoc,'btn secondary');

 const matrixNodes=[catLabel,subLabel,noteEl,docLabel,info,hist];
 return {nodes:matrixNodes,audioBox,previewBtn,fillRow:(rowId,cid,sid)=>{const r=rowOf(rowId)||(cid&&sid?rowsOfType().find(x=>x.catId===cid&&x.subId===sid):null);fillCats(r?.catId||cid||'');if(r)fillSubs(r.id)},row:()=>rowOf(subSel.value),refresh:()=>{fillCats('',true);paintHistory()},docText:()=>docField.value,paintHistory,
  value:()=>{const s=S(),c=catById(catSel.value);return {matrixCatId:catSel.value,matrixSubId:s?.id||'',matrixLabel:c?c.name+(s&&s.id?' · '+s.name:''):'',rowId:subSel.value}},
  required:t=>isDisciplinary(t),show:t=>{catLabel.hidden=subLabel.hidden=false},saveAudio,hasAudio:()=>!!blob,clearAudio:()=>{discard();aMsg.textContent=infoMsg},
  sub:()=>S()}}
window.CicluzMatrix={create,addCategory,addSub,FLOW,DISCIPLINARY,isDisciplinary,isCancelled,counts,catById,subById,label,load,activeCats,
 playAudio:async meta=>{const b=await window.CicluzDocuments.files.get(meta.id);if(!b)return null;return URL.createObjectURL(b)},
 relatedByEvaluation:(personId)=>{load();return (window.CicluzOccurrences?.list()||[]).filter(r=>r.collaboratorId===personId&&!isCancelled(r.status))}};
})();
