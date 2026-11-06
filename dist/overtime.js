/* Horas extras e adicional noturno — lançamentos por colaborador, ligados ao salário do cargo e ao tipo de contratação.
   Valor-base da hora = salário-base mensal ÷ divisor mensal; valor-base lançado = valor da hora × horas.
   Percentuais, divisor, período noturno e limite diário NÃO vêm preenchidos: o DP informa os parâmetros oficiais e a fonte.
   Enquanto um percentual não estiver configurado, o lançamento mostra só o valor-base e marca o total como pendente.
   Lançamentos nunca são apagados: cancelar mantém o registro. Cada lançamento guarda a memória do cálculo da época. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!P||!U||!DB)return;
const {el,button,iconButton,ICON,fold,newId,money,dateBR,today,dialog,confirmDialog}=U;
const KEY='cicluz-horas-v1',ACCENT='#7c3aed',TITLE='DES - Horas Extras e Noturno',GROUP='Lançamentos Colaboradores';
const CONTRACTS=['CLT - MÊS','CLT - HORA'];
const MISSING_LABEL={divisor:'divisor mensal do contrato',overtimePct:'percentual da hora extra',nightPct:'percentual do adicional noturno'};

let data={version:1,params:[],entries:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.params)||!Array.isArray(s.entries))throw Error('format');data=s}loadError=false}catch{loadError=true}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
const nowIso=()=>new Date().toISOString();
const sessionUser=()=>{try{return JSON.parse(sessionStorage.getItem('cicluz-sync-aba')||'null')?.perfil?.nome||''}catch{return ''}};

/* ---------- Parameters in force on a day (appended with a start date and the official source) ---------- */
const EMPTY={divisors:{'CLT - MÊS':null,'CLT - HORA':null},overtimePct:null,nightPct:null,nightStart:'',nightEnd:'',dailyLimit:''};
function paramsOn(day){const l=data.params.filter(p=>p.from<=day).sort((a,b)=>a.from.localeCompare(b.from)||a.createdAt.localeCompare(b.createdAt));return l[l.length-1]||null}
const paramOf=(p,k,type)=>!p?null:k==='divisor'?p.divisors?.[type]??null:p[k]??null;

/* ---------- Time and money ---------- */
const parseHM=t=>{const m=/^(\d{1,3}):([0-5]\d)$/.exec(String(t||'').trim());return m?+m[1]*60+ +m[2]:String(t||'').trim()===''?0:null};
const hm=n=>Math.floor(n/60)+'h'+String(n%60).padStart(2,'0');
const num=v=>{const s=String(v||'').trim().replace(',','.');if(s==='')return null;const n=Number(s);return Number.isFinite(n)&&n>0?n:NaN};
const pct=n=>String(n).replace('.',',')+'%';
/* Salary of the collaborator's cargo (Cadastro de Cargos, vigente) in cents; null if the cargo has none. */
function salaryOf(p){try{const e=(typeof jobsCurrent==='function'?jobsCurrent():[]).find(x=>fold(x.j.nome)===fold(p.jobName)||fold(x.j.nomeReduzido||'')===fold(p.jobName));
 const v=e&&String(e.j.valor||'').trim();if(!v)return null;const n=Number(v.replace(/\./g,'').replace(',','.'));return Number.isFinite(n)&&n>0?Math.round(n*100):null}catch{return null}}
const contractOf=p=>window.CicluzJobCards?.forJobName(p.jobName||'')?.card?.contractType||'';

