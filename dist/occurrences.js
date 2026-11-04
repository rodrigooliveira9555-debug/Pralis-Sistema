/* Lançamentos de Ocorrências. Records persist in this browser without medical data; attachments and medical fields live only in memory. */
(()=>{
'use strict';
const D=window.CicluzUniformData,U=window.CicluzUniformUI,DB=window.CicluzDateBR,R=window.CicluzOccurrenceReader;if(!D||!U||!DB||!R)return;
const {el,button,iconButton,svg,ICON,fold,newId,dateBR,today,enumField,dialog,confirmDialog}=U;
const KEY='cicluz-ocorrencias-v1',ACCENT='#7c3aed',PATH='Formulários / Gestão de Pessoas / Lançamentos de Ocorrências',MAX=10*1024*1024;
const ACCEPT=['image/jpeg','image/png','application/pdf'],DOC_ICON='M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6',CAMERA='M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',SCAN='M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4M7 12h10';
const TYPES=[
 ['DECLARAÇÃO',{medical:true,hint:'Priorize data, documento, clínica e identificação do profissional, quando aplicável.'}],
 ['FALTA INJUSTIFICADA',{days:true,hint:'Registre dias, motivo declarado, comunicação e status. Documento médico não é exigido.'}],
 ['FALTA JUSTIFICADA',{days:true,medical:true,hint:'Anexe o documento comprobatório e informe motivo, dias e dados médicos quando houver.'}],
 ['ADVERTÊNCIA',{hint:'Registre a ocorrência, o motivo, a comunicação e anexe a documentação.'}],
 ['SUSPENSÃO',{days:true,period:true,hint:'A quantidade de dias e o período correspondente ficam em destaque.'}],
 ['JUSTA CAUSA',{hint:'Registre o motivo e anexe os documentos relacionados.'}]];
const typeConfig=t=>(TYPES.find(x=>x[0]===t)||[,{}])[1];
/* Provisional demonstration statuses, not company rules. */
const STATUSES=[['Pendente','p-yellow'],['Em análise','p-yellow'],['Justificada','p-green'],['Não justificada','p-red'],['Concluída','p-green'],['Cancelada','p-red']];
const MEDICAL=[['clinic','Clínica / Posto / Hospital'],['cid','CID Nº'],['doctor','Nome Médico'],['crm','CRM']];

/* Persistent part: no attachments, no medical fields. */
let data={version:1,records:[]},loadError=false;
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved){if(saved.version!==1||!Array.isArray(saved.records))throw Error('format');data=saved}loadError=false}catch{loadError=true}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change();localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
/* Memory-only part, lost on reload by design. */
const sensitive=new Map();
load();

/* Gestão de Pessoas registry when present; demo list only as a fallback. */
function collaborators(){return window.CicluzPeople?.selectable()||D.demoCollaborators}
const collaboratorById=id=>collaborators().find(c=>c.id===id);
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const periodText=(iso,days)=>iso&&days?dateBR(iso)+' a '+dateBR(addDays(iso,days-1))+' ('+days+' dia'+(days>1?'s':'')+')':'';
const sizeText=n=>n<1024*1024?Math.max(1,Math.round(n/1024))+' KB':(n/1024/1024).toFixed(1).replace('.',',')+' MB';

const view=el('section','view');view.id='occurrences-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(DOC_ICON);const heading=el('div');heading.append(el('h2',null,'Lançamentos de Ocorrências'),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>openSection(sections[7][0],'Gestão de Pessoas','forms',ACCENT));
const addButton=button('',()=>{resetForm();formStatus.textContent='';collab.search.closest('label').querySelector('select').focus()},'shortcut-circle');addButton.title='Nova ocorrência';addButton.setAttribute('aria-label','Nova ocorrência');addButton.innerHTML=svg(ICON.plus);head.querySelector('.shortcut-actions').append(addButton);
const loadNote=el('p','profiles-error');loadNote.setAttribute('role','alert');
body.append(el('div','form-note','Simulação local: ocorrências ficam neste navegador. Anexos e dados médicos (clínica, CID, médico e CRM) ficam só na memória e são perdidos ao atualizar a página. Nenhuma penalidade, desconto ou desligamento é aplicado automaticamente.'),loadNote);

