/* Gestão de Pessoas — base comum das melhorias: empresa da sessão, configuração da comunicação (WhatsApp oficial e antecedências de alerta),
   WhatsApp/e-mail/SMS por link (abrir o aplicativo não é entrega), janela com salvamento assíncrono e campo de arquivo (IndexedDB de Documentações).
   `cicluz-gp-config-v1`: por empresa da sessão. Nenhum número é inventado: sem configuração, as telas avisam. */
(()=>{
'use strict';
const U=window.CicluzUniformUI,PH=window.CicluzPhoneBR;if(!U)return;
const {el,button,fold,newId,dateBR,today}=U;
const KEY='cicluz-gp-config-v1',ACCENT='#7c3aed',TITLE='DES - Comunicação da Gestão de Pessoas',GROUP='Cadastros Geral Colaboradores';

/* ---------- Sessão ---------- */
const profile=()=>{try{return JSON.parse(sessionStorage.getItem('cicluz-sync-aba')||'null')?.perfil||null}catch{return null}};
const companyName=()=>profile()?.empresa?.nome||'';
const userName=()=>profile()?.nome||'';

/* ---------- Configuração por empresa ---------- */
let cfg={version:1,companies:{}},cfgError=false;
function loadCfg(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||typeof s.companies!=='object')throw Error('format');cfg=s}cfgError=false}catch{cfgError=true}}
loadCfg();
const ckey=()=>fold(companyName())||'_sem_empresa';
const settings=()=>{loadCfg();return {whatsapp:'',periodicLeadDays:30,nextDays:3,...(cfg.companies[ckey()]||{})}};
function saveSettings(patch){loadCfg();if(cfgError)return false;const before=JSON.stringify(cfg);try{const c=cfg.companies[ckey()]=cfg.companies[ckey()]||{};(c.history=c.history||[]).push({at:new Date().toISOString(),by:userName(),before:{whatsapp:c.whatsapp||'',periodicLeadDays:c.periodicLeadDays,nextDays:c.nextDays}});Object.assign(c,patch);localStorage.setItem(KEY,JSON.stringify(cfg));return true}catch{cfg=JSON.parse(before);return false}}

/* ---------- Mensagens (abrir o aplicativo não confirma entrega) ---------- */
const digits=v=>String(v||'').replace(/\D/g,'');
const waLink=(number,text)=>{const n=digits(number);return 'https://wa.me/'+(n?(n.startsWith('55')&&n.length>11?n:'55'+n):'')+'?text='+encodeURIComponent(text||'')};
const openWhatsApp=(number,text)=>U.openExternal(waLink(number,text));
const mailLink=(to,subject,text)=>'mailto:'+encodeURIComponent(to||'')+'?subject='+encodeURIComponent(subject||'')+'&body='+encodeURIComponent(text||'');
const smsLink=(number,text)=>'sms:'+digits(number)+'?&body='+encodeURIComponent(text||'');
const openLink=href=>{const a=document.createElement('a');a.href=href;a.rel='noopener';document.body.append(a);a.click();a.remove()};

/* ---------- Janela com salvamento assíncrono ---------- */
function modal(title,build,onSave,saveLabel='Salvar'){const d=el('dialog','location-dialog profiles-dialog uniforms-dialog');d.style.setProperty('--menu-accent',ACCENT);
 const form=el('form','account-editor'),err=el('p','profiles-error');err.setAttribute('role','alert');form.noValidate=true;
 const field=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);form.append(l);return node};
 const ctx=build(field,form),actions=el('div','actions');let busy=false;
 if(onSave){const save=el('button','btn',saveLabel);save.type='submit';actions.append(button('Cancelar',()=>d.close()),save)}else actions.append(button('Fechar',()=>d.close()));
 form.append(err,actions);form.onsubmit=async e=>{e.preventDefault();if(!onSave)return d.close();if(busy)return;busy=true;try{const m=await onSave(ctx,d);if(m){err.textContent=m;return}d.close()}finally{busy=false}};
 d.append(el('h2',null,title),form);document.body.append(d);d.onclose=()=>d.remove();d.showModal();return d}