/* The calculation, with its memory. Values are null whenever a parameter is missing: nothing is guessed. */
function compute({salaryCents,type,divisorOverride,normal,extra,night,date}){const pr=paramsOn(date),missing=[];
 const divisor=divisorOverride||paramOf(pr,'divisor',type),otPct=paramOf(pr,'overtimePct'),ntPct=paramOf(pr,'nightPct'),lines=[];
 if(!salaryCents)missing.push('salário do cargo');if(!type)missing.push('tipo de contratação');if(!divisor)missing.push(MISSING_LABEL.divisor);
 const base=m=>salaryCents&&divisor?Math.round(salaryCents*m/(divisor*60)):null,hourCents=salaryCents&&divisor?Math.round(salaryCents/divisor):null;
 const r={salaryCents,type,divisor:divisor||null,hourCents,otPct,ntPct,normal,extra,night,baseNormal:base(normal),baseExtra:base(extra),baseNight:base(night),addExtra:null,addNight:null,totalExtra:null,totalNight:null,missing:[...missing],paramFrom:pr?.from||'',paramSource:pr?.source||''};
 if(extra){if(otPct==null)r.missing.push(MISSING_LABEL.overtimePct);else if(r.baseExtra!=null){r.addExtra=Math.round(r.baseExtra*otPct/100);r.totalExtra=r.baseExtra+r.addExtra}}
 if(night){if(ntPct==null)r.missing.push(MISSING_LABEL.nightPct);else if(r.baseNight!=null){r.addNight=Math.round(r.baseNight*ntPct/100);r.totalNight=r.baseNight+r.addNight}}
 r.missing=[...new Set(r.missing)];
 if(salaryCents)lines.push('Salário-base mensal (cargo): '+money(salaryCents));if(type)lines.push('Tipo de contratação: '+type);
 if(divisor&&salaryCents)lines.push('Valor da hora = '+money(salaryCents)+' ÷ '+String(divisor).replace('.',',')+' h = '+money(hourCents));else lines.push('Valor da hora: pendente ('+r.missing.filter(x=>x!=='percentual da hora extra'&&x!=='percentual do adicional noturno').join(', ')+')');
 const part=(name,m,b,p,add,tot,label)=>{if(!m)return;lines.push(name+': '+hm(m)+' × valor da hora = '+(b!=null?money(b):'pendente')+' (valor-base, antes dos adicionais)');
  if(label){if(p==null)lines.push(name+' — acréscimo: percentual não configurado; total pendente');else if(b!=null)lines.push(name+' — acréscimo de '+pct(p)+' = '+money(add)+' → total '+money(tot))}};
 part('Horas normais',normal,r.baseNormal);part('Horas extras',extra,r.baseExtra,otPct,r.addExtra,r.totalExtra,true);part('Horas noturnas',night,r.baseNight,ntPct,r.addNight,r.totalNight,true);
 r.lines=lines;r.total=(normal||extra||night)&&!r.missing.length?(r.baseNormal||0)+(r.totalExtra||0)+(r.totalNight||0):null;return r}

/* ---------- Screen ---------- */
const view=el('section','view');view.id='overtime-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div');heading.append(el('h2',null,TITLE),el('p',null,menuCrumb(2,GROUP,TITLE)));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);addShortcuts(view.id,()=>menuBack(2,GROUP)());
body.append(el('div','form-note','Lançamento de horas normais, horas extras e horas noturnas por colaborador. O valor-base usa o salário do cargo e o divisor do contrato. Percentuais, divisor, período noturno e limite diário são parâmetros oficiais que o DP informa abaixo: a plataforma não traz valores. Sem o parâmetro, o total fica pendente em vez de mostrar um valor incorreto.'));
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const msgs=()=>{const error=el('p','uniforms-wide profiles-error'),status=el('p','uniforms-wide profiles-note');error.setAttribute('role','alert');status.setAttribute('role','status');return {error,status}};
function table(heads){const t=el('table','uniforms-table'),hr=el('tr');for(const h of heads)hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);return {t,tb}}
const warn=el('p','people-alert');warn.hidden=true;body.append(warn);
let flash='';