/* ---------- Formulário ---------- */
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const formTitle=el('h3','uniforms-wide uniforms-heading','Nova ocorrência');
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const collab=enumField('Colaborador *','Buscar colaborador');
const type=el('select');type.add(new Option('Selecione',''));TYPES.forEach(([t])=>type.add(new Option(t,t)));const typeLabel=lbl('Tipo de ocorrência *',type);
const dateIn=DB.field('Data da ocorrência *');
const days=el('input');days.type='number';days.min='1';days.step='1';days.inputMode='numeric';days.placeholder='Ex.: 3';days.addEventListener('keydown',e=>{if(['e','E','+','-','.',','].includes(e.key))e.preventDefault()});const daysLabel=lbl('Quantidade de dias',days);
const status=el('select');STATUSES.forEach(([s])=>status.add(new Option(s,s)));const statusLabel=lbl('Status da ocorrência *',status);
const commBox=el('fieldset','occurrences-choice');commBox.append(el('legend',null,'Foi comunicado? *'));const comm={};for(const v of ['SIM','NÃO']){const l=el('label','profiles-choice'),r=el('input');r.type='radio';r.name='occurrence-communicated';r.value=v;comm[v]=r;l.append(r,el('span',null,v));commBox.append(l)}
const period=el('div','uniforms-wide occurrences-period');period.setAttribute('aria-live','polite');
const hint=el('p','uniforms-wide profiles-note');
const reason=el('textarea');reason.rows=4;const reasonLabel=lbl('Motivo declarado pelo colaborador',reason,'uniforms-wide');
/* Attachments */
const attachBox=el('div','uniforms-wide occurrences-attachments');
const pick=el('input');pick.type='file';pick.accept='.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';pick.multiple=true;pick.hidden=true;
const camera=el('input');camera.type='file';camera.accept='image/*';camera.setAttribute('capture','environment');camera.hidden=true;
const replace=el('input');replace.type='file';replace.accept=pick.accept;replace.hidden=true;let replacing=null;
const attachTools=el('div','occurrences-tools');const pickBtn=button('Selecionar arquivos',()=>pick.click());const camBtn=button('Usar câmera',()=>camera.click());attachTools.append(pickBtn,camBtn);
const attachList=el('div','occurrences-files');const attachMsg=el('p','profiles-note');attachMsg.setAttribute('role','status');
attachBox.append(el('span','uniforms-enum-label','Foto ou documento da ocorrência'),attachTools,el('p','profiles-note','JPG, JPEG, PNG ou PDF, até 10 MB cada. Os arquivos não são enviados a servidores.'),attachList,attachMsg,pick,camera,replace);
/* Medical document data */
/* The four document fields sit right below the attachment area, in the form's own grid. */
const med={},medLabels=[];
for(const [k,name] of MEDICAL){const node=el('input');node.type='text';node.maxLength=k==='cid'?10:k==='crm'?20:160;node.placeholder=k==='cid'?'Somente se constar no documento':k==='crm'?'Ex.: 12345-MG':'';if(k==='crm')node.addEventListener('input',()=>{node.value=node.value.toUpperCase()});
 /* A value typed by the user is never replaced by a later reading without an explicit choice. */
 node.addEventListener('input',()=>{node.dataset.manual='1';delete node.dataset.read;paintMedNote()});med[k]=node;medLabels.push(lbl(name,node))}
const medNote=el('p','uniforms-wide profiles-note');medNote.setAttribute('role','status');
function paintMedNote(){const read=MEDICAL.filter(([k])=>med[k].dataset.read).map(m=>m[1]);medNote.textContent=read.length?'Preenchido pela leitura do documento: '+read.join(', ')+'. Confira e corrija antes de salvar.':'Clínica, CID, médico e CRM: preenchimento manual ou pela leitura do documento anexado. CID não é exigido quando não constar no documento.'}
paintMedNote();
/* Free text and document codes keep exactly what was typed: stop the platform's name capitalization on blur. */
for(const n of [reason,med.cid,med.crm])n.addEventListener('focusout',e=>e.stopPropagation());
const formError=el('p','uniforms-wide profiles-error');formError.setAttribute('role','alert');const formStatus=el('p','uniforms-wide profiles-note');formStatus.setAttribute('role','status');
const actions=el('div','uniforms-wide actions');const save=el('button','btn','Salvar Ocorrência');save.type='submit';actions.append(button('Cancelar',()=>{resetForm();formStatus.textContent='Ocorrência descartada.'}),save);
form.append(formTitle,collab.label,typeLabel,hint,dateIn.label,daysLabel,period,statusLabel,commBox,reasonLabel,attachBox,...medLabels,medNote,formError,formStatus,actions);
const history=el('div','uniforms-history');body.append(form,history);

