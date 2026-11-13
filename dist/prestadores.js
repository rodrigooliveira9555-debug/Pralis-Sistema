/* Prestadores de Serviços — clínicas de Medicina do Trabalho e outros, com um ou mais endereços.
   Cadastro único usado pelo agendamento de exames (prestador → endereço): nada de endereço fixo no código da tela de exames.
   `cicluz-prestadores-v1`. Na primeira abertura grava, com a flag `seeded`, o prestador que a tela de exames já usava
   (AcessaMed+ Trabalho e suas duas unidades), para os registros antigos continuarem a achar o endereço pela chave antiga (legacyKey).
   Nenhum outro prestador (Medimais, Tramed…) é criado aqui: o DP cadastra com os endereços reais. */
(()=>{
'use strict';
const U=window.CicluzUniformUI,PH=window.CicluzPhoneBR;if(!U)return;
const {el,button,iconButton,ICON,fold,newId,today,confirmDialog}=U;
const KEY='cicluz-prestadores-v1',ACCENT='#7c3aed',TITLE='DES - Prestadores de Serviços',GROUP='Cadastros Geral Colaboradores';
const SERVICES=['Medicina do Trabalho','Segurança do Trabalho','Contabilidade','Outro'];
const SEED={name:'AcessaMed+ Trabalho',service:'Medicina do Trabalho',phone:'(32) 3031-6269',mobile:'(32) 99813-4294',site:'www.acessamedmais.com.br',hours:'Horário de atendimento: de segunda a sexta-feira, das 7h às 19h.',
 notes:'Pagamento: boleto bancário com vencimento dez dias fora o mês em que o exame foi realizado. É reservado o direito de não atender cliente com débito vencido.',
 addresses:[{label:'Centro',street:'Av. Getúlio Vargas, 209 e 245',city:'Juiz de Fora — MG',legacyKey:'CENTRO'},{label:'Benfica',street:'R. Martins Barbosa, 175',city:'Juiz de Fora — MG',legacyKey:'BENFICA'}]};

let data={version:1,seeded:false,providers:[]},loadError=false;
const nowIso=()=>new Date().toISOString();
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.providers))throw Error('format');data=s}loadError=false}catch{loadError=true}
 if(!loadError&&!data.seeded){const at=nowIso();data.seeded=true;data.providers.push({id:newId(),...SEED,active:true,createdAt:at,history:[],addresses:SEED.addresses.map(a=>({id:newId(),...a,active:true}))});try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
const byId=id=>data.providers.find(p=>p.id===id)||null;
const addressOf=(pid,aid)=>byId(pid)?.addresses.find(a=>a.id===aid)||null;
/* Resolve a stored unit key: "providerId|addressId" (new) or a legacy key such as CENTRO (old exams). */
function resolve(key){load();if(!key)return null;if(String(key).includes('|')){const [pid,aid]=key.split('|'),p=byId(pid),a=p&&addressOf(pid,aid);return a?{provider:p,address:a}:null}
 for(const p of data.providers){const a=p.addresses.find(x=>x.legacyKey===key);if(a)return {provider:p,address:a}}return null}
const list=({service,activeOnly=true}={})=>{load();return data.providers.filter(p=>(!service||p.service===service)&&(!activeOnly||p.active)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))};