/* ---------- Arquivo (IndexedDB de Documentações, nunca localStorage) ---------- */
function fileField(label){const i=el('input');i.type='file';i.accept='image/jpeg,image/png,image/webp,application/pdf';i.setAttribute('aria-label',label);const l=el('label',null,label);l.append(i);return {input:i,label:l}}
async function storeFile(file){const FL=window.CicluzDocuments?.files;if(!FL)return {error:'Armazenamento de arquivos indisponível.'};const bad=await FL.inspect(file);if(bad)return {error:bad};const id=newId();try{await FL.put(id,file)}catch{return {error:'Não foi possível guardar o arquivo neste navegador.'}}return {meta:{id,name:file.name,type:file.type,size:file.size}}}
const viewFile=(heading,meta,sensitive=true)=>window.CicluzDocuments?.files.view(heading,meta,sensitive);

/* ---------- Tela de configuração ---------- */
const view=el('section','view');view.id='gp-config-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Configuração única da comunicação da Gestão de Pessoas para a empresa da sessão. O WhatsApp oficial é usado como referência para receber exames, atestados e documentos. Não há números por departamento: essa decisão ainda não foi definida.'));
const lbl=(n,node,cls)=>{const l=el('label',cls,n);node.setAttribute('aria-label',n.replace(/\s*\*$/,''));l.append(node);return l};
const form=el('form','form-fields uniforms-form');form.noValidate=true;const co=el('input'),wa=el('input'),per=el('input'),nx=el('input'),err=el('p','uniforms-wide profiles-error'),st=el('p','uniforms-wide profiles-note');
co.readOnly=true;wa.type='tel';wa.inputMode='tel';wa.maxLength=15;wa.placeholder='(32) 99999-9999';wa.addEventListener('input',()=>{if(PH)wa.value=PH.mask(wa.value)});for(const i of [per,nx]){i.type='number';i.min='1';i.step='1'}err.setAttribute('role','alert');st.setAttribute('role','status');
const sv=el('button','btn','Salvar configuração');sv.type='submit';const act=el('div','uniforms-wide actions');act.append(sv);
form.append(el('h3','uniforms-wide uniforms-heading','Empresa da sessão'),lbl('Empresa',co,'uniforms-wide'),lbl('WhatsApp oficial da Gestão de Pessoas',wa,'uniforms-wide'),lbl('Exames periódicos: avisar com antecedência de (dias)',per),lbl('Agendamentos próximos: considerar até (dias)',nx),el('p','uniforms-wide profiles-note','A periodicidade de cada exame vem do PCMSO e é informada no ASO; aqui só se define a antecedência do aviso.'),err,st,act);
const warn=el('p','people-alert');warn.hidden=true;body.append(warn,form);
function render(){const s=settings();co.value=companyName();wa.value=s.whatsapp||'';per.value=s.periodicLeadDays;nx.value=s.nextDays;warn.hidden=!!companyName()&&!cfgError;warn.textContent=cfgError?'Não foi possível ler a configuração salva neste navegador. Nada será gravado.':'A sessão não informa a empresa: não é possível salvar a configuração.'}
form.onsubmit=e=>{e.preventDefault();err.textContent=st.textContent='';const errs=[];if(!companyName())errs.push('A sessão não informa a empresa.');if(wa.value&&PH&&!PH.valid(wa.value))errs.push('WhatsApp inválido. Use DDD + número.');const a=Number(per.value),b=Number(nx.value);if(!(Number.isInteger(a)&&a>=1)||!(Number.isInteger(b)&&b>=1))errs.push('Antecedências: use dias inteiros a partir de 1.');
 if(errs.length){err.textContent=errs.join(' ');return}if(!saveSettings({whatsapp:digits(wa.value),periodicLeadDays:a,nextDays:b})){err.textContent='Não foi possível salvar neste navegador.';return}render();st.textContent='Configuração salva para '+companyName()+'.'};