let draft={editingId:null,attachments:[]};
function renderCollaborators(select,search,cur,blank='Selecione o colaborador'){const q=fold(search.value);select.replaceChildren(new Option(blank,''));for(const c of collaborators())if(c.id===cur||fold(c.name).includes(q))select.add(new Option(c.name+(c.active?'':' (inativo)'),c.id));const own=editing();if(select===collab.select&&own&&own.collaboratorId===cur&&!collaboratorById(cur))select.add(new Option(own.collaboratorName+' (preservado)',cur));select.value=cur}
collab.search.addEventListener('input',()=>renderCollaborators(collab.select,collab.search,collab.select.value));
function editing(){return draft.editingId?data.records.find(r=>r.id===draft.editingId):null}
/* The type adapts emphasis only; values already typed are never cleared. */
function renderType(){const cfg=typeConfig(type.value);hint.textContent=type.value?cfg.hint:'Selecione o tipo para ver as orientações do registro.';daysLabel.firstChild.textContent=cfg.days?'Quantidade de dias *':'Quantidade de dias';daysLabel.classList.toggle('is-emphasis',!!cfg.period);renderPeriod()}
function renderPeriod(){const iso=dateIn.iso(),n=Number(days.value),ok=/^\d+$/.test(days.value)&&n>=1;period.classList.toggle('is-emphasis',typeConfig(type.value).period===true);period.textContent=ok&&iso?'Período demonstrativo: '+periodText(iso,n):ok?'Informe uma data válida para calcular o período.':'Informe a quantidade de dias para ver o período.'}
type.addEventListener('change',renderType);days.addEventListener('input',renderPeriod);dateIn.node.addEventListener('input',renderPeriod);

function addFiles(files,at){const before=new Set(draft.attachments);attachMsg.textContent='';const rejected=[];for(const file of files){if(!ACCEPT.includes(file.type)){rejected.push(file.name+' (formato não aceito)');continue}if(file.size>MAX){rejected.push(file.name+' (acima de 10 MB)');continue}const item={id:newId(),file,name:file.name,type:file.type,size:file.size,url:URL.createObjectURL(file)};if(at!==undefined){const old=draft.attachments[at];draft.attachments.splice(at,1,item);release(old)}else draft.attachments.push(item)}if(rejected.length)attachMsg.textContent='Não anexado: '+rejected.join('; ')+'.';renderAttachments();
 /* Attaching a photo or PDF starts the local reading at once; the result is only applied after review. */
 const added=draft.attachments.filter(a=>!before.has(a));if(added[0]&&!reading)analyzeDocument(added[0])}