/* --- Parameters --- */
const pBox=el('div'),pending=el('p','people-alert');
const pForm=el('form','form-fields uniforms-form');pForm.noValidate=true;
const pFrom=DB.field('Início da vigência *'),pMonth=el('input'),pHour=el('input'),pOt=el('input'),pNt=el('input'),pNs=el('input'),pNe=el('input'),pLim=el('input'),pSrc=el('input');
for(const i of [pMonth,pHour,pOt,pNt,pLim]){i.type='text';i.inputMode='decimal'}pMonth.placeholder=pHour.placeholder='Horas por mês (informado pelo DP)';pOt.placeholder=pNt.placeholder='% (informado pelo DP)';pLim.placeholder='hh:mm (opcional)';pSrc.maxLength=160;pSrc.placeholder='Ex.: convenção coletiva, política aprovada, parecer jurídico';
pNs.type=pNe.type='time';pNs.step=pNe.step=60;
const pm=msgs(),pAct=el('div','uniforms-wide actions'),pSave=el('button','btn','Salvar parâmetros');pSave.type='submit';pAct.append(pSave);
pForm.append(el('h3','uniforms-wide uniforms-heading','Parâmetros oficiais'),pFrom.label,lbl('Divisor mensal — CLT - MÊS (horas)',pMonth),lbl('Divisor — CLT - HORA (horas)',pHour),lbl('Hora extra: percentual de acréscimo',pOt),lbl('Adicional noturno: percentual',pNt),lbl('Período noturno: início',pNs),lbl('Período noturno: fim',pNe),lbl('Limite diário de jornada para alerta',pLim),lbl('Fonte da informação (aprovação) *',pSrc,'uniforms-wide'),el('p','uniforms-wide profiles-note','O divisor pode ser diferente em cada contrato. Se o salário do cargo já for por hora, informe 1 no divisor de CLT - HORA. O limite diário é só um alerta, nunca bloqueia.'),pm.error,pm.status,pAct);
function fillParams(){const c=paramsOn(today())||EMPTY;pMonth.value=c.divisors?.['CLT - MÊS']??'';pHour.value=c.divisors?.['CLT - HORA']??'';pOt.value=c.overtimePct??'';pNt.value=c.nightPct??'';pNs.value=c.nightStart||'';pNe.value=c.nightEnd||'';pLim.value=c.dailyLimit||'';pSrc.value='';pFrom.set(today())}
pForm.onsubmit=e=>{e.preventDefault();pm.error.textContent=pm.status.textContent='';load();const d=pFrom.iso(),errs=[],v=x=>{const n=num(x.value);if(Number.isNaN(n))errs.push('Use números maiores que zero (ex.: 220 ou 50).');return n};
 const rec={divisors:{'CLT - MÊS':v(pMonth),'CLT - HORA':v(pHour)},overtimePct:v(pOt),nightPct:v(pNt),nightStart:pNs.value,nightEnd:pNe.value,dailyLimit:pLim.value.trim()};
 if(!d)errs.push('Informe o início da vigência (DD/MM/AAAA).');if(!pSrc.value.trim())errs.push('Informe a fonte da informação (quem aprovou).');if(rec.dailyLimit&&!(parseHM(rec.dailyLimit)>0))errs.push('Limite diário no formato hh:mm.');
 if(!!rec.nightStart!==!!rec.nightEnd)errs.push('Informe início e fim do período noturno, ou deixe os dois em branco.');
 const cur=paramsOn(d);if(cur&&cur.from===d&&JSON.stringify({...cur,from:0,source:0,createdAt:0,by:0,id:0})===JSON.stringify({...rec,from:0,source:0,createdAt:0,by:0,id:0}))errs.push('Estes parâmetros já estão em vigor nesta data.');
 if(errs.length){pm.error.textContent=[...new Set(errs)].join(' ');return}
 if(!transact(x=>x.params.push({id:newId(),from:d,source:pSrc.value.trim(),...rec,createdAt:nowIso(),by:sessionUser()}))){pm.error.textContent='Não foi possível salvar neste navegador.';return}
 flash='Parâmetros salvos a partir de '+dateBR(d)+'. Os anteriores ficam no histórico e os lançamentos já feitos mantêm a memória da época.';render()};
