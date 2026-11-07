/* Documentações: the 11 signed documents of each collaborator, linked by the registry id (CicluzPeople).
   Metadata in localStorage (cicluz-documentos-v1); the files themselves only in this browser's IndexedDB.
   Attaching never completes a document: only the DP's manual conference does. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,F=window.CicluzFieldRules,DB=window.CicluzDateBR;if(!P||!U||!DB)return;
const {el,button,iconButton,svg,ICON,fold,newId,dateBR,today,dialog,confirmDialog}=U;
const KEY='cicluz-documentos-v1',ACCENT='#7c3aed',PATH=menuCrumb(2,'Lançamentos Colaboradores','Documentações'),MAX=10*1024*1024;
const ACCEPT=['image/jpeg','image/png','image/webp','application/pdf'];
const DOC_ICON=telaIcone.ocorrencias,CAMERA='M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',X_ICON='M6 6l12 12M18 6 6 18',DOT='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',DASH='M6 12h12';
/* Titles as given by the DP. multi = new signed records may be added over the employment; sensitive = health data. */
const CATS=[
 {id:'armario',name:'Termo de Responsabilidade pelo Uso do Armário e Guarda de Pertences Pessoais'},
 {id:'uniforme',name:'Termo de Recebimento e Responsabilidade de Uniforme',multi:'Nova entrega de uniforme'},
 {id:'aliciamento',name:'Termo de Não Aliciamento'},
 {id:'compromisso',name:'Termo de Compromisso'},
 {id:'whatsapp',name:'Termo de Ciência sobre Comunicação Interna por WhatsApp'},
 {id:'horario',name:'Registro de Alterações de Horário de Trabalho',multi:'Nova alteração de horário'},
 {id:'saude',name:'Formulário de Autodeclaração de Condição de Saúde do Colaborador',sensitive:true},
 {id:'conduta',name:'Código de Conduta — PRALIS',note:'Inclui os termos de ciência, confidencialidade e autorização de uso de imagem do próprio Código: anexe todas as páginas assinadas neste registro.'},
 {id:'regimento',name:'Regimento Interno — Termo de Ciência'},
 {id:'imagem',name:'Termo de Autorização de Uso de Imagem'},
 {id:'experiencia',name:'Avaliação do Período de Experiência',multi:'Nova avaliação (ex.: 30 ou 60 dias)'},
 {id:'intervalo',name:'Acordo Individual de Redução do Intervalo Intrajornada'},
 {id:'contrato',name:'Contrato de Trabalho',multi:true,note:'Cada versão gerada em Cadastros Geral Colaboradores → DES - Contrato de Trabalho entra aqui; anexe o contrato físico assinado e confira. Nenhuma cláusula é gerada pelo sistema.'}];
const catById=id=>CATS.find(c=>c.id===id);
const STATE={pending:{label:'Pendente',pill:'p-red',icon:X_ICON},review:{label:'Aguardando conferência',pill:'p-yellow',icon:DOT},done:{label:'Concluído',pill:'p-green',icon:ICON.ok},na:{label:'Não aplicável',pill:'',icon:DASH}};

/* ---------- Metadata (no file content here) ---------- */
let data={version:1,people:{}},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||typeof s.people!=='object')throw Error('format');data=s}loadError=false}catch{loadError=true}}
function transact(change){const before=JSON.stringify(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=JSON.parse(before);return false}}
const blank=()=>({cats:{},history:[]});
const docsOf=id=>data.people[id]||blank();
const catOf=(id,c)=>docsOf(id).cats[c]||{na:null,records:[]};
const ensure=(d,id,c)=>{const p=d.people[id]=d.people[id]||blank();return p.cats[c]=p.cats[c]||{na:null,records:[]}};
const logDoc=(d,id,text)=>{const p=d.people[id]=d.people[id]||blank();p.history.push({at:new Date().toISOString(),text})};
const recordState=r=>!r.files?.length?'pending':r.checkedAt?'done':'review';
/* Category: Não aplicável only by the DP; otherwise any unreviewed file → review, any missing file → pending. */
function catState(id,c){const k=catOf(id,c);if(k.na)return 'na';const st=k.records.map(recordState);if(!st.length||st.every(s=>s==='pending'))return 'pending';if(st.includes('review'))return 'review';if(st.includes('pending'))return 'pending';return 'done'}
function summary(id){const s={total:CATS.length,done:0,review:0,pending:0,na:0};for(const c of CATS)s[catState(id,c.id)]++;s.applicable=s.total-s.na;s.open=s.applicable-s.done;s.complete=s.applicable>0&&s.done===s.applicable;return s}
const reviewer=()=>{try{return JSON.parse(sessionStorage.getItem('cicluz-sync-aba')||'null')?.perfil?.nome||''}catch{return ''}};

/* ---------- Files: IndexedDB only ---------- */
let dbp=null;
function idb(){return dbp=dbp||new Promise((ok,fail)=>{if(!window.indexedDB)return fail(Error('indexeddb'));const r=indexedDB.open('cicluz-documentos',1);r.onupgradeneeded=()=>r.result.createObjectStore('arquivos');r.onsuccess=()=>ok(r.result);r.onerror=()=>{dbp=null;fail(r.error)}})}
async function putFiles(items){const db=await idb();return new Promise((ok,fail)=>{const t=db.transaction('arquivos','readwrite');for(const i of items)t.objectStore('arquivos').put(i.blob,i.id);t.oncomplete=()=>ok();t.onerror=t.onabort=()=>fail(t.error)})}
async function getFile(id){const db=await idb();return new Promise((ok,fail)=>{const r=db.transaction('arquivos').objectStore('arquivos').get(id);r.onsuccess=()=>ok(r.result||null);r.onerror=()=>fail(r.error)})}

/* Format, size and a real read of each file before it can be confirmed. */
async function inspect(file){if(!ACCEPT.includes(file.type))return file.name+': formato não aceito (use JPG, PNG, WEBP ou PDF)';if(file.size>MAX)return file.name+': acima de 10 MB';if(!file.size)return file.name+': arquivo vazio';
 try{if(file.type==='application/pdf'){const head=new TextDecoder().decode(await file.slice(0,5).arrayBuffer());if(head!=='%PDF-')return file.name+': o conteúdo não é um PDF válido'}else{const url=URL.createObjectURL(file);try{await new Promise((ok,fail)=>{const i=new Image();i.onload=()=>i.naturalWidth?ok():fail();i.onerror=fail;i.src=url})}finally{URL.revokeObjectURL(url)}}}catch{return file.name+': não foi possível ler o arquivo'}return null}
const sizeText=n=>n>=1048576?(n/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(n/1024))+' KB';

/* ---------- Official templates (copied unchanged to dist/modelos; DOCX shown through a Word-exported PDF) ---------- */
const MODELS={
 armario:{pdf:'armario.pdf',original:'armario.docx',file:'Termo de Responsabilidade pelo Uso do Armário e Guarda de Pertences Pessoais'},
 uniforme:{pdf:'uniforme.pdf',file:'Termo de Recebimento e Responsabilidade de Uniforme'},
 aliciamento:{pdf:'aliciamento.pdf',file:'Termo de Não Aliciamento'},
 compromisso:{pdf:'compromisso.pdf',original:'compromisso.docx',file:'Termo de Compromisso Pralis'},
 whatsapp:{pdf:'whatsapp.pdf',file:'Termo de Ciência sobre Uso de Grupos de WhatsApp'},
 horario:{pdf:'horario.pdf',file:'Registro de Alterações de Horário de Trabalho'},
 saude:{pdf:'saude.pdf',file:'Formulário de Autodeclaração de Condição de Saúde do Colaborador'},
 conduta:{pdf:'conduta.pdf',original:'conduta.docx',file:'Código de Conduta'},
 experiencia:{pdf:'experiencia.pdf',original:'experiencia.docx',file:'Avaliação do Período de Experiência Modelo'},
 intervalo:{pdf:'intervalo.pdf',original:'intervalo.docx',file:'Acordo Individual de Redução do Intervalo Intrajornada'}};