/* Object URLs are released only when no saved record still points to the file. */
function release(item){if(item&&![...sensitive.values()].some(s=>s.attachments.includes(item)))URL.revokeObjectURL(item.url)}
pick.onchange=()=>{addFiles([...pick.files]);pick.value=''};camera.onchange=()=>{addFiles([...camera.files]);camera.value=''};replace.onchange=()=>{if(replace.files[0]&&replacing!==null)addFiles([replace.files[0]],replacing);replacing=null;replace.value=''};
function preview(item){const box=el('div','occurrences-preview');if(item.type==='application/pdf'){const ic=el('span','occurrences-pdf');ic.innerHTML=svg(DOC_ICON);ic.append(el('b',null,'PDF'));box.append(ic)}else{const img=el('img');img.src=item.url;img.alt='Pré-visualização de '+item.name;box.append(img)}return box}
function renderAttachments(){attachList.replaceChildren();if(!draft.attachments.length){attachList.append(el('p','profiles-note','Nenhum arquivo anexado.'));return}
 draft.attachments.forEach((item,i)=>{const row=el('div','occurrences-file');const info=el('div','occurrences-file-info');info.append(el('b',null,item.name),el('small',null,(item.type==='application/pdf'?'PDF':'Imagem')+' · '+sizeText(item.size)));const tools=el('div','occurrences-file-tools');
  const analyze=button('Analisar Documento',()=>analyzeDocument(item),'btn');analyze.dataset.item=item.id;analyze.innerHTML='';analyze.append(el('span',null,'Analisar Documento'));
  tools.append(analyze,iconButton('Visualizar '+item.name,ICON.eye,()=>viewFiles([item])),iconButton('Substituir '+item.name,ICON.edit,()=>{replacing=i;replace.click()},'is-accent'),iconButton('Remover '+item.name,ICON.trash,()=>{draft.attachments.splice(i,1);release(item);renderAttachments()},'is-danger'));
  row.append(preview(item),info,tools);attachList.append(row)})}
function viewFiles(items){dialog(items.length>1?'Documentos da ocorrência':'Visualizar documento',(f,form)=>{for(const item of items){const fig=el('figure','occurrences-viewer');if(item.type==='application/pdf'){const frame=el('iframe');frame.src=item.url;frame.title=item.name;fig.append(frame)}else{const img=el('img');img.src=item.url;img.alt=item.name;fig.append(img)}fig.append(el('figcaption',null,item.name+' · '+sizeText(item.size)));form.append(fig)}})}

/* Local reading: suggestions only, reviewed before touching the form. */
let reading=false;
async function analyzeDocument(item){if(reading)return;const btn=attachList.querySelector('button[data-item="'+item.id+'"]');if(!btn)return;reading=true;const label=btn.querySelector('span');btn.disabled=true;btn.setAttribute('aria-busy','true');label.textContent='Lendo documento…';attachMsg.textContent='Leitura local em andamento. Na primeira vez, o leitor é carregado (pode levar alguns segundos).';
 try{const res=await R.read(item.file,p=>{label.textContent='Lendo documento… '+p+'%'});const found=R.extract(res.text);attachMsg.textContent='';reviewSuggestions(found,res,item)}
 catch{attachMsg.textContent='Não foi possível ler este documento neste navegador. O preenchimento manual continua disponível.'}
 finally{reading=false;const b=attachList.querySelector('button[data-item="'+item.id+'"]');if(b){b.disabled=false;b.removeAttribute('aria-busy');b.querySelector('span').textContent='Analisar Documento'}}}
function reviewSuggestions(found,res,item){const fields=[...MEDICAL,['date','Data do documento → Data da ocorrência'],['days','Dias de afastamento → Quantidade de dias']];const keys=fields.map(f=>f[0]).filter(k=>found[k]!==undefined);
 dialog('Conferir dados lidos do documento',(f,form)=>{form.append(el('p','profiles-note',(res.method==='pdf-text'?'Texto obtido do PDF.':res.method==='pdf-ocr'?'Primeira página do PDF lida por reconhecimento de texto.':'Imagem lida por reconhecimento de texto.')+' São sugestões: confira e corrija antes de aplicar. Nada foi preenchido ainda.'));
  const rows={};if(!keys.length)form.append(el('p','uniforms-confirm-text','Nenhum dado de clínica, CID, médico, CRM, data ou dias foi identificado em '+item.name+'. Preencha manualmente.'));
  for(const [k,name] of fields){if(found[k]===undefined)continue;const row=el('div','occurrences-suggestion'),check=el('input');check.type='checkbox';check.checked=k!=='date';check.setAttribute('aria-label','Aplicar '+name);const input=el('input');input.type='text';input.value=k==='date'?dateBR(found[k]):String(found[k]);input.setAttribute('aria-label',name);const l=el('label',null,name);l.append(input);row.append(check,l);
   const typed=med[k]?.dataset.manual&&med[k].value.trim();if(typed&&typed!==input.value.trim()){check.checked=false;l.append(el('small','profiles-note','Já preenchido manualmente: "'+typed+'". Marque para substituir.'))}form.append(row);rows[k]={check,input}}
  const missing=fields.filter(([k])=>found[k]===undefined).map(f=>f[1].split(' →')[0]);if(keys.length&&missing.length)form.append(el('p','profiles-note','Não identificado: '+missing.join(', ')+'.'));
  if(res.text.trim()){const raw=el('details','occurrences-raw');raw.append(el('summary',null,'Ver texto lido'),el('pre',null,res.text.trim().slice(0,4000)));form.append(raw)}
  return rows},keys.length?rows=>{const applied=[];for(const [k,{check,input}] of Object.entries(rows)){if(!check.checked)continue;const v=input.value.trim();if(k==='date'){const iso=DB.parse(v);if(!iso)return 'Data do documento inválida. Use DD/MM/AAAA ou desmarque.';dateIn.set(iso)}else if(k==='days'){if(!/^\d+$/.test(v)||+v<1)return 'Dias devem ser um número inteiro a partir de 1, ou desmarque.';days.value=v}else{med[k].value=k==='crm'?v.toUpperCase():v;delete med[k].dataset.manual;if(v)med[k].dataset.read='1';else delete med[k].dataset.read}applied.push(fields.find(f=>f[0]===k)[1].split(' →')[0])}
   paintMedNote();renderPeriod();formStatus.textContent=applied.length?'Sugestões aplicadas: '+applied.join(', ')+'. Confira antes de salvar.':'Nenhuma sugestão aplicada.';return null}:null,'Aplicar ao formulário',()=>{})}

