/* DES - Exames Ocupacionais (relatório): exames pendentes, agendamentos próximos e exames realizados, lidos dos registros existentes (sem duplicar dados). */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!P||!U||!DB)return;
const {el,svg,dateBR,today}=U;
const ACCENT='var(--section-accent,#ef4444)',PATH=menuCrumb(2,'Relatórios','DES - Exames Ocupacionais'),STETHO=telaIcone.exame;
const view=el('section','view');view.id='exams-report-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','var(--section-text,#9c1c1c)');
const head=el('div','head'),badge=el('span','origin-icon');badge.innerHTML=svg(STETHO);const heading=el('div');heading.append(el('h2',null,'DES - Exames Ocupacionais'),el('p',null,PATH));head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
addShortcuts(view.id,()=>menuBack(2,'Relatórios')());
const typeLabel=t=>t==='MUDANÇA DE FUNÇÃO'?'MUDANÇA DE RISCOS OCUPACIONAIS':t;
const FLOW=()=>window.CicluzExamFlow;
const live=()=>P.get().exams.filter(e=>e.scheduleStatus!=='Cancelado');
const GROUPS=[
 ['pend','Exames pendentes','Ainda sem data e hora de agendamento.',()=>live().filter(e=>FLOW()?FLOW().statusOf(e)[0]==='Pendente de agendamento':(e.scheduleStatus==='Pendente'||!e.date))],
 ['next','Agendamentos próximos','Agendados para hoje ou para os próximos dias.',()=>live().filter(e=>e.scheduleStatus==='Agendado'&&e.date&&e.date>=today()).sort((a,b)=>String(a.date).localeCompare(String(b.date)))],
 ['done','Exames realizados','Marcados como realizados ou com resultado registrado.',()=>live().filter(e=>e.scheduleStatus==='Realizado'||e.result==='APTO'||e.result==='NÃO APTO').sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))]];
let open='pend';
const tiles=el('div','exams-alerts'),detail=el('div','exams-report-detail');
function unitName(x){const r=window.CicluzProviders?.resolve?.(x.unit);return r?r.provider.name+' — '+r.address.label:'—'}
function paint(){P.load();tiles.replaceChildren();detail.replaceChildren();
 for(const [key,name,desc,get] of GROUPS){const list=get(),on=open===key;const b=el('button','exams-alert'+(on?' is-open':''));b.type='button';b.setAttribute('aria-expanded',String(on));b.append(el('b',null,String(list.length)),el('small',null,name));b.onclick=()=>{open=on?null:key;paint()};tiles.append(b)}
 const g=GROUPS.find(x=>x[0]===open);if(!g)return;const list=g[3]();detail.append(el('h3','uniforms-heading',g[1]),el('p','profiles-note',g[2]));
 if(!list.length){detail.append(el('p','profiles-note','Nenhum registro.'));return}
 const wrap=el('div','uniforms-table-wrap'),t=el('table','uniforms-table'),hr=el('tr');for(const h of ['Data','Colaborador','Tipo','Prestador','Status'])hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');
 for(const x of list){const tr=el('tr'),st=el('td'),s=FLOW()?FLOW().statusOf(x):[x.scheduleStatus,''];st.append(el('span','pill '+(s[1]||''),s[0]));tr.append(el('td',null,x.date?dateBR(x.date)+(x.time?' '+x.time:''):'—'),el('td',null,x.personName||'—'),el('td',null,typeLabel(x.type)),el('td',null,unitName(x)),st);tb.append(tr)}
 t.append(th,tb);wrap.append(t);detail.append(wrap)}
body.append(tiles,detail);
function showExamsReport(){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');document.getElementById('crumb').textContent=PATH;paint()}
window.showExamsReport=showExamsReport;
})();
