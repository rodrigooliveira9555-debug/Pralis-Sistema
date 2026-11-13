/* Documentações — assinatura física (preparar → visualizar → imprimir → coletar assinatura → anexar → conferir → concluir), preparação da
   assinatura eletrônica (integração futura) e a tela de recebimento de documentos (entrega física, WhatsApp, e-mail ou outro meio).
   Tudo se apoia nos registros de Documentações já existentes (mesmo registro, mesmo histórico): nada é duplicado. Imprimir não assina; anexar
   não confere; não há link, assinatura ou envio fictício. Arquivos ficam no IndexedDB, nunca no localStorage. */
(()=>{
'use strict';
const D=window.CicluzDocuments,P=window.CicluzPeople,U=window.CicluzUniformUI,G=window.CicluzGP,DB=window.CicluzDateBR;if(!D||!P||!U||!G||!DB)return;
const {el,button,dateBR,today,fold}=U;
const SIGN_MODES=['Física','Eletrônica — integração futura'];
const MODALITIES=['Assinatura eletrônica simples','Assinatura eletrônica avançada','Assinatura eletrônica qualificada'];
const ESIGN_STATUS={prepared:'Preparada — aguardando integração com o serviço de assinatura',external:'Assinada em serviço externo — aguardando conferência'};

/* ---------- Extensão do cartão de cada documento ---------- */
D.registerExtension((card,p,cat,r,locked,H)=>{
 const mode=r.signMode||SIGN_MODES[0],eletr=mode!==SIGN_MODES[0],es=r.esign||null,m=H.MODELS[cat.id];
 const done=H.recordState(r)==='done',has=!!r.files?.length;
 const steps=[['Preparar',true],['Visualizar',!!r.viewedAt||!m],[eletr?'Assinar (serviço externo)':'Imprimir',eletr?!!es?.signedAt:!!r.printedAt]].concat(eletr?[]:[['Coletar assinatura',!!r.signedCollectedAt]]).concat([['Anexar',has],['Conferir',!!r.checkedAt],['Concluir',done]]);
 const cur=steps.findIndex(s=>!s[1]),box=el('section','docs-sign');box.append(el('h4','people-subtitle','Assinatura e andamento'));
 try{box.append(window.CicluzStepper.create({layout:'timeline',label:'Andamento do documento',steps:steps.map(([label,ok],i)=>({label,state:ok?'done':i===cur?'pending':'blocked',status:ok?'Feito':i===cur?'Próxima etapa':'Aguardando',text:''})),current:cur<0?steps.length-1:cur}).el)}catch{}
 const sel=el('select');for(const s of SIGN_MODES)sel.add(new Option(s,s));sel.value=mode;sel.setAttribute('aria-label','Forma de assinatura');sel.disabled=locked;
 const lab=el('label','docs-sign-mode','Forma de assinatura');lab.append(sel);box.append(lab);
 const upd=(fn,text)=>{const ok=H.transact(d=>{const k=H.ensure(d,p.id,cat.id),x=k.records.find(y=>y.id===r.id);fn(x);H.logDoc(d,p.id,cat.name+(x.label?' ('+x.label+')':'')+': '+text)});if(ok)H.rerender();return ok};
 sel.onchange=()=>upd(x=>{x.signMode=sel.value},'forma de assinatura definida: '+sel.value+'.');
 const tools=el('div','people-banner-tools docs-actions');const add=(label,fn,cls='btn secondary',enabled=true)=>{const b=button(label,fn,cls);if(locked||!enabled){b.disabled=true;if(locked)b.title='Somente consulta'}tools.append(b)};
 if(!eletr){
  add('Visualizar modelo',()=>{window.open(H.modelUrl(m.pdf),'_blank','noopener');upd(x=>{x.viewedAt=new Date().toISOString()},'modelo visualizado.')},'btn secondary',!!m);
  add('Imprimir',()=>{window.open(H.modelUrl(m.pdf),'_blank','noopener')},'btn secondary',!!m);
  add(r.printedAt?'Impressão registrada em '+dateBR(r.printedAt.slice(0,10)):'Registrar impressão',()=>upd(x=>{x.printedAt=new Date().toISOString();x.printedBy=G.userName()},'impressão registrada (não significa assinado).'),'btn secondary',!r.printedAt);
  add(r.signedCollectedAt?'Assinatura coletada em '+dateBR(r.signedCollectedAt):'Registrar assinatura coletada',()=>G.modal('Assinatura coletada — '+p.name,(f,form)=>{const dt=DB.field('Data em que a assinatura foi coletada *');dt.set(today());form.append(dt.label);form.append(el('p','profiles-note','Isso só registra que a via foi assinada. O documento só conta como concluído depois de anexar o arquivo e conferir.'));return {dt}},c=>{const iso=c.dt.iso();if(!iso)return 'Informe a data (DD/MM/AAAA).';if(iso>today())return 'A data não pode ser futura.';return upd(x=>{x.signedCollectedAt=iso},'assinatura coletada em '+dateBR(iso)+'; falta anexar e conferir.')?null:'Não foi possível salvar neste navegador.'},'Registrar'),'btn secondary',!r.signedCollectedAt);
  if(!m)box.append(el('p','profiles-note','Não há modelo da empresa para este documento: imprima o documento recebido pela empresa e registre as etapas.'));
 }else{
  box.append(el('p','profiles-note','Assinatura eletrônica — integração futura. Nenhum serviço está ligado e nenhum link é gerado: aqui se prepara a solicitação e se registra à mão o documento assinado por um serviço externo.'));
  add(es?'Atualizar solicitação preparada':'Preparar solicitação',()=>G.modal('Preparar assinatura eletrônica — '+p.name,(field,f)=>{
    const sg=field('Signatário *',el('input'));sg.maxLength=100;sg.value=es?.signer||p.name||'';const ct=field('Contato do signatário (e-mail ou celular) *',el('input'));ct.maxLength=100;ct.dataset.textoLivre='1';ct.value=es?.contact||(P.byId(p.id)?.email||P.byId(p.id)?.whatsapp||'');
    const md=field('Modalidade de assinatura *',el('select'));for(const x of MODALITIES)md.add(new Option(x,x));md.value=es?.modality||MODALITIES[0];f.append(el('p','profiles-note','Documento: '+cat.name+(r.label?' — '+r.label:'')+' · Colaborador: '+p.name+'.'));return {sg,ct,md}},
   c=>{if(!c.sg.value.trim()||!c.ct.value.trim())return 'Informe o signatário e o e-mail ou telefone.';return upd(x=>{x.esign={...(x.esign||{}),signer:c.sg.value.trim(),contact:c.ct.value.trim(),modality:c.md.value,status:x.esign?.signedAt?x.esign.status:'prepared',preparedAt:new Date().toISOString(),preparedBy:G.userName()}},'solicitação de assinatura eletrônica preparada ('+c.md.value+'); integração futura.')?null:'Não foi possível salvar neste navegador.'},'Salvar solicitação'),'btn secondary');
  add('Registrar assinatura feita em serviço externo',()=>G.modal('Registrar assinatura externa — '+p.name,(field,f)=>{
    f.append(el('p','profiles-note','Use só quando o documento foi realmente assinado em um serviço externo. Sem o arquivo final e o identificador, nada é registrado como assinado.'));
    const idn=field('Identificador externo *',el('input'));idn.maxLength=120;idn.dataset.textoLivre='1';idn.value=es?.externalId||'';const dt=DB.field('Data da assinatura *');dt.set(es?.signedAt||today());f.append(dt.label);
    const ff=G.fileField('Arquivo final assinado *');f.append(ff.label);const ev=G.fileField('Evidências (relatório/certificado, opcional)');f.append(ev.label);const ob=field('Observações das evidências',el('textarea'));ob.rows=2;ob.value=es?.evidenceNote||'';return {idn,dt,ff,ev,ob}},
   async c=>{const iso=c.dt.iso(),file=c.ff.input.files?.[0],evf=c.ev.input.files?.[0],errs=[];if(!c.idn.value.trim())errs.push('Informe o identificador externo.');if(!iso)errs.push('Informe a data da assinatura.');else if(iso>today())errs.push('A data da assinatura não pode ser futura.');if(!file)errs.push('Anexe o arquivo final assinado.');if(errs.length)return errs.join(' ');
    const a=await G.storeFile(file);if(a.error)return a.error;let e2=null;if(evf){const b=await G.storeFile(evf);if(b.error)return b.error;e2=b.meta}
    return upd(x=>{const now=new Date().toISOString();if(x.files?.length)(x.versions=x.versions||[]).push({files:x.files,receivedAt:x.receivedAt,checkedAt:x.checkedAt,checkedBy:x.checkedBy,endedAt:now,reason:'substituído'});x.files=[a.meta];x.receivedAt=today();x.checkedAt=null;x.checkedBy='';x.origin='Assinatura eletrônica (serviço externo)';x.esign={...(x.esign||{}),externalId:c.idn.value.trim(),signedAt:iso,finalFile:a.meta,evidence:e2||x.esign?.evidence||null,evidenceNote:c.ob.value.trim(),status:'external',registeredAt:now,registeredBy:G.userName()}},'assinatura eletrônica registrada manualmente (identificador '+c.idn.value.trim()+'); aguardando conferência.')?null:'Não foi possível salvar neste navegador.'},'Registrar assinatura'),'btn secondary');
  const rows=[['Documento',cat.name+(r.label?' — '+r.label:'')],['Colaborador',p.name],['Signatário',es?.signer],['E-mail ou telefone',es?.contact],['Modalidade',es?.modality],['Situação',es?ESIGN_STATUS[es.status]||'':'Não preparada'],['Identificador externo',es?.externalId],['Data da assinatura',es?.signedAt?dateBR(es.signedAt):''],['Arquivo final',es?.finalFile?.name],['Evidências',es?.evidence?es.evidence.name+(es.evidenceNote?' · '+es.evidenceNote:''):es?.evidenceNote||'']];
  const dl=el('dl','profiles-info');for(const [k,v] of rows)dl.append(el('dt',null,k),el('dd',null,v||'—'));box.append(dl);
 }
 box.append(tools);card.append(box)});

/* ---------- Tela: Receber Documentos ---------- */
const ACCENT='#7c3aed',TITLE='DES - Receber Documentos',GROUP='Lançamentos Colaboradores';
const view=el('section','view');view.id='doc-receive-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Registro manual de documentos recebidos por entrega física, WhatsApp, e-mail ou outro meio. O arquivo vai para o mesmo registro de Documentações do colaborador. Não há recebimento automático: o DP anexa e confere.'));
const lbl=(n,node,cls)=>{const l=el('label',cls,n);node.setAttribute('aria-label',n.replace(/\s*\*$/,''));l.append(node);return l};
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const who=el('select'),doc=el('select'),origin=el('select'),when=DB.field('Data do recebimento *'),notes=el('input'),chk=el('input'),ff=G.fileField('Arquivo recebido *'),err=el('p','uniforms-wide profiles-error'),st=el('p','uniforms-wide profiles-note');
who.add(new Option('Selecione o colaborador',''));for(const o of D.ORIGINS)origin.add(new Option(o,o));notes.maxLength=200;chk.type='checkbox';err.setAttribute('role','alert');st.setAttribute('role','status');
const cl=el('label','uniforms-wide jornada-check');cl.append(chk,el('span',null,'Já conferi o documento: está legível, completo e assinado. (Sem marcar, ele fica aguardando conferência.)'));
const sv=el('button','btn','Registrar recebimento');sv.type='submit';const act=el('div','uniforms-wide actions');act.append(sv);
form.append(el('h3','uniforms-wide uniforms-heading','Novo recebimento'),lbl('Colaborador *',who,'uniforms-wide'),lbl('Documento pendente *',doc,'uniforms-wide'),lbl('Origem do recebimento *',origin),when.label,ff.label,lbl('Observações',notes,'uniforms-wide'),cl,err,st,act);
const listBox=el('div'),waNote=el('p','profiles-note');body.append(waNote,form,el('h3','uniforms-heading','Recebimentos registrados'),listBox);
const activePeople=()=>P.selectable().filter(x=>x.active).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
function fillDocs(){doc.replaceChildren(new Option(who.value?'Selecione o documento':'Escolha o colaborador primeiro',''));if(!who.value)return;
 for(const c of D.CATS){const s=D.catState(who.value,c.id);if(s==='na')continue;if(s==='done'&&!c.multi)continue;doc.add(new Option(c.name+' — '+({pending:'pendente',review:'aguardando conferência',done:'concluído (novo registro)'})[s],c.id))}
 if(doc.options.length===1)doc.options[0].textContent='Nenhum documento pendente para este colaborador.'}