function resetForm(){draft.attachments.forEach(release);draft={editingId:null,attachments:[]};formTitle.textContent='Nova ocorrência';collab.search.value='';renderCollaborators(collab.select,collab.search,'');type.value='';status.value='Pendente';dateIn.set(today());days.value='';reason.value='';comm.SIM.checked=comm['NÃO'].checked=false;for(const n of Object.values(med)){n.value='';delete n.dataset.manual;delete n.dataset.read}paintMedNote();formError.textContent='';attachMsg.textContent='';renderType();renderAttachments();save.disabled=loadError}
form.onsubmit=e=>{e.preventDefault();formError.textContent='';formStatus.textContent='';const errors=[],own=editing(),c=collaboratorById(collab.select.value),iso=dateIn.iso(),cfg=typeConfig(type.value);
 if(!collab.select.value)errors.push('Selecione o colaborador.');if(!type.value)errors.push('Selecione o tipo de ocorrência.');if(!iso)errors.push('Informe uma data da ocorrência válida (DD/MM/AAAA).');
 const n=days.value.trim()===''?null:Number(days.value);if(n!==null&&!(Number.isInteger(n)&&n>=1))errors.push('Quantidade de dias deve ser um número inteiro a partir de 1.');if(cfg.days&&n===null)errors.push('Informe a quantidade de dias para '+type.value+'.');
 const communicated=comm.SIM.checked?'SIM':comm['NÃO'].checked?'NÃO':'';if(!communicated)errors.push('Indique se a ocorrência foi comunicada.');
 if(errors.length){formError.textContent=errors.join(' ');return}
 const now=new Date().toISOString(),medicalData=Object.fromEntries(MEDICAL.map(([k])=>[k,med[k].value.trim()])),hasMedical=Object.values(medicalData).some(Boolean);
 const record={id:own?.id||newId(),date:iso,days:n,collaboratorId:collab.select.value,collaboratorName:c?.name||own?.collaboratorName||'',collaboratorActive:c?c.active:own?.collaboratorActive??true,type:type.value,status:status.value,reason:reason.value,communicated,attachmentCount:draft.attachments.length,hasMedical,createdAt:own?.createdAt||now,updatedAt:now,revisions:own?[...(own.revisions||[]),{at:now,previous:{date:own.date,days:own.days,type:own.type,status:own.status,communicated:own.communicated}}]:[]};
 if(!transact(()=>{data.records=[...data.records.filter(r=>r.id!==record.id),record]})){formError.textContent='Não foi possível salvar neste navegador. O formulário foi mantido.';return}
 const previous=sensitive.get(record.id);sensitive.set(record.id,{attachments:[...draft.attachments],medical:medicalData});previous?.attachments.filter(a=>!draft.attachments.includes(a)).forEach(a=>{if(![...sensitive.values()].some(s=>s.attachments.includes(a)))URL.revokeObjectURL(a.url)});
 draft.attachments=[];const msg=(own?'Ocorrência atualizada':'Ocorrência salva')+': '+record.type+' · '+record.collaboratorName+' · '+dateBR(record.date)+(record.days?' · '+periodText(record.date,record.days):'')+'.';resetForm();renderHistory();formStatus.textContent=msg};