function paramsView(){pBox.replaceChildren();const c=paramsOn(today()),miss=[];if(!c)miss.push('todos os parâmetros');else{for(const t of CONTRACTS)if(!c.divisors?.[t])miss.push('divisor de '+t);if(c.overtimePct==null)miss.push(MISSING_LABEL.overtimePct);if(c.nightPct==null)miss.push(MISSING_LABEL.nightPct)}
 pending.hidden=!miss.length;pending.textContent=miss.length?'Pendente de parâmetros oficiais: '+miss.join(', ')+'. Sem eles os totais ficam pendentes (o valor-base já é calculado quando há salário e divisor).':'';
 pBox.append(el('h3','uniforms-heading','Parâmetros em vigor'),pending);
 const l=[...data.params].sort((a,b)=>b.from.localeCompare(a.from)||b.createdAt.localeCompare(a.createdAt));if(!l.length){pBox.append(el('p','profiles-note','Nenhum parâmetro cadastrado.'));return}
 const {t,tb}=table(['A partir de','Divisor mês','Divisor hora','Hora extra','Noturno','Período noturno','Limite diário','Fonte']);const cur=paramsOn(today());
 for(const p of l){const tr=el('tr');if(p!==cur&&p.id!==cur?.id)tr.classList.add('is-cancelled');tr.append(el('td',null,dateBR(p.from)+(p.id===cur?.id?' (vigente)':'')),...[p.divisors?.['CLT - MÊS'],p.divisors?.['CLT - HORA']].map(x=>el('td','uniforms-num',x==null?'—':String(x).replace('.',','))),...[p.overtimePct,p.nightPct].map(x=>el('td','uniforms-num',x==null?'—':pct(x))),el('td',null,p.nightStart?p.nightStart+' às '+p.nightEnd:'—'),el('td',null,p.dailyLimit||'—'),el('td',null,p.source));tb.append(tr)}
 const w=el('div','uniforms-table-wrap');w.append(t);pBox.append(w)}

/* --- Launch form --- */
const form=el('form','form-fields uniforms-form');form.noValidate=true;
const who=el('select'),date=DB.field('Data *'),type=el('select'),div=el('input'),hN=el('input'),hE=el('input'),hT=el('input'),note=el('input'),memory=el('pre','uniforms-wide profiles-note'),dayAlert=el('p','uniforms-wide people-alert');
type.add(new Option('Usar o tipo do cargo',''));for(const c of CONTRACTS)type.add(new Option(c,c));div.type='text';div.inputMode='decimal';div.placeholder='Opcional: só para este lançamento';
for(const i of [hN,hE,hT]){i.type='text';i.inputMode='numeric';i.placeholder='0:00'}note.maxLength=140;memory.setAttribute('aria-live','polite');memory.classList.add('overtime-memory');dayAlert.hidden=true;
const lm=msgs(),lAct=el('div','uniforms-wide actions'),lSave=el('button','btn','Lançar horas');lSave.type='submit';lAct.append(lSave);
form.append(el('h3','uniforms-wide uniforms-heading','Novo lançamento'),lbl('Colaborador *',who,'uniforms-wide'),date.label,lbl('Tipo de contratação',type),lbl('Horas normais (hh:mm)',hN),lbl('Horas extras (hh:mm)',hE),lbl('Horas noturnas (hh:mm)',hT),lbl('Divisor deste lançamento (horas)',div),lbl('Observação',note,'uniforms-wide'),el('h4','uniforms-wide','Memória do cálculo'),memory,dayAlert,lm.error,lm.status,lAct);
const person=()=>P.byId(who.value);
function read(){const p=person(),d=date.iso(),errs=[],n=parseHM(hN.value),e=parseHM(hE.value),t=parseHM(hT.value),dv=num(div.value);
 if(!p)errs.push('Selecione o colaborador.');if(!d)errs.push('Informe a data (DD/MM/AAAA).');if([n,e,t].includes(null))errs.push('Informe as horas no formato hh:mm (ex.: 2:30).');if(Number.isNaN(dv))errs.push('Divisor: use um número maior que zero.');
 if(!errs.length&&!(n||e||t))errs.push('Informe ao menos um tipo de hora.');return {p,d,n,e,t,dv,errs}}