const modelUrl=f=>new URL('modelos/'+f,document.baseURI).href;
const CLIP='M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7';

/* ---------- PDF rendering with the bundled pdf.js: works the same on desktop and phone ---------- */
let pdfjsP=null;
function pdfjs(){return pdfjsP=pdfjsP||new Promise((ok,fail)=>{if(window.pdfjsLib)return ok(window.pdfjsLib);const s=document.createElement('script');s.src=new URL('vendor/pdfjs/pdf.min.js',document.baseURI).href;s.onload=()=>{window.pdfjsLib.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.min.js',document.baseURI).href;ok(window.pdfjsLib)};s.onerror=()=>{pdfjsP=null;fail(Error('pdfjs'))};document.head.append(s)})}
/* Renders every page into box at the box width × zoom; returns controls to re-render and to go to a page. */
/* The host may send Content-Disposition with the stored file name, which overrides a.download; fetching the file keeps the document name. */
function namedLink(a,href,name){a.href=href;a.download=name;a.addEventListener('click',async e=>{e.preventDefault();try{const r=await fetch(href);if(!r.ok)throw 0;const u=URL.createObjectURL(await r.blob());const t=document.createElement('a');t.href=u;t.download=name;document.body.append(t);t.click();t.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}catch{location.href=href}})}
async function renderPdf(box,src){const lib=await pdfjs(),pdf=await lib.getDocument(src).promise,pages=[];for(let i=1;i<=pdf.numPages;i++){const c=el('canvas','docs-pdf-page');c.setAttribute('aria-label','Página '+i+' de '+pdf.numPages);box.append(c);pages.push(c)}
 /* A newer draw (zoom) or closing cancels the page being drawn; cancellations are expected, not errors. */
 let zoom=1,token=0,task=null;const draw=async()=>{const my=++token;task?.cancel();const width=Math.max(240,box.clientWidth-16);try{const list=[];for(let i=0;i<pages.length;i++){const page=await pdf.getPage(i+1);if(my!==token)return;const base=page.getViewport({scale:1}),scale=width/base.width*zoom;pages[i].style.width=Math.round(base.width*scale)+'px';pages[i].style.height=Math.round(base.height*scale)+'px';list.push([page,scale])}
  /* Every page has its final size before drawing, so page navigation never lands on a shifting layout. */
  for(let i=0;i<list.length;i++){if(my!==token)return;const [page,scale]=list[i],vp=page.getViewport({scale:scale*(window.devicePixelRatio||1)}),c=pages[i];c.width=vp.width;c.height=vp.height;task=page.render({canvasContext:c.getContext('2d'),viewport:vp});await task.promise;task=null}}catch(e){if(my===token&&e?.name!=='RenderingCancelledException')throw e}};
 /* Returns as soon as the file is open; pages keep drawing one by one (ready resolves when all are drawn). */
 return {pages:pdf.numPages,canvases:pages,ready:draw().catch(()=>{}),setZoom:z=>{zoom=z;return draw().catch(()=>{})},get zoom(){return zoom},destroy:()=>{token++;task?.cancel();pdf.destroy()}}}
function pdfDialog(heading,src,downloads){const d=dialog(heading,(f,form)=>{const bar=el('div','docs-pdf-bar'),pageInfo=el('span','docs-pdf-info','Carregando…'),zoomInfo=el('span','docs-pdf-info','100%'),box=el('div','docs-pdf-box');
  const prev=iconButton('Página anterior','M15 6l-6 6 6 6',()=>go(-1)),next=iconButton('Próxima página','M9 6l6 6-6 6',()=>go(1)),minus=iconButton('Diminuir zoom','M6 12h12',()=>zoomBy(-.25)),plus=iconButton('Ampliar',ICON.plus,()=>zoomBy(.25)),fit=button('Ajustar',()=>{if(ctl)ctl.setZoom(1).then(()=>zoomInfo.textContent='100%')},'btn secondary');
  bar.append(prev,pageInfo,next,minus,zoomInfo,plus,fit);const dl=el('div','docs-pdf-downloads');for(const [label,href,name] of downloads||[]){const a=el('a','btn secondary',label);namedLink(a,href,name);dl.append(a)}form.append(bar,box);if(dl.childElementCount)form.append(dl);
  let ctl=null;const current=()=>{if(!ctl)return 0;const top=box.scrollTop;let i=0;ctl.canvases.forEach((c,k)=>{if(c.offsetTop-box.offsetTop<=top+40)i=k});return i};
  const paint=()=>{if(ctl&&target==null)pageInfo.textContent='Página '+(current()+1)+' de '+ctl.pages};box.addEventListener('scroll',paint);
  /* Quick repeated clicks keep counting from the page being scrolled to, not from the position mid-animation. */
  let target=null,settle=0;function go(n){if(!ctl)return;const i=Math.min(ctl.pages-1,Math.max(0,(target??current())+n));target=i;pageInfo.textContent='Página '+(i+1)+' de '+ctl.pages;box.scrollTo({top:ctl.canvases[i].offsetTop-box.offsetTop,behavior:'smooth'});clearTimeout(settle);settle=setTimeout(()=>{target=null;paint()},700)}
  function zoomBy(dz){if(!ctl)return;const z=Math.min(3,Math.max(.5,ctl.zoom+dz));ctl.setZoom(z).then(()=>{zoomInfo.textContent=Math.round(z*100)+'%';paint()})}
  requestAnimationFrame(()=>renderPdf(box,src).then(c=>{ctl=c;d._pdf=c;paint()}).catch(()=>{pageInfo.textContent='Não foi possível abrir o PDF neste navegador.'}))},null,null,()=>{});
 d.classList.add('docs-pdf-dialog');d.addEventListener('close',()=>d._pdf?.destroy());return d}
function showModel(cat){const m=MODELS[cat.id];if(!m)return;const dls=[['Baixar Modelo (PDF)',modelUrl(m.pdf),m.file+'.pdf']];if(m.original)dls.push(['Baixar original (DOCX)',modelUrl(m.original),m.file+'.docx']);pdfDialog('Modelo — '+cat.name,modelUrl(m.pdf),dls)}

/* ---------- View ---------- */
const view=el('section','view');view.id='documents-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(DOC_ICON);const heading=el('div'),title=el('h2',null,'Documentações'),subtitle=el('p',null,PATH);heading.append(title,subtitle);head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
let back=()=>menuBack(2,'Lançamentos Colaboradores')();addShortcuts(view.id,()=>back());
const internalNote=el('div','form-note','Documentos assinados fisicamente e fotografados ou digitalizados pelo DP. Os anexos ficam somente neste navegador (IndexedDB): não vão para servidores nem para outros aparelhos e somem se os dados do navegador forem limpos. Um documento só fica Concluído depois de Marcar como Conferido.');body.append(internalNote);
const status=el('p','profiles-note');status.setAttribute('role','status');
const screen=el('div','uniforms-section docs-screen');body.append(status,screen);
const fileInput=el('input');fileInput.type='file';fileInput.accept=ACCEPT.join(',');fileInput.multiple=true;fileInput.hidden=true;
const cameraInput=el('input');cameraInput.type='file';cameraInput.accept='image/*';cameraInput.setAttribute('capture','environment');cameraInput.hidden=true;body.append(fileInput,cameraInput);
let currentCat=null,openPersonId=null,pendingAttach=null;
/* Same registry as Colaboradores Cadastrados: active collaborators, never a parallel list. */
const actives=()=>{P.load();return P.get().people.filter(p=>p.status==='ATIVO').sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))};
const overall=s=>s.complete?['Documentação completa','p-green']:['Pendente',s.review?'p-yellow':'p-red'];
const icon=st=>{const i=el('span','docs-icon is-'+st);i.innerHTML=svg(STATE[st].icon);i.setAttribute('aria-hidden','true');return i};
function catCounts(c){const s={done:0,review:0,pending:0,na:0};const list=actives();for(const p of list)s[catState(p.id,c)]++;s.total=list.length;return s}

/* Landing: the 11 documents (the same list the menu expands to). */
function renderIndex(){load();internalNote.hidden=false;currentCat=null;openPersonId=null;title.textContent='Documentações';subtitle.textContent=PATH;back=()=>menuBack(2,'Lançamentos Colaboradores')();screen.replaceChildren(el('h3','uniforms-heading','Documentos internos da empresa'));
 const list=el('div','docs-nav docs-index');CATS.forEach((cat,i)=>{const s=catCounts(cat.id),b=button('',()=>openCat(cat.id),'docs-nav-item');b.append(icon(s.total&&s.done+s.na===s.total?'done':s.review?'review':'pending'),el('span','docs-nav-index',String(i+1)),el('span','docs-nav-name',cat.name),el('small',null,s.done+' de '+(s.total-s.na)+' concluído(s)'+(s.review?' · '+s.review+' a conferir':'')+(s.na?' · '+s.na+' não aplicável':'')));list.append(b)});screen.append(list);const pr=personalRows(null),po=pr.filter(x=>!x.r.checkedAt).length,pl=el('div','docs-nav docs-index'),pb=button('',()=>openCat(PERSONAL),'docs-nav-item');pb.append(icon(!pr.length?'na':po?'review':'done'),el('span','docs-nav-index','•'),el('span','docs-nav-name',PERSONAL_NAME),el('small',null,pr.length?pr.length+' recebido(s) pelo Cadastro Completo'+(po?' · '+po+' a conferir':''):'Nenhum recebido pelo Cadastro Completo'));pl.append(pb);screen.append(el('h3','uniforms-heading',PERSONAL_NAME),pl);const rr=receiptRows(null),rl=el('div','docs-nav docs-index'),rb=button('',()=>openCat(RECEIPTS),'docs-nav-item');rb.append(icon(rr.length?'done':'na'),el('span','docs-nav-index','•'),el('span','docs-nav-name',RECEIPTS_NAME),el('small',null,rr.length?rr.length+' comprovante(s) de entrega, venda ou devolução':'Nenhum comprovante'));rl.append(rb);screen.append(el('h3','uniforms-heading','Gerados pela plataforma'),rl)}

/* Document screen: template header + every active collaborator with the status of this document. */
function openCat(id,personId){load();P.load();currentCat=id;openPersonId=personId||null;if(id===RECEIPTS){title.textContent=RECEIPTS_NAME;subtitle.textContent='Documentações / Gerados pela plataforma';back=()=>renderIndex();renderReceipts();return}if(id===PERSONAL){title.textContent=PERSONAL_NAME;subtitle.textContent='Documentações / Pessoais (Cadastro Completo)';back=()=>renderIndex();renderPersonal();view.querySelector('.content').scrollTo?.({top:0});return}const cat=catById(id),i=CATS.indexOf(cat);title.textContent=cat.name;subtitle.textContent='Documentações / '+(i+1)+' de 11';back=()=>renderIndex();rerender();view.querySelector('.content').scrollTo?.({top:0})}
function rerender(){if(!currentCat)return renderIndex();if(currentCat===PERSONAL)return renderPersonal();if(currentCat===RECEIPTS)return renderReceipts();internalNote.hidden=false;load();const cat=catById(currentCat);screen.replaceChildren();
 const tools=el('div','people-banner-tools');const sel=el('select');sel.setAttribute('aria-label','Trocar documento');CATS.forEach((c,i)=>sel.add(new Option((i+1)+'. '+c.name,c.id)));sel.value=cat.id;sel.addEventListener('change',()=>openCat(sel.value));const selLabel=el('label','docs-switch','Documento');selLabel.append(sel);
 tools.append(button('← Documentações',()=>renderIndex()));screen.append(tools,selLabel);
 const card=el('section','profiles-section docs-model');card.append(el('h3',null,cat.name));const m=MODELS[cat.id],mt=el('div','people-banner-tools');
 if(m){mt.append(button('Visualizar Modelo',()=>showModel(cat),'btn'));const a=el('a','btn secondary','Baixar Modelo');namedLink(a,modelUrl(m.pdf),m.file+'.pdf');mt.append(a);if(m.original){const o=el('a','btn secondary','Baixar original (DOCX)');namedLink(o,modelUrl(m.original),m.file+'.docx');mt.append(o)}card.append(mt)}
 else card.append(el('p','profiles-note',cat.id==='contrato'?'Modelo do contrato de trabalho ainda não disponibilizado.':'Modelo deste documento ainda não disponibilizado pela empresa: anexe o documento assinado.'));
 if(cat.note)card.append(el('p','profiles-note',cat.note));if(cat.sensitive)card.append(el('p','people-alert','Documento com dados de saúde: abra os anexos somente na área do DP. Esta versão não tem controle de acesso por perfil.'));screen.append(card);
 const list=actives(),s=catCounts(cat.id);screen.append(el('h3','uniforms-heading','Colaboradores'),el('p','profiles-note',list.length?s.done+' concluído(s) · '+s.review+' aguardando conferência · '+s.pending+' pendente(s)'+(s.na?' · '+s.na+' não aplicável':''):'Nenhum colaborador ativo. Colaboradores ativados em Colaboradores Cadastrados aparecem aqui automaticamente.'));
 if(list.length){const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table docs-table'),hr=el('tr');for(const h of ['Colaborador','Função','Status','Ações'])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
  for(const p of list){const st=catState(p.id,cat.id),k=catOf(p.id,cat.id),withFiles=k.records.filter(r=>r.files?.length),tr=el('tr');if(p.id===openPersonId)tr.classList.add('is-selected');
   const stc=el('td','docs-status-cell');stc.append(icon(st),el('span',null,STATE[st].label+(withFiles.length>1?' · '+withFiles.length+' registros':'')));
   const a=el('td','uniforms-row-actions'),free=k.na?null:(k.records.find(r=>!r.files?.length)||(k.records.length?null:{}));
   if(free){a.append(iconButton('Tirar foto do documento assinado de '+p.name,CAMERA,()=>startAttach(p,cat,free.id?free:null,'new',true),'is-accent'),iconButton('Anexar documento assinado de '+p.name,CLIP,()=>startAttach(p,cat,free.id?free:null,'new',false),'is-accent'))}
   const files=withFiles.flatMap(r=>r.files);if(files.length)a.append(iconButton('Visualizar documento de '+p.name,ICON.eye,()=>viewFiles(cat,files,cat.name+' — '+p.name)));
   const toCheck=k.records.find(r=>recordState(r)==='review');if(toCheck)a.append(iconButton('Conferir documento de '+p.name,ICON.ok,()=>checkDialog(p,cat,toCheck),'is-accent'));
   a.append(iconButton('Mais opções de '+p.name,ICON.edit,()=>{openPersonId=openPersonId===p.id?null:p.id;rerender();if(openPersonId)screen.querySelector('.docs-person-panel')?.scrollIntoView({block:'start',behavior:'smooth'})}));
   tr.append(el('td',null,p.name),el('td',null,p.jobName||'—'),stc,a);tb.append(tr)}
  table.append(th,tb);wrap.append(table);screen.append(wrap)}
 /* Full controls for one collaborator (replace, remove, not applicable, extra records, history). Inactive: read only. */
 const p=openPersonId&&P.byId(openPersonId);if(p){const box=el('div','docs-person-panel');const bar=el('div','people-banner-tools');bar.append(button('Fechar',()=>{openPersonId=null;rerender()}),button('Ver ficha do colaborador',()=>window.showCollaborators?.({personId:p.id})));
  const locked=p.status!=='ATIVO';box.append(bar);if(locked)box.append(el('p','people-alert','Colaborador '+(p.status==='INATIVO'?'inativo':'não ativo')+': documento preservado somente para consulta.'));box.append(detail(p,cat,locked));screen.append(box)}}

/* ---------- Menu: Documentações expands into the 11 documents ---------- */
document.addEventListener('click',e=>{const card=e.target.closest?.('#sector-content .section-card[data-target=documents]');if(!card||e.target.closest('.menu-item-move'))return;e.preventDefault();e.stopImmediatePropagation();
 const next=card.nextElementSibling;if(next?.classList.contains('docs-subcards')){next.remove();card.setAttribute('aria-expanded','false');return}
 const sub=el('div','docs-subcards');sub.setAttribute('role','group');sub.setAttribute('aria-label','Documentações');CATS.forEach((cat,i)=>{const b=button('',()=>showDocuments({cat:cat.id}),'docs-sub-card');b.dataset.doc=cat.id;b.append(el('span','docs-nav-index',String(i+1)),el('span','docs-sub-name',cat.name),el('span','card-arrow','›'));sub.append(b)});const pb=button('',()=>showDocuments({cat:PERSONAL}),'docs-sub-card');pb.dataset.doc=PERSONAL;pb.append(el('span','docs-nav-index','•'),el('span','docs-sub-name',PERSONAL_NAME),el('span','card-arrow','›'));sub.append(pb);const rb=button('',()=>showDocuments({cat:RECEIPTS}),'docs-sub-card');rb.dataset.doc=RECEIPTS;rb.append(el('span','docs-nav-index','•'),el('span','docs-sub-name',RECEIPTS_NAME),el('span','card-arrow','›'));sub.append(rb);
 card.after(sub);card.setAttribute('aria-expanded','true')},true);

function detail(p,cat,locked){const box=el('section','docs-detail profiles-section'),k=catOf(p.id,cat.id),st=catState(p.id,cat.id);
 const h=el('h3',null,p.name+' — '+cat.name);const pillEl=el('span','pill '+STATE[st].pill,STATE[st].label);if(st==='na')pillEl.classList.add('docs-pill-na');
 box.append(h,dl([['Colaborador',p.name],['CPF',p.cpf&&F?F.cpfMask(p.cpf):'Não informado'],['Função',p.jobName||'Não informada']]),pillEl);
 if(cat.note)box.append(el('p','profiles-note',cat.note));
 if(cat.sensitive)box.append(el('p','people-alert','Documento com dados de saúde. Abra somente na área do DP. Esta versão não tem controle de acesso por perfil: qualquer pessoa com acesso a este navegador e à plataforma consegue abri-lo.'));
 /* Não aplicável: a manual decision with a reason; the system never decides it. */
 if(k.na){box.append(el('p','profiles-note','Marcado como não aplicável em '+dateBR(k.na.at.slice(0,10))+(k.na.by?' por '+k.na.by:'')+'. Justificativa: '+k.na.reason));if(!locked)box.append(button('Desfazer Não aplicável',()=>confirmDialog('Desfazer Não aplicável?','A categoria volta a contar como aplicável para '+p.name+'.','Desfazer',()=>transact(d=>{ensure(d,p.id,cat.id).na=null;logDoc(d,p.id,cat.name+': Não aplicável desfeito.')})?null:'Não foi possível salvar neste navegador.',rerender)));return box}
 const records=k.records;
 if(!records.length)box.append(recordCard(p,cat,null,locked));else records.forEach(r=>box.append(recordCard(p,cat,r,locked)));
 const more=el('div','people-banner-tools');
 if(cat.multi&&!locked)more.append(button('Adicionar novo registro',()=>newRecord(p,cat),'btn'));
 if(!locked&&!records.some(r=>r.files?.length))more.append(button('Marcar como Não aplicável',()=>naDialog(p,cat)));
 if(more.childElementCount)box.append(more);
 const old=records.flatMap(r=>(r.versions||[]).map(v=>({r,v})));if(old.length){box.append(el('h4','people-subtitle','Histórico de anexos anteriores'));const list=el('div','occurrences-files');for(const {r,v} of old.sort((a,b)=>String(b.v.endedAt).localeCompare(String(a.v.endedAt)))){const row=el('div','occurrences-file docs-version'),info=el('div','occurrences-file-info');info.append(el('b',null,(r.label?r.label+' · ':'')+v.files.length+' arquivo(s)'),el('small',null,(v.reason==='removido'?'Removido':'Substituído')+' em '+dateBR(v.endedAt.slice(0,10))+(v.checkedAt?' · havia sido conferido em '+dateBR(v.checkedAt.slice(0,10)):' · não conferido')));const t=el('div','occurrences-file-tools');t.append(iconButton('Visualizar anexo anterior',ICON.eye,()=>viewFiles(cat,v.files,'Anexo anterior — '+cat.name)));row.append(icon('na'),info,t);list.append(row)}box.append(list)}
 return box}
const dl=rows=>{const d=el('dl','profiles-info');for(const [a,b] of rows)d.append(el('dt',null,a),el('dd',null,b||'—'));return d};

function recordCard(p,cat,r,locked){const st=r?recordState(r):'pending',card=el('div','docs-record');
 const head=el('div','docs-record-head');head.append(icon(st),el('b',null,r?.label||(cat.multi?'Registro':'Documento assinado')),el('span','pill '+STATE[st].pill,STATE[st].label));card.append(head);
 if(r?.generated)card.append(el('p','profiles-note docs-generated','Gerado pela plataforma em '+dateBR(r.generated.at.slice(0,10))+(r.generated.model?' (modelo '+r.generated.model+')':'')+'. Gerado não significa assinado: anexe o contrato assinado e confira.'),button('Ver dados da versão',()=>window.CicluzContracts?.showVersion(r.generated.versionId)));
 const files=r?.files||[];
 if(files.length){const list=el('div','occurrences-files');for(const f of files){const row=el('div','occurrences-file'),info=el('div','occurrences-file-info');const pv=el('div','occurrences-preview'),ic=el('span','occurrences-pdf');ic.innerHTML=svg(DOC_ICON);ic.append(el('b',null,f.type==='application/pdf'?'PDF':'IMG'));pv.append(ic);info.append(el('b',null,cat.sensitive?'Arquivo de saúde (conteúdo oculto na lista)':f.name),el('small',null,(f.type==='application/pdf'?'PDF':'Imagem')+' · '+sizeText(f.size)));row.append(pv,info);list.append(row)}card.append(list)}
 else card.append(el('p','profiles-note','Nenhum arquivo anexado. Tire uma foto ou selecione a imagem/PDF do documento assinado.'));
 card.append(dl([['Data do recebimento',r?.receivedAt?dateBR(r.receivedAt):'—'],['Data da conferência',r?.checkedAt?dateBR(r.checkedAt.slice(0,10))+(r.checkedBy?' · '+r.checkedBy:''):'Não conferido'],['Observações',r?.notes||'']]));
 const t=el('div','people-banner-tools docs-actions'),has=files.length>0;
 const add=(label,fn,enabled,cls)=>{const b=button(label,fn,cls||'btn secondary');if(!enabled||locked){b.disabled=true;b.title=locked?'Somente consulta':'Indisponível nesta situação'}t.append(b)};
 add('Tirar Foto',()=>startAttach(p,cat,r,'new',true),!has);add('Selecionar Arquivo',()=>startAttach(p,cat,r,'new',false),!has);
 const vb=button('Visualizar Documento',()=>viewFiles(cat,files,cat.name+' — '+p.name),'btn secondary');if(!has){vb.disabled=true;vb.title='Sem arquivo anexado'}t.append(vb);
 add('Marcar como Conferido',()=>checkDialog(p,cat,r),st==='review','btn');add('Substituir Documento',()=>startAttach(p,cat,r,'replace',false),has);add('Remover Anexo',()=>removeDialog(p,cat,r),has);add('Editar dados',()=>editDialog(p,cat,r),!!r);
 card.append(t);return card}

/* ---------- Ações ---------- */
function startAttach(p,cat,r,mode,camera){pendingAttach={personId:p.id,cat:cat.id,recordId:r?.id||null,mode};const input=camera?cameraInput:fileInput;input.value='';input.click()}
for(const input of [fileInput,cameraInput])input.addEventListener('change',async()=>{const files=[...input.files];input.value='';const ctx=pendingAttach;pendingAttach=null;if(!ctx||!files.length)return;status.textContent='Verificando arquivo(s)…';
 const problems=(await Promise.all(files.map(inspect))).filter(Boolean);if(problems.length){status.textContent='';dialog('Arquivo não aceito',(f,form)=>{form.append(el('p','uniforms-confirm-text','Nada foi anexado. '+problems.join('; ')+'.'))});return}status.textContent='';previewDialog(ctx,files)});
/* Preview before confirming; nothing is stored until Confirmar Anexo. */
function previewDialog(ctx,files){const p=P.byId(ctx.personId),cat=catById(ctx.cat),urls=files.map(f=>URL.createObjectURL(f));
 const d=dialog((ctx.mode==='replace'?'Substituir — ':'Conferir antes de anexar — ')+cat.name,(f,form)=>{form.append(el('p','profiles-note',p.name+' · '+files.length+' arquivo(s). Confira se é o documento certo; a conferência de assinatura e legibilidade é feita depois, em Marcar como Conferido.'));
  files.forEach((file,i)=>{const fig=el('figure','occurrences-viewer');if(file.type==='application/pdf'){const fr=el('iframe');fr.src=urls[i];fr.title=file.name;fig.append(fr)}else{const img=el('img');img.src=urls[i];img.alt='Pré-visualização de '+file.name;fig.append(img)}fig.append(el('figcaption',null,file.name+' · '+sizeText(file.size)));form.append(fig)});
  const rec=DB.field('Data do recebimento *');rec.set(today());form.append(rec.label);const notes=f('Observações',el('textarea'));notes.rows=2;notes.addEventListener('focusout',e=>e.stopPropagation());
  if(ctx.mode==='replace')form.append(el('p','people-alert','O arquivo atual vai para o histórico de anexos anteriores e a conferência anterior deixa de valer: o novo arquivo precisará ser conferido.'));return {rec,notes}},
  ({rec,notes})=>{const iso=rec.iso();if(!iso)return 'Informe a data do recebimento (DD/MM/AAAA).';if(iso>today())return 'A data do recebimento não pode ser futura.';saveAttach(ctx,files,iso,notes.value.trim());return null},ctx.mode==='replace'?'Confirmar Substituição':'Confirmar Anexo',()=>{});
 d.addEventListener('close',()=>urls.forEach(u=>URL.revokeObjectURL(u)))}
async function saveAttach(ctx,files,receivedAt,notes){status.textContent='Salvando anexo neste navegador…';const meta=files.map(f=>({id:newId(),name:f.name,type:f.type,size:f.size}));
 try{await putFiles(meta.map((m,i)=>({id:m.id,blob:files[i]})))}catch{status.textContent='Não foi possível guardar o arquivo neste navegador (IndexedDB indisponível ou sem espaço). Nada foi anexado.';return}
 const cat=catById(ctx.cat),now=new Date().toISOString();
 const ok=transact(d=>{const k=ensure(d,ctx.personId,ctx.cat);let r=ctx.recordId&&k.records.find(x=>x.id===ctx.recordId);if(!r){r={id:newId(),label:'',files:[],versions:[],createdAt:now};k.records.push(r)}
  if(r.files.length)r.versions.push({files:r.files,receivedAt:r.receivedAt,checkedAt:r.checkedAt,checkedBy:r.checkedBy,endedAt:now,reason:'substituído'});
  r.files=meta;r.receivedAt=receivedAt;r.checkedAt=null;r.checkedBy='';if(notes)r.notes=notes;k.na=null;logDoc(d,ctx.personId,cat.name+(r.label?' ('+r.label+')':'')+': '+(ctx.mode==='replace'?'documento substituído; aguardando nova conferência.':'documento anexado; aguardando conferência.'))});
 status.textContent=ok?(ctx.mode==='replace'?'Documento substituído: '+cat.name+' aguarda nova conferência.':'Documento anexado: '+cat.name+' aguarda conferência.'):'Não foi possível salvar neste navegador.';if(view.classList.contains('show'))rerender()}
function checkDialog(p,cat,r){dialog('Marcar como Conferido',(f,form)=>{form.append(el('p','uniforms-confirm-text','Confirme somente depois de abrir o arquivo de '+p.name+' e verificar se o documento "'+cat.name+(r.label?' — '+r.label:'')+'" está legível, completo e assinado.'));const l=el('label','profiles-choice'),c=el('input');c.type='checkbox';c.setAttribute('aria-label','Documento legível, completo e assinado');l.append(c,' Abri o arquivo e o documento está legível, completo e assinado.');form.append(l);return {c}},
 ({c})=>{if(!c.checked)return 'Marque a confirmação da conferência.';return transact(d=>{const x=ensure(d,p.id,cat.id).records.find(y=>y.id===r.id);x.checkedAt=new Date().toISOString();x.checkedBy=reviewer();logDoc(d,p.id,cat.name+(x.label?' ('+x.label+')':'')+': conferido pelo DP.')})?null:'Não foi possível salvar neste navegador.'},'Marcar como Conferido',()=>{status.textContent='Documento conferido: '+cat.name+'.';rerender()})}
function removeDialog(p,cat,r){confirmDialog('Remover anexo?','O arquivo de "'+cat.name+(r.label?' — '+r.label:'')+'" sai do documento atual e fica no histórico de anexos anteriores. A conferência deixa de valer e o documento volta a Pendente.','Remover Anexo',()=>transact(d=>{const x=ensure(d,p.id,cat.id).records.find(y=>y.id===r.id);x.versions.push({files:x.files,receivedAt:x.receivedAt,checkedAt:x.checkedAt,checkedBy:x.checkedBy,endedAt:new Date().toISOString(),reason:'removido'});x.files=[];x.receivedAt=null;x.checkedAt=null;x.checkedBy='';logDoc(d,p.id,cat.name+(x.label?' ('+x.label+')':'')+': anexo removido; documento pendente.')})?null:'Não foi possível salvar neste navegador.',()=>{status.textContent='Anexo removido: '+cat.name+' voltou a Pendente.';rerender()})}
function editDialog(p,cat,r){dialog('Editar dados — '+cat.name,(f,form)=>{let label=null;if(cat.multi){label=f('Descrição do registro *',el('input'));label.maxLength=80;label.value=r.label||''}const rec=DB.field('Data do recebimento');rec.set(r.receivedAt||'');form.append(rec.label);const notes=f('Observações',el('textarea'));notes.rows=3;notes.value=r.notes||'';notes.addEventListener('focusout',e=>e.stopPropagation());return {label,rec,notes}},
 ({label,rec,notes})=>{if(label&&!label.value.trim())return 'Informe a descrição do registro.';if(rec.node.value&&!rec.iso())return 'Data do recebimento inválida (DD/MM/AAAA).';if(rec.iso()&&rec.iso()>today())return 'A data do recebimento não pode ser futura.';if(r.files?.length&&!rec.iso())return 'Documento anexado precisa da data do recebimento.';
  return transact(d=>{const x=ensure(d,p.id,cat.id).records.find(y=>y.id===r.id);if(label)x.label=label.value.trim();x.receivedAt=rec.iso()||null;x.notes=notes.value.trim();logDoc(d,p.id,cat.name+': dados do registro atualizados.')})?null:'Não foi possível salvar neste navegador.'},'Salvar',rerender)}
function newRecord(p,cat){dialog(cat.multi,(f,form)=>{form.append(el('p','profiles-note','O novo registro fica nesta mesma categoria; os anteriores são preservados. A categoria continua contando uma única vez no total de 11.'));const label=f('Descrição do registro *',el('input'));label.maxLength=80;label.placeholder=cat.id==='experiencia'?'Ex.: Avaliação de 30 dias':cat.id==='horario'?'Ex.: Alteração para o turno da tarde':'Ex.: Entrega de novembro';return {label}},
 ({label})=>{if(!label.value.trim())return 'Informe a descrição do registro.';return transact(d=>{const k=ensure(d,p.id,cat.id);k.records.push({id:newId(),label:label.value.trim(),files:[],versions:[],createdAt:new Date().toISOString()});k.na=null;logDoc(d,p.id,cat.name+': novo registro "'+label.value.trim()+'" criado.')})?null:'Não foi possível salvar neste navegador.'},'Adicionar registro',()=>{status.textContent='Novo registro criado em '+cat.name+'. Anexe o documento assinado.';rerender()})}
function naDialog(p,cat){dialog('Marcar como Não aplicável',(f,form)=>{form.append(el('p','uniforms-confirm-text','"'+cat.name+'" deixará de contar como pendente para '+p.name+'. Esta é uma decisão do DP: o sistema não avalia se o documento é obrigatório.'));const reason=f('Justificativa *',el('textarea'));reason.rows=3;reason.addEventListener('focusout',e=>e.stopPropagation());return {reason}},
 ({reason})=>{const v=reason.value.trim();if(v.length<5)return 'Informe a justificativa (mínimo de 5 caracteres).';return transact(d=>{ensure(d,p.id,cat.id).na={reason:v,at:new Date().toISOString(),by:reviewer()};logDoc(d,p.id,cat.name+': marcado como não aplicável. Justificativa: '+v)})?null:'Não foi possível salvar neste navegador.'},'Confirmar Não aplicável',()=>{status.textContent=cat.name+' marcado como não aplicável.';rerender()})}
/* Viewer: every page of every file, read from IndexedDB; the health form asks for confirmation first. */
function viewFiles(cat,files,heading){if(!files?.length)return;const open=async()=>{const urls=[];let missing=0;const items=[];for(const f of files){let blob=null;try{blob=await getFile(f.id)}catch{}if(!blob){missing++;continue}const u=URL.createObjectURL(blob);urls.push(u);items.push({f,u})}
  const pdfs=[];const d=dialog(heading,(fl,form)=>{if(missing)form.append(el('p','people-alert',missing+' arquivo(s) não estão mais neste navegador (dados do navegador limpos ou outro aparelho).'));for(const {f,u} of items){const fig=el('figure','occurrences-viewer docs-viewer');if(f.type==='application/pdf'){const box=el('div','docs-pdf-box docs-pdf-inline');fig.append(box);requestAnimationFrame(()=>renderPdf(box,u).then(c=>pdfs.push(c)).catch(()=>box.replaceChildren(el('p','profiles-error','Não foi possível abrir este PDF.'))))}else{const img=el('img');img.src=u;img.alt=f.name;fig.append(img)}fig.append(el('figcaption',null,(cat.sensitive?'Arquivo de saúde':f.name)+' · '+sizeText(f.size)));form.append(fig)}},null,null,()=>{});d.classList.add('docs-pdf-dialog');d.addEventListener('close',()=>{pdfs.forEach(c=>c.destroy());urls.forEach(u=>URL.revokeObjectURL(u))})};
 if(cat.sensitive)confirmDialog('Abrir documento de saúde?','Este arquivo contém informações de saúde do colaborador. Abra somente na área do DP e longe de outras pessoas. A plataforma não restringe o acesso por perfil nesta versão.','Abrir documento',()=>{setTimeout(open,0);return null},()=>{});else open()}

/* ---------- Documentos pessoais e cadastrais (Cadastro Completo) ----------
   Files the person attaches in the Cadastro Completo, kept apart from the 11 internal documents.
   Same storage as the rest of Documentações: the file in IndexedDB, the record in data.people[id].personal
   (a list that older saved data simply does not have). Attaching again keeps the earlier record as replaced. */
const PERSONAL='pessoais',PERSONAL_NAME='Documentos pessoais e cadastrais';
const PSTATE={received:{label:'Recebido · a conferir',pill:'p-yellow'},checked:{label:'Conferido',pill:'p-green'}};
const personalOf=id=>(docsOf(id).personal||[]).filter(x=>!x.replacedAt);
const personalSensitive=t=>/\bASO\b/i.test(t);
const sameSlot=(r,m)=>r.docType===m.docType&&r.owner===m.owner&&(r.dependent??null)===(m.dependent??null);
async function attachPersonal(personId,meta,file){load();if(!P.byId(personId))return 'Candidato não encontrado neste navegador.';const bad=await inspect(file);if(bad)return bad;
 const fid=newId();try{await putFiles([{id:fid,blob:file}])}catch{return 'Não foi possível guardar o arquivo neste navegador.'}
 const at=new Date().toISOString();load();
 const ok=transact(d=>{const x=d.people[personId]=d.people[personId]||blank();const list=x.personal=x.personal||[];for(const r of list)if(!r.replacedAt&&sameSlot(r,meta))r.replacedAt=at;
  list.push({id:newId(),docType:meta.docType,owner:meta.owner,dependent:meta.dependent??null,dependentName:meta.dependentName||'',origin:'Cadastro Completo',at,file:{id:fid,name:file.name,type:file.type,size:file.size},checkedAt:null,checkedBy:''});
  logDoc(d,personId,'Cadastro Completo: '+meta.docType+(meta.owner==='dependente'?' do dependente'+(meta.dependentName?' '+meta.dependentName:''):'')+' anexado.')});
 return ok?null:'Não foi possível salvar o registro neste navegador.'}
function checkPersonal(personId,rid){load();return transact(d=>{const r=(d.people[personId]?.personal||[]).find(x=>x.id===rid);if(!r)throw Error('missing');r.checkedAt=new Date().toISOString();r.checkedBy=reviewer();logDoc(d,personId,'Documento pessoal conferido: '+r.docType+'.')})}
const ownerText=r=>r.owner==='dependente'?'Dependente'+(r.dependentName?': '+r.dependentName:' '+((r.dependent??0)+1)):'Colaborador';
const pstate=r=>r.checkedAt?'checked':'received';
function personalTable(rows,withPerson,after){const wrap=el('div','uniforms-table-wrap');if(!rows.length){wrap.append(el('p','profiles-note','Nenhum documento pessoal recebido pelo Cadastro Completo.'));return wrap}
 const table=el('table','uniforms-table docs-personal-table'),hr=el('tr');for(const h of [...(withPerson?['Colaborador']:[]),'Documento','Titular','Origem','Data','Status',''])hr.append(el('th',h==='Origem'?'docs-col-origin':null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const {p,r} of rows){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions'),s=PSTATE[pstate(r)];st.append(el('span','pill '+s.pill,s.label));
  a.append(iconButton('Visualizar '+r.docType+' de '+p.name,ICON.eye,()=>viewFiles({sensitive:personalSensitive(r.docType)},[r.file],r.docType+' — '+p.name)));
  if(!r.checkedAt)a.append(iconButton('Marcar como conferido: '+r.docType+' de '+p.name,ICON.ok,()=>confirmDialog('Marcar como conferido?','Confirma que o arquivo "'+r.docType+'" de '+p.name+' foi conferido? Conferir o documento pessoal não marca nenhum termo como assinado.','Marcar como conferido',()=>checkPersonal(p.id,r.id)?null:'Não foi possível salvar neste navegador.',after),'is-accent'));
  tr.append(...(withPerson?[el('td',null,p.name)]:[]),el('td',null,r.docType),el('td',null,ownerText(r)),el('td','docs-col-origin',r.origin),el('td',null,dateBR(r.at.slice(0,10))),st,a);tb.append(tr)}
 table.append(th,tb);wrap.append(table);return wrap}
function personalRows(personId){P.load();return P.get().people.filter(p=>!personId||p.id===personId).flatMap(p=>personalOf(p.id).map(r=>({p,r}))).sort((a,b)=>a.p.name.localeCompare(b.p.name,'pt-BR')||b.r.at.localeCompare(a.r.at))}
function renderPersonal(){load();internalNote.hidden=true;screen.replaceChildren();const all=personalRows(null),people=[...new Map(all.map(x=>[x.p.id,x.p])).values()];
 screen.append(el('div','form-note','Arquivos enviados pelo próprio colaborador no Cadastro Completo (inclusive dos dependentes). Ficam separados dos 11 documentos internos da empresa e não contam como termo assinado. Ficam guardados somente neste navegador: limpar os dados do navegador ou trocar de aparelho apaga os arquivos.'));
 const sel=el('select');sel.setAttribute('aria-label','Filtrar colaborador');sel.add(new Option('Todos os colaboradores',''));for(const p of people)sel.add(new Option(p.name+(p.status==='CANDIDATO'?' (candidato)':''),p.id));sel.value=people.some(p=>p.id===openPersonId)?openPersonId:'';
 sel.addEventListener('change',()=>{openPersonId=sel.value||null;renderPersonal()});const l=el('label','docs-switch','Colaborador');l.append(sel);
 const rows=all.filter(x=>!openPersonId||x.p.id===openPersonId),open=rows.filter(x=>!x.r.checkedAt).length;
 screen.append(l,el('p','profiles-note',rows.length?rows.length+' documento(s) · '+open+' a conferir.':'Nenhum documento pessoal recebido.'),personalTable(rows,true,renderPersonal))}

/* Cadastro Completo: the camera buttons attach the file to the candidate the form was opened for. */
const cc=document.getElementById('cadastro-completo');let ccPerson=null;
const ccNote=cc?.querySelector('.form-note:not(.people-complete-banner)'),ccNoteText=ccNote?.textContent||'';
function scanMeta(blk){const t=(blk.querySelector('strong')?.textContent||'').replace(/^[^\p{L}\p{N}]+/u,'').replace(/\s*—\s*documento solicitado$/i,'').replace(/\s*\*$/,'').trim();const dep=blk.closest('.dep-card');
 if(!dep)return {docType:t,owner:'colaborador',dependent:null};const i=[...cc.querySelectorAll('.dep-card')].indexOf(dep);const nm=[...dep.querySelectorAll('input')].find(x=>/^\s*nome/i.test(x.closest('label')?.textContent||''))?.value||'';return {docType:t,owner:'dependente',dependent:i,dependentName:nm.trim()}}
function paintScan(){if(!cc)return;load();if(ccNote)ccNote.textContent=ccPerson?'Os dados preenchidos e os documentos anexados ficam salvos somente neste navegador e aparecem em Documentações → '+PERSONAL_NAME+'.':ccNoteText;
 cc.querySelectorAll('.doc-capture').forEach(blk=>{const meta=scanMeta(blk);
  if(!ccPerson){CicluzDocCapture.estado(blk,{texto:'Disponível ao abrir pelo link do candidato',ativo:false});return}
  const cur=personalOf(ccPerson).find(r=>sameSlot(r,meta));CicluzDocCapture.estado(blk,{texto:cur?'Anexado em '+dateBR(cur.at.slice(0,10))+' · '+cur.file.name:'Nenhum arquivo anexado',ativo:true})})}
if(cc){document.addEventListener('cicluz-complete-bound',e=>{ccPerson=e.detail?.id||null;paintScan()});
 cc.addEventListener('click',e=>{if(e.target.closest('#add-dependent'))setTimeout(paintScan,0)});
 cc.addEventListener('doc-capture',async e=>{if(!ccPerson)return;const {file,block}=e.detail,meta=scanMeta(block),pid=ccPerson;CicluzDocCapture.estado(block,{texto:'Guardando…',ativo:false});const err=await attachPersonal(pid,meta,file);paintScan();if(err)CicluzDocCapture.estado(block,{texto:err})})}

/* ---------- Comprovantes de uniformes ----------
   Read straight from the uniform movements (CicluzUniformStore) by collaborator id: no copy is kept here. */
const RECEIPTS='comprovantes',RECEIPTS_NAME='Comprovantes de uniformes';
const MOVE_STATUS={ATIVO:['Registrado','p-green'],CORRIGIDO:['Corrigido','p-yellow'],CANCELADO:['Cancelado','p-red']};
function receiptRows(personId){const R=window.CicluzUniformReceipt,ST=window.CicluzUniformStore;if(!R||!ST)return [];try{ST.load()}catch{return []}P.load();
 return ST.get().movements.filter(m=>R.types.has(m.type)&&(!personId||m.collaboratorId===personId)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt))).map(m=>({m,p:P.byId(m.collaboratorId)}))}
function receiptTable(rows,withPerson){const wrap=el('div','uniforms-table-wrap');if(!rows.length){wrap.append(el('p','profiles-note','Nenhum comprovante de uniforme.'));return wrap}const name=window.CicluzUniformUI?.uniformName||(x=>x);
 const table=el('table','uniforms-table docs-receipt-table'),hr=el('tr');for(const h of [...(withPerson?['Colaborador']:[]),'Data','Movimentação','Peças','Status',''])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const {m,p} of rows){const tr=el('tr'),st=el('td'),[t,c]=MOVE_STATUS[m.status]||[m.status,''],a=el('td','uniforms-row-actions');if(m.status==='CANCELADO')tr.classList.add('is-cancelled');st.append(el('span','pill '+c,t));
  a.append(iconButton('Ver comprovante de '+(p?.name||m.collaboratorName)+' em '+dateBR(m.date),ICON.eye,()=>window.CicluzUniformReceipt.open(m.id)));
  tr.append(...(withPerson?[el('td',null,p?.name||m.collaboratorName)]:[]),el('td',null,dateBR(m.date)),el('td',null,({ENTREGUE:'Entrega',VENDIDO:'Venda',DEVOLVIDO:'Devolução'})[m.type]||m.type),el('td',null,m.items.map(i=>name(i.uniformId)+' ×'+i.quantity).join(', ')),st,a);tb.append(tr)}
 table.append(th,tb);wrap.append(table);return wrap}