function editRecord(r){draft.attachments.forEach(release);const mem=sensitive.get(r.id);draft={editingId:r.id,attachments:[...(mem?.attachments||[])]};formTitle.textContent='Editar ocorrência de '+dateBR(r.date);collab.search.value='';renderCollaborators(collab.select,collab.search,r.collaboratorId);type.value=r.type;status.value=r.status;dateIn.set(r.date);days.value=r.days?String(r.days):'';reason.value=r.reason||'';comm.SIM.checked=r.communicated==='SIM';comm['NÃO'].checked=r.communicated==='NÃO';for(const [k] of MEDICAL){const n=med[k];n.value=mem?.medical[k]||'';delete n.dataset.read;if(n.value)n.dataset.manual='1';else delete n.dataset.manual}paintMedNote();renderType();renderAttachments();formError.textContent='';
 formStatus.textContent='Editando a ocorrência.'+((r.attachmentCount&&!mem)||(r.hasMedical&&!mem)?' Anexos e dados médicos registrados antes de atualizar a página não estão mais disponíveis; anexe novamente se necessário.':'');form.scrollIntoView({block:'start',behavior:'smooth'})}

/* ---------- Histórico ---------- */
const hStatus=el('p','profiles-note');hStatus.setAttribute('role','status');const hTable=el('div','uniforms-table-wrap');
history.append(el('h3','uniforms-heading','Histórico de ocorrências'),hStatus,hTable);
function docCell(r){const mem=sensitive.get(r.id);if(mem?.attachments.length)return mem.attachments.length+' anexo(s)';if(r.attachmentCount)return 'Indisponível após atualizar';return '—'}
function renderHistory(){hTable.replaceChildren();const all=data.records;const list=[...all].sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)));
 hStatus.textContent=all.length?all.length+' ocorrência(s), da mais recente à mais antiga.':'Nenhuma ocorrência registrada.';
 if(!list.length)return;
 const table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Data','Colaborador','Tipo de ocorrência','Dias','Status','Foi comunicado?','Documento','Ações'])hr.append(el('th',null,h));const thead=el('thead');thead.append(hr);const tbody=el('tbody');
 for(const r of list){const tr=el('tr');if(r.status==='Cancelada')tr.classList.add('is-cancelled');const st=el('td');st.append(el('span','pill '+((STATUSES.find(s=>s[0]===r.status)||[])[1]||''),r.status));
  tr.append(el('td',null,dateBR(r.date)),el('td',null,r.collaboratorName+(r.collaboratorActive===false?' (inativo)':'')),el('td',null,r.type),el('td','uniforms-num',r.days?String(r.days):'—'),st,el('td',null,r.communicated),el('td',null,docCell(r)));
  const a=el('td','uniforms-row-actions'),mem=sensitive.get(r.id);a.append(iconButton('Visualizar detalhes',ICON.eye,()=>showDetails(r)));if(mem?.attachments.length)a.append(iconButton('Visualizar documento',DOC_ICON,()=>viewFiles(mem.attachments)));a.append(iconButton('Editar ocorrência',ICON.edit,()=>editRecord(r),'is-accent'));if(r.status!=='Cancelada')a.append(iconButton('Cancelar ocorrência',ICON.ban,()=>cancelRecord(r)));a.append(iconButton('Excluir ocorrência',ICON.trash,()=>deleteRecord(r),'is-danger'));tr.append(a);tbody.append(tr)}
 table.append(thead,tbody);hTable.append(table)}