/* ---------- Tela ---------- */
const view=el('section','view');view.id='prestadores-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Clínicas e outros prestadores usados pela Gestão de Pessoas. Cada prestador pode ter vários endereços; o agendamento de exames escolhe o prestador e depois o endereço. Nada é apagado: prestadores e endereços são desativados.'));
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const warn=el('p','people-alert');warn.hidden=true;warn.textContent='Não foi possível ler os prestadores salvos neste navegador. Nada será gravado para não sobrescrever os dados.';
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const heading2=el('h3','uniforms-wide uniforms-heading','Novo prestador'),name=el('input'),service=el('select'),phone=el('input'),mobile=el('input'),site=el('input'),hours=el('input'),notes=el('textarea'),active=el('select');
name.maxLength=80;site.maxLength=80;site.dataset.textoLivre='1';hours.maxLength=120;notes.rows=2;notes.maxLength=300;for(const i of [phone,mobile]){i.type='tel';i.inputMode='tel';i.maxLength=15;i.addEventListener('input',()=>{if(PH)i.value=PH.mask(i.value)})}
SERVICES.forEach(s=>service.add(new Option(s,s)));active.add(new Option('Ativo','1'));active.add(new Option('Inativo','0'));
const addrBox=el('div','uniforms-wide prestadores-addresses');let addrs=[];
const error=el('p','uniforms-wide profiles-error'),status=el('p','uniforms-wide profiles-note');error.setAttribute('role','alert');status.setAttribute('role','status');
const act=el('div','uniforms-wide actions'),save=el('button','btn','Salvar prestador');save.type='submit';let editing=null;act.append(button('Cancelar',()=>{reset();status.textContent='Edição descartada.'}),save);
form.append(heading2,lbl('Nome do prestador *',name,'uniforms-wide'),lbl('Tipo de serviço *',service),lbl('Situação',active),lbl('Telefone',phone),lbl('Celular',mobile),lbl('Site',site),lbl('Horário de atendimento',hours,'uniforms-wide'),lbl('Observações e condições',notes,'uniforms-wide'),addrBox,error,status,act);
const listBox=el('div');body.append(warn,form,el('h3','uniforms-heading','Prestadores cadastrados'),listBox);
function drawAddrs(){addrBox.replaceChildren(el('h4',null,'Endereços de atendimento *'));
 addrs.forEach((a,i)=>{const row=el('div','prestadores-addr'),lab=el('input'),st=el('input'),ci=el('input'),on=el('select');lab.value=a.label||'';st.value=a.street||'';ci.value=a.city||'';on.add(new Option('Ativo','1'));on.add(new Option('Inativo','0'));on.value=a.active===false?'0':'1';
  lab.placeholder='Unidade (ex.: Centro)';st.placeholder='Endereço completo';ci.placeholder='Cidade — UF';for(const [n,x] of [['Unidade',lab],['Endereço',st],['Cidade',ci],['Situação do endereço',on]])x.setAttribute('aria-label',n+' '+(i+1));
  lab.oninput=()=>{a.label=lab.value};st.oninput=()=>{a.street=st.value};ci.oninput=()=>{a.city=ci.value};on.onchange=()=>{a.active=on.value==='1'};
  row.append(lab,st,ci,on);if(!a.id)row.append(iconButton('Remover endereço '+(i+1)+' ainda não salvo',ICON.trash,()=>{addrs.splice(i,1);drawAddrs()}));addrBox.append(row)});
 addrBox.append(button('Adicionar endereço',()=>{addrs.push({label:'',street:'',city:'',active:true});drawAddrs()}))}