function renderReceipts(){load();internalNote.hidden=true;screen.replaceChildren();const all=receiptRows(null),people=[...new Map(all.map(x=>[x.m.collaboratorId,x.p?.name||x.m.collaboratorName])).entries()];
 screen.append(el('div','form-note','Comprovantes gerados a partir dos lançamentos de DES - Uniformes Entrega/Recebimento (entregas, vendas e devoluções). São demonstrativos: para valer como recibo, imprima e colha a assinatura.'));
 const sel=el('select');sel.setAttribute('aria-label','Filtrar colaborador');sel.add(new Option('Todos os colaboradores',''));for(const [id,n] of people)sel.add(new Option(n,id));sel.value=people.some(([id])=>id===openPersonId)?openPersonId:'';sel.addEventListener('change',()=>{openPersonId=sel.value||null;renderReceipts()});
 const l=el('label','docs-switch','Colaborador');l.append(sel);const rows=all.filter(x=>!openPersonId||x.m.collaboratorId===openPersonId);screen.append(l,el('p','profiles-note',rows.length+' comprovante(s).'),receiptTable(rows,true))}

/* ---------- Ficha do colaborador (Colaboradores Cadastrados) ---------- */
function section(p){load();const s=summary(p.id),[t,c]=overall(s),sec=el('section','profiles-section docs-file-section');sec.append(el('h3',null,'Documentações'));
 const top=el('div','people-file-top');top.append(el('span','pill '+c,t),el('span','profiles-note',s.done+' concluída(s) · '+s.open+' pendente(s)'+(s.review?' ('+s.review+' a conferir)':'')+' · '+s.na+' não aplicável(is) · 11 categorias'));sec.append(top);
 const wrap=el('div','uniforms-table-wrap'),table=el('table','uniforms-table'),hr=el('tr');for(const h of ['Documento','Status','Recebimento',''])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const cat of CATS){const st=catState(p.id,cat.id),k=catOf(p.id,cat.id),withFiles=k.records.filter(r=>r.files?.length),last=withFiles.map(r=>r.receivedAt).filter(Boolean).sort().pop();const tr=el('tr'),stc=el('td');stc.append(el('span','pill '+STATE[st].pill,STATE[st].label+(withFiles.length>1?' · '+withFiles.length+' registros':'')));
  const a=el('td','uniforms-row-actions');const files=withFiles.flatMap(r=>r.files);if(files.length)a.append(iconButton('Visualizar arquivos de '+cat.name,ICON.eye,()=>viewFiles(cat,files,cat.name+' — '+p.name)));a.append(iconButton('Abrir em Documentações: '+cat.name,DOC_ICON,()=>showDocuments({cat:cat.id,personId:p.id})));
  const name=el('td');name.append(icon(st),' ',cat.name);tr.append(name,stc,el('td',null,last?dateBR(last):'—'),a);tb.append(tr)}
 table.append(th,tb);wrap.append(table);sec.append(wrap);const pbox=el('div','docs-file-personal');const paint=()=>{load();pbox.replaceChildren(el('h4',null,PERSONAL_NAME+' (Cadastro Completo)'),personalTable(personalRows(p.id),false,paint))};paint();sec.append(pbox);const rbox=el('div','docs-file-receipts');rbox.append(el('h4',null,RECEIPTS_NAME),receiptTable(receiptRows(p.id),false));sec.append(rbox);return sec}