const describe=r=>dateBR(r.date)+' · '+r.collaboratorName+' · '+r.type;
function afterChange(){if(draft.editingId&&!data.records.some(r=>r.id===draft.editingId))resetForm();renderHistory()}
function deleteRecord(r){confirmDialog('Excluir ocorrência?','A ocorrência '+describe(r)+' será removida do histórico, com seus anexos em memória. Esta ação não pode ser desfeita. Para manter o registro, use Cancelar ocorrência.','Confirmar exclusão',()=>{if(!transact(()=>{data.records=data.records.filter(x=>x.id!==r.id)}))return 'Não foi possível salvar neste navegador.';const mem=sensitive.get(r.id);sensitive.delete(r.id);mem?.attachments.forEach(release);formStatus.textContent='Ocorrência excluída.';return null},afterChange)}
function cancelRecord(r){confirmDialog('Cancelar ocorrência?','A ocorrência '+describe(r)+' continuará no histórico com o status Cancelada.','Confirmar cancelamento',()=>{if(!transact(()=>{const x=data.records.find(y=>y.id===r.id);x.revisions=[...(x.revisions||[]),{at:new Date().toISOString(),previous:{status:x.status},action:'Cancelada'}];x.status='Cancelada';x.updatedAt=new Date().toISOString()}))return 'Não foi possível salvar neste navegador.';formStatus.textContent='Ocorrência cancelada.';return null},afterChange)}
function showDetails(r){const mem=sensitive.get(r.id);dialog('Detalhes da ocorrência',(f,form)=>{const dl=el('dl','profiles-info');const rows=[['Colaborador',r.collaboratorName+(r.collaboratorActive===false?' (inativo)':'')],['Tipo de ocorrência',r.type],['Data da ocorrência',dateBR(r.date)],['Quantidade de dias',r.days?String(r.days):'Não informada'],...(r.days?[['Período demonstrativo',periodText(r.date,r.days)]]:[]),['Status',r.status],['Foi comunicado?',r.communicated],['Motivo declarado',r.reason||'Não informado']];
 if(mem)for(const [k,name] of MEDICAL)rows.push([name,mem.medical[k]||'Não informado']);else if(r.hasMedical)rows.push(['Dados médicos','Registrados apenas em memória; indisponíveis após atualizar a página.']);
 rows.push(['Documentos',mem?.attachments.length?mem.attachments.map(a=>a.name).join(', '):r.attachmentCount?r.attachmentCount+' anexo(s) indisponível(is) após atualizar a página':'Nenhum'],['Registrada em',new Date(r.createdAt).toLocaleString('pt-BR')],['Última alteração',new Date(r.updatedAt).toLocaleString('pt-BR')]);
 for(const [k,v] of rows)dl.append(el('dt',null,k),el('dd',null,v));form.append(dl);if(mem?.attachments.length)form.append(button('Visualizar documento',()=>{form.closest('dialog').close();viewFiles(mem.attachments)},'btn'));
 if(r.revisions?.length){form.append(el('h3','uniforms-heading','Histórico de alterações'));const ul=el('ul','uniforms-reference-list');for(const v of r.revisions){const li=el('li'),p=v.previous||{};li.append(el('span',null,new Date(v.at).toLocaleString('pt-BR')+' — '+(v.action||'Editada')),el('small',null,v.action?'Status anterior: '+p.status:'Antes: '+dateBR(p.date)+' · '+p.type+' · '+(p.days?p.days+' dia(s)':'sem dias')+' · '+p.status+' · comunicado '+p.communicated));ul.append(li)}form.append(ul)}})}

function showOccurrences(opts={}){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Lançamentos de Ocorrências';load();loadNote.textContent=loadError?'Não foi possível ler as ocorrências salvas. Os dados foram preservados; recarregue a página antes de alterar.':'';resetForm();formStatus.textContent='';if(opts.collaboratorId){renderCollaborators(collab.select,collab.search,opts.collaboratorId)}renderHistory();normalizeHeaderActions(view)}
window.showOccurrences=showOccurrences;
/* Read-only access for the collaborator file; medical data and attachments stay in this module's memory. */
window.CicluzOccurrences={list:()=>{if(!view.classList.contains('show'))load();return data.records},attachments:id=>sensitive.get(id)?.attachments||[],show:showOccurrences};
window.addEventListener('storage',e=>{if(e.key===KEY&&view.classList.contains('show')){load();renderHistory()}});
})();