function show(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const t=document.getElementById('title');if(t)t.textContent=TITLE;render();normalizeHeaderActions?.(view)}
window.showGpConfig=show;
/* ---------- Dica dos botões de ícone ([data-tip]): mouse, foco do teclado e toque longo ---------- */
(()=>{if(window.__uiTip)return;window.__uiTip=true;const tip=document.createElement('div');tip.className='ui-tip';tip.setAttribute('role','tooltip');tip.setAttribute('popover','manual');
 const mount=()=>{if(!tip.isConnected)document.body.append(tip)};if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
 let cur=null,timer=null,long=false,hideT=null,watch=null,touch=false;const target=n=>n&&n.closest?n.closest('[data-tip]'):null;
 function place(el){tip.style.left='0px';tip.style.top='0px';const r=el.getBoundingClientRect(),t=tip.getBoundingClientRect();let x=r.left+r.width/2-t.width/2;x=Math.max(8,Math.min(x,window.innerWidth-t.width-8));let y=r.top-t.height-8;if(y<8)y=r.bottom+8;tip.style.left=x+'px';tip.style.top=y+'px'}
 function show(el){mount();cur=el;tip.textContent=el.dataset.tip||'';try{tip.showPopover()}catch{}tip.classList.add('on');place(el);clearInterval(watch);watch=setInterval(()=>{if(!cur||!document.contains(cur))hide()},300)}
 function hide(){cur=null;clearInterval(watch);tip.classList.remove('on');try{tip.hidePopover()}catch{}}
 document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const t=target(e.target);if(t&&t!==cur)show(t)});
 document.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse')return;const t=target(e.target);if(t&&!t.contains(e.relatedTarget))hide()});
 document.addEventListener('focusin',e=>{const t=target(e.target);if(t&&t.matches(':focus-visible'))show(t)});
 document.addEventListener('focusout',e=>{if(target(e.target))hide()});
 document.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){hide();return}touch=true;const t=target(e.target);if(!t)return;long=false;clearTimeout(timer);timer=setTimeout(()=>{long=true;show(t)},450)},true);
 const end=()=>{clearTimeout(timer);if(long){clearTimeout(hideT);hideT=setTimeout(()=>{hide();long=false},1800)}};
 document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
 /* toque longo só mostra o nome: o clique que viria depois do soltar não executa a ação */
 document.addEventListener('click',e=>{if(long&&target(e.target)){e.preventDefault();e.stopImmediatePropagation();long=false}},true);
 document.addEventListener('contextmenu',e=>{if(touch&&target(e.target))e.preventDefault()},true);
 window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
})();

/* ---------- Botão redondo com dica (hover, foco do teclado e toque longo) ---------- */
function roundButton(label,path,onClick,extra=''){const b=document.createElement('button');b.type='button';b.className='round-action'+(extra?' '+extra:'');b.setAttribute('aria-label',label);b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
 const tip=document.createElement('span');tip.className='round-tip';tip.setAttribute('role','tooltip');tip.textContent=label;b.append(tip);
 /* a dica nunca sai da tela: se passar da borda, desloca para dentro */
 const place=()=>{requestAnimationFrame(()=>{tip.style.transform='translateX(-50%)';const r=tip.getBoundingClientRect(),w=window.innerWidth;let dx=0;if(r.left<8)dx=8-r.left;else if(r.right>w-8)dx=w-8-r.right;if(dx)tip.style.transform='translateX(calc(-50% + '+dx+'px))'})};
 let timer=null,long=false;
 b.addEventListener('click',e=>{if(long){long=false;e.preventDefault();e.stopImmediatePropagation();return}onClick(e)});
 b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;long=false;clearTimeout(timer);timer=setTimeout(()=>{long=true;b.classList.add('show-tip');place()},450)});
 const end=()=>{clearTimeout(timer);if(long)setTimeout(()=>{b.classList.remove('show-tip');long=false},1800)};
 for(const ev of ['pointerup','pointercancel'])b.addEventListener(ev,end);
 b.addEventListener('contextmenu',e=>{e.preventDefault()});
 b.addEventListener('mouseenter',place);b.addEventListener('focus',place);b.addEventListener('blur',()=>b.classList.remove('show-tip'));
 return b}
window.CicluzGP={roundButton,profile,companyName,userName,settings,saveSettings,waLink,openWhatsApp,mailLink,smsLink,openLink,modal,fileField,storeFile,viewFile,digits,
 officialWhatsapp:()=>{const n=settings().whatsapp;return n?(PH?PH.mask(n):n):''}};
})();