function paint(){const {p,d,n,e,t,dv,errs}=read();dayAlert.hidden=true;
 if(!p||!d){memory.textContent='Selecione o colaborador e a data para ver a memória do cálculo.';return}
 const salary=salaryOf(p),ty=type.value||contractOf(p),r=compute({salaryCents:salary,type:ty,divisorOverride:dv||null,normal:n||0,extra:e||0,night:t||0,date:d});
 memory.textContent=r.lines.join('\n')+(r.missing.length?'\n\nPendente: '+r.missing.join(', ')+'.':'')+(r.total!=null?'\n\nTotal do lançamento: '+money(r.total):'');
 const lim=parseHM(paramsOn(d)?.dailyLimit);if(lim&&(n||0)+(e||0)>lim){dayAlert.hidden=false;dayAlert.textContent='Alerta: normais + extras ('+hm((n||0)+(e||0))+') acima do limite diário de '+hm(lim)+'. É só um aviso: confira antes de lançar.'}
 return errs}
for(const i of [who,type,div,hN,hE,hT])i.addEventListener('input',paint);date.node?.addEventListener?.('change',paint);date.label.addEventListener('input',paint);date.label.addEventListener('change',paint);
form.onsubmit=e=>{e.preventDefault();lm.error.textContent=lm.status.textContent='';load();const {p,d,n,e:ex,t,dv,errs}=read();
 if(!errs.length&&data.entries.some(x=>!x.cancelledAt&&x.personId===p.id&&x.date===d))errs.push('Já existe um lançamento de '+p.name+' em '+dateBR(d)+'. Cancele o anterior para lançar de novo: assim não há duplicidade.');
 if(errs.length){lm.error.textContent=errs.join(' ');return}
 const r=compute({salaryCents:salaryOf(p),type:type.value||contractOf(p),divisorOverride:dv||null,normal:n||0,extra:ex||0,night:t||0,date:d});
 if(!transact(x=>x.entries.push({id:newId(),personId:p.id,date:d,competence:d.slice(0,7),normal:n||0,extra:ex||0,night:t||0,note:note.value.trim(),calc:r,createdAt:nowIso(),by:sessionUser()}))){lm.error.textContent='Não foi possível salvar neste navegador.';return}
 flash='Lançamento salvo para '+p.name+' em '+dateBR(d)+(r.missing.length?'. Pendente de parâmetros: '+r.missing.join(', ')+'.':'.');hN.value=hE.value=hT.value=note.value=div.value='';render()};

/* --- List --- */
const listBox=el('div'),filter=el('select');filter.addEventListener('change',()=>listView());
function memoryDialog(x){const p=P.byId(x.personId);dialog('Memória do cálculo — '+(p?.name||'—')+' — '+dateBR(x.date),(field,f)=>{const c=x.calc,pre=el('pre','uniforms-wide profiles-note');pre.classList.add('overtime-memory');
  pre.textContent=c.lines.join('\n')+(c.missing.length?'\n\nPendente quando lançado: '+c.missing.join(', ')+'.':'')+(c.total!=null?'\n\nTotal: '+money(c.total):'')+'\n\nParâmetros da época: vigência de '+(c.paramFrom?dateBR(c.paramFrom):'não configurados')+(c.paramSource?' · '+c.paramSource:'')+'.';f.append(pre)},null)}