who.addEventListener('change',fillDocs);
form.onsubmit=async e=>{e.preventDefault();err.textContent=st.textContent='';const iso=when.iso(),file=ff.input.files?.[0],errs=[];if(!who.value)errs.push('Selecione o colaborador.');if(!doc.value)errs.push('Selecione o documento pendente.');if(!iso)errs.push('Informe a data do recebimento.');else if(iso>today())errs.push('A data não pode ser futura.');if(!file)errs.push('Anexe o arquivo recebido.');
 if(errs.length){err.textContent=errs.join(' ');return}const bad=await D.inspectFile(file);if(bad){err.textContent=bad;return}
 const cat=D.CATS.find(c=>c.id===doc.value),recs=D.records(who.value,cat.id),open=recs.find(r=>r.state!=='done'&&!(cat.multi&&r.generated&&0))||null,rid=open?.id||null;
 const ok=await D.attach({personId:who.value,cat:cat.id,recordId:rid,mode:'new'},[file],iso,notes.value.trim(),origin.value);if(!ok){err.textContent='Não foi possível guardar o arquivo neste navegador.';return}
 let msg='Documento recebido ('+origin.value+') e vinculado ao histórico de '+P.byId(who.value)?.name+'. Aguardando conferência.';
 if(chk.checked){const all=D.records(who.value,cat.id),last=rid?all.find(r=>r.id===rid):all.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0];if(last&&D.confer(who.value,cat.id,last.id))msg='Documento recebido ('+origin.value+'), conferido e vinculado ao histórico de '+P.byId(who.value)?.name+'.'}
 ff.input.value='';notes.value='';chk.checked=false;fillDocs();render();st.textContent=msg};