function showDocuments(opts={}){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;const t=document.getElementById('title');if(t)t.textContent='Documentações';status.textContent='';
 if(opts.cat)openCat(opts.cat,opts.personId);else renderIndex();normalizeHeaderActions(view)}
window.showDocuments=showDocuments;
/* Pastas Documentos: the collaborators' folders open these same records (no second copy). */
document.addEventListener('click',e=>{const c=e.target.closest?.('#sector-content .section-card[data-target=vz-doc-des-documentos-colaboradores],#sector-content .section-card[data-target=vz-doc-des-contratos-colaboradores]');if(!c||e.target.closest('.menu-item-move'))return;e.preventDefault();e.stopImmediatePropagation();showDocuments({cat:c.dataset.target.endsWith('contratos-colaboradores')?'contrato':PERSONAL})},true);
window.CicluzDocuments={CATS,MODELS,
 linkGenerated:(personId,g)=>{load();let rid=null;const ok=transact(d=>{const k=ensure(d,personId,'contrato');rid=newId();k.records.push({id:rid,label:g.label,files:[],versions:[],generated:{versionId:g.versionId,at:g.at,model:g.model||''},createdAt:new Date().toISOString()});logDoc(d,personId,'Contrato de Trabalho: '+g.label+' gerado; aguardando assinatura.')});return ok?rid:null},
 recordById:(personId,rid)=>{load();const r=catOf(personId,'contrato').records.find(x=>x.id===rid);return r?{...r,state:recordState(r)}:null},files:{inspect,put:(id,blob)=>putFiles([{id,blob}]),get:getFile,view:(heading,file,sensitive)=>viewFiles({sensitive:!!sensitive},[file],heading)},personal:id=>{load();return personalOf(id)},summary:id=>{load();return summary(id)},catState:(id,c)=>{load();return catState(id,c)},catLabel:(id,c)=>{load();return STATE[catState(id,c)].label},section,show:showDocuments};
})();