function listView(){listBox.replaceChildren();const l=data.entries.filter(x=>!filter.value||x.personId===filter.value).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt));
 if(!l.length){listBox.append(el('p','profiles-note','Nenhum lançamento.'));return}
 const {t,tb}=table(['Data','Colaborador','Normais','Extras','Noturnas','Valor-base','Total','Competência','Situação','Ações']);
 for(const x of l){const p=P.byId(x.personId),c=x.calc,tr=el('tr'),a=el('td','uniforms-row-actions'),st=el('td');if(x.cancelledAt)tr.classList.add('is-cancelled');
  const baseSum=c.baseNormal==null&&c.baseExtra==null&&c.baseNight==null?null:(c.baseNormal||0)+(c.baseExtra||0)+(c.baseNight||0);
  st.append(el('span','pill '+(x.cancelledAt?'p-red':c.total!=null?'p-green':'p-yellow'),x.cancelledAt?'Cancelado':c.total!=null?'Calculado':'Total pendente'));
  a.append(iconButton('Ver memória do cálculo de '+(p?.name||'—'),ICON.eye,()=>memoryDialog(x)));if(!x.cancelledAt)a.append(iconButton('Cancelar lançamento de '+(p?.name||'—')+' em '+dateBR(x.date),ICON.ban,()=>confirmDialog('Cancelar este lançamento?','Horas de '+(p?.name||'—')+' em '+dateBR(x.date)+' ficam marcadas como canceladas. O registro não é apagado e você pode lançar a data de novo.','Cancelar lançamento',()=>{transact(d=>{const y=d.entries.find(z=>z.id===x.id);y.cancelledAt=nowIso();y.cancelledBy=sessionUser()});render();return null},()=>{})));
  tr.append(el('td',null,dateBR(x.date)),el('td',null,p?.name||'—'),el('td','uniforms-num',x.normal?hm(x.normal):'—'),el('td','uniforms-num',x.extra?hm(x.extra):'—'),el('td','uniforms-num',x.night?hm(x.night):'—'),el('td','uniforms-num',baseSum==null?'pendente':money(baseSum)),el('td','uniforms-num',c.total!=null?money(c.total):'pendente'),el('td',null,x.competence.slice(5)+'/'+x.competence.slice(0,4)),st,a);tb.append(tr)}
 const w=el('div','uniforms-table-wrap');w.append(t);listBox.append(w)}

body.append(pBox,pForm,form,el('h3','uniforms-heading','Lançamentos'),lbl('Filtrar por colaborador',filter),listBox);
function render(){load();warn.hidden=!loadError;warn.textContent='Não foi possível ler os lançamentos salvos neste navegador. Nada será gravado para não sobrescrever os dados.';P.load();
 const keep=who.value,keepF=filter.value,people=P.selectable().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));who.replaceChildren(new Option('Selecione o colaborador',''));filter.replaceChildren(new Option('Todos',''));
 for(const p of people){if(p.active)who.add(new Option(p.name+(p.jobName?' · '+p.jobName:''),p.id));filter.add(new Option(p.name,p.id))}who.value=keep;filter.value=keepF;
 if(!date.iso())date.set(today());paramsView();paint();listView();if(flash){lm.status.textContent=flash;flash=''}}
function show(opts={}){document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=menuCrumb(2,GROUP,TITLE);const tt=document.getElementById('title');if(tt)tt.textContent=TITLE;load();fillParams();render();if(opts.personId){who.value=opts.personId;paint()}normalizeHeaderActions(view)}
window.showOvertime=show;
window.CicluzHours={paramsOn,compute,get:()=>{load();return data},byPerson:(pid,competence)=>{load();return data.entries.filter(x=>!x.cancelledAt&&x.personId===pid&&(!competence||x.competence===competence))},dailyLimitMinutes:day=>{load();return parseHM(paramsOn(day||today())?.dailyLimit)||null}};
})();