function render(){P.load();{const n=G.officialWhatsapp();waNote.textContent=n?'WhatsApp oficial da Gestão de Pessoas para receber documentos: '+n+'.':'WhatsApp oficial da Gestão de Pessoas não configurado (Cadastros Geral Colaboradores → DES - Comunicação da Gestão de Pessoas).'}const keep=who.value;who.replaceChildren(new Option('Selecione o colaborador',''));for(const p of activePeople())who.add(new Option(p.name+(p.jobName?' · '+p.jobName:''),p.id));who.value=keep;fillDocs();if(!when.iso())when.set(today());
 const rows=[];for(const p of P.get().people)for(const c of D.CATS)for(const r of D.records(p.id,c.id))if(r.files?.length&&r.origin)rows.push({p,c,r});rows.sort((a,b)=>String(b.r.receivedAt).localeCompare(String(a.r.receivedAt)));
 listBox.replaceChildren();if(!rows.length){listBox.append(el('p','profiles-note','Nenhum recebimento com origem registrada ainda.'));return}
 const t=el('table','uniforms-table'),hr=el('tr');for(const h of ['Recebido em','Colaborador','Documento','Origem','Situação'])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const {p,c,r} of rows.slice(0,30)){const tr=el('tr'),sp=el('td');sp.append(el('span','pill '+(r.state==='done'?'p-green':'p-yellow'),r.state==='done'?'Concluído':'Aguardando conferência'));tr.append(el('td',null,r.receivedAt?dateBR(r.receivedAt):'—'),el('td',null,p.name),el('td',null,c.name+(r.label?' — '+r.label:'')),el('td',null,r.origin),sp);tb.append(tr)}
 t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);listBox.append(w)}
window.showDocReceive=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const t=document.getElementById('title');if(t)t.textContent=TITLE;render();normalizeHeaderActions?.(view)};
})();