function reset(){editing=null;form.reset();name.value=phone.value=mobile.value=site.value=hours.value=notes.value='';service.value=SERVICES[0];active.value='1';addrs=[{label:'',street:'',city:'',active:true}];heading2.textContent='Novo prestador';save.textContent='Salvar prestador';error.textContent='';drawAddrs()}
function edit(p){editing=p.id;name.value=p.name;service.value=SERVICES.includes(p.service)?p.service:'Outro';phone.value=p.phone||'';mobile.value=p.mobile||'';site.value=p.site||'';hours.value=p.hours||'';notes.value=p.notes||'';active.value=p.active?'1':'0';addrs=p.addresses.map(a=>({...a}));heading2.textContent='Editar prestador: '+p.name;save.textContent='Salvar alterações';error.textContent=status.textContent='';drawAddrs();form.scrollIntoView({block:'start',behavior:'smooth'})}
form.onsubmit=e=>{e.preventDefault();error.textContent=status.textContent='';load();const n=name.value.trim(),errs=[];if(!n)errs.push('Informe o nome do prestador.');
 const used=addrs.filter(a=>(a.label||'').trim()||(a.street||'').trim()||(a.city||'').trim());if(!used.length)errs.push('Cadastre ao menos um endereço.');
 for(const a of used)if(!(a.label||'').trim()||!(a.street||'').trim()||!(a.city||'').trim()){errs.push('Cada endereço precisa de unidade, endereço completo e cidade.');break}
 if(data.providers.some(p=>p.id!==editing&&fold(p.name)===fold(n)&&p.service===service.value))errs.push('Já existe um prestador com este nome e tipo de serviço.');
 if(phone.value&&PH&&!PH.valid(phone.value))errs.push('Telefone inválido. Use DDD + número.');if(mobile.value&&PH&&!PH.valid(mobile.value))errs.push('Celular inválido. Use DDD + número.');
 if(errs.length){error.textContent=[...new Set(errs)].join(' ');return}
 const rec={name:n,service:service.value,phone:phone.value,mobile:mobile.value,site:site.value.trim(),hours:hours.value.trim(),notes:notes.value.trim(),active:active.value==='1'};
 const ok=transact(d=>{const mk=a=>({id:a.id||newId(),label:a.label.trim(),street:a.street.trim(),city:a.city.trim(),legacyKey:a.legacyKey||'',active:a.active!==false});
  if(editing){const p=d.providers.find(x=>x.id===editing);(p.history=p.history||[]).push({at:nowIso(),before:{name:p.name,service:p.service,phone:p.phone,active:p.active,addresses:p.addresses.map(a=>({...a}))}});Object.assign(p,rec,{updatedAt:nowIso(),addresses:used.map(mk)})}
  else d.providers.push({id:newId(),...rec,addresses:used.map(mk),createdAt:nowIso(),history:[]})});
 if(!ok){error.textContent='Não foi possível salvar neste navegador.';return}const msg=(editing?'Prestador atualizado: ':'Prestador cadastrado: ')+n+'.';reset();render();status.textContent=msg};
function toggle(p){const run=()=>{transact(d=>{const x=d.providers.find(y=>y.id===p.id);(x.history=x.history||[]).push({at:nowIso(),before:{active:x.active}});x.active=!x.active;x.updatedAt=nowIso()});render();return null};
 if(p.active)confirmDialog('Desativar prestador?','"'+p.name+'" deixa de aparecer em novos agendamentos. Exames já agendados continuam com ele e nada é apagado.','Desativar',run,()=>{});else run()}
function render(){load();warn.hidden=!loadError;listBox.replaceChildren();const l=[...data.providers].sort((a,b)=>(b.active-a.active)||a.name.localeCompare(b.name,'pt-BR'));
 if(!l.length){listBox.append(el('p','profiles-note','Nenhum prestador cadastrado.'));return}
 const t=el('table','uniforms-table'),hr=el('tr');for(const h of ['Prestador','Serviço','Telefone','Endereços','Situação',''])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const p of l){const tr=el('tr'),st=el('td'),a=el('td','uniforms-row-actions');st.append(el('span','pill '+(p.active?'p-green':'p-red'),p.active?'Ativo':'Inativo'));if(!p.active)tr.classList.add('is-cancelled');
  a.append(iconButton('Editar prestador '+p.name,ICON.edit,()=>edit(p),'is-accent'),iconButton((p.active?'Desativar':'Reativar')+' prestador '+p.name,p.active?ICON.ban:ICON.ok,()=>toggle(p)));
  tr.append(el('td',null,p.name),el('td',null,p.service),el('td',null,p.phone||p.mobile||'—'),el('td',null,p.addresses.filter(x=>x.active!==false).map(x=>x.label+' — '+x.street+', '+x.city).join(' | ')||'—'),st,a);tb.append(tr)}
 t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);listBox.append(w)}
function show(){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const tt=document.getElementById('title');if(tt)tt.textContent=TITLE;load();reset();render();normalizeHeaderActions?.(view)}
window.showPrestadores=show;
window.CicluzProviders={list,byId,addressOf,resolve,load,SERVICES};
})();
