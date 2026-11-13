/* Avaliações — esboço funcional (Gestão de Pessoas).
   Área → Setor → Produtos / Ingredientes / Patrimônio → Cargo → Colaborador → Avaliações, reaproveitando os cadastros existentes:
   Área/Setor/Local (CicluzOrg), Ficha de Cargos (cargo ↔ setores), Colaboradores (CicluzPeople), Compras (produtos, curva A) e
   Patrimônio (bens). Só os vínculos novos (produtos/ingredientes e bens do setor) e as avaliações ficam em `cicluz-avaliacoes-v1`.
   O avaliador marca o que está conforme, não conforme ou não se aplica; o aproveitamento = conformes ÷ (conformes + não conformes).
   Nada aqui calcula premiação, ponto ou venda: premiações e metas aguardam regras aprovadas. */
(()=>{
'use strict';
const P=window.CicluzPeople,U=window.CicluzUniformUI,DB=window.CicluzDateBR;if(!P||!U||!DB)return;
const {el,button,iconButton,svg,ICON,fold,newId,money,moneyInput,cents,dateBR,today,confirmDialog}=U;
const KEY='cicluz-avaliacoes-v1',ACCENT='#7c3aed',TITLE='Avaliações',CLIPBOARD='M9 4h6v3H9zM7 5H5v16h14V5h-2M9 14l2 2 4-4';

/* ---------- Critérios (textos do Rodrigo) ---------- */
const APRESENTACAO=['Touca/Boné','Camisa','Avental','Crachá','Calça','Sapato'];
const CRITERIA={
 horario:{title:'Cumprimento do horário de trabalho',items:['Trabalha todos os dias previstos na escala','Bate o ponto corretamente'],note:'Ainda não integrado aos registros de ponto: marque manualmente por enquanto.'},
 apresentacao:{title:'Apresentação pessoal',items:APRESENTACAO,reasons:['Não tem','Sujo']},
 higiene:{title:'Higiene pessoal',items:['Cabelo preso','Cabelo aparado','Barba aparada/baixa','Maquiagem discreta','Brinco pequeno','Sem adereços (anel, cordão, pulseira)','Perfume ou desodorante com cheiro suave']},
 produto:{title:'Produto — Bonito, Fresco e Saboroso',items:['Acabamento','Textura','Cheiro','Sabor']},
 ambiente:{title:'Ambiente — Reposto, Organizado e Limpo',items:['Reposição','Organização','Limpeza']},
 servico:{title:'Serviço — Rápido, Gentil e Sugestivo',items:['Proatividade','Educação (cumprimentos, agradecimentos)','Simpatia (sorriso, boa intenção)','Boa vontade (disposição para atender e ajudar)','Capricho/Zelo']}};
const MODES={individual:{name:'Avaliação Individual',desc:'Horário, apresentação e higiene pessoal de um colaborador.',groups:['horario','apresentacao','higiene']},
 equipe:{name:'Avaliação em Equipe',desc:'Produto, ambiente e serviço de um setor.'},
 geral:{name:'Avaliação Geral',desc:'Vendas e ticket médio: referência contra realizado.'}};
const TEAM={produto:'Produto',ambiente:'Ambiente',servico:'Serviço'};
/* Vínculo com Ocorrências: cada grupo de critérios aponta para uma categoria da matriz de Ocorrências (só consulta; nada vira advertência). */
const OCC_LINK={horario:'Cumprimento de Horários e Disciplina',apresentacao:'Apresentação e Higiene Pessoal',higiene:'Apresentação e Higiene Pessoal',ambiente:'Cumprimento de Atividades e Rotinas',servico:'Respeito, Comunicação e Relacionamento'};
const LINK_TITLE={'Cumprimento de Horários e Disciplina':'Avaliações — Cumprimento de Horários','Apresentação e Higiene Pessoal':'Avaliações — Apresentação Pessoal e Higiene','Cumprimento de Atividades e Rotinas':'Avaliações — Ambiente e Rotina','Respeito, Comunicação e Relacionamento':'Avaliações — Serviço e Relacionamento'};
const occCats=()=>{try{return window.CicluzMatrix?.activeCats()||[]}catch{return []}};
const catIdByName=n=>occCats().find(c=>fold(c.name)===fold(n))?.id||'';
const occRecords=()=>window.CicluzOccurrences?.list()||[];
const INDICATORS=['Aumento de vendas gerais','Aumento de vendas por setor','Aumento do ticket médio'];

/* ---------- Dados próprios ---------- */
let data={version:1,products:{},benches:{},evaluations:[]},loadError=false;
function load(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');if(s){if(s.version!==1||!Array.isArray(s.evaluations))throw Error('format');data=s}if(!data.products)data.products={};if(!data.benches)data.benches={};loadError=false}catch{loadError=true}}
function transact(change){const before=structuredClone(data);try{if(loadError)throw Error('read');change(data);localStorage.setItem(KEY,JSON.stringify(data));return true}catch{data=before;return false}}
load();
const nowIso=()=>new Date().toISOString();
const sessionUser=()=>{try{return JSON.parse(sessionStorage.getItem('cicluz-sync-aba')||'null')?.perfil?.nome||''}catch{return ''}};

/* ---------- Cadastros existentes (somente leitura) ---------- */
const ORG=()=>window.CicluzOrg;
const sectors=()=>(ORG()?.flat()||[]).filter(n=>n.level===2&&!n.inactive);
const orgNode=id=>ORG()?.byId(id)||null;
const descendants=id=>{const out=new Set([id]);let grow=true;const all=ORG()?.flat()||[];while(grow){grow=false;for(const n of all)if(n.parentId&&out.has(n.parentId)&&!out.has(n.id)){out.add(n.id);grow=true}}return out};
const environments=()=>(ORG()?.flat()||[]).filter(n=>n.level>=2&&!n.inactive);
/* Cargos ligados ao setor pela Ficha de Cargos (unitIds do cartão); colaboradores pelo cargo ou pela estrutura do próprio cadastro. */
function jobsOf(sectorId){const JC=window.CicluzJobCards,ds=descendants(sectorId);let jobs=[];try{const d=JSON.parse(localStorage.getItem('cicluz-job-profiles-v1')||'null');for(const r of d?.roles||[]){const c=d.cards?.[r.sourceId];if(c&&(c.unitIds||[]).some(u=>ds.has(u)))jobs.push(c.jobName||r.jobName)}}catch{}void JC;return [...new Set(jobs.filter(Boolean))]}
function peopleOf(sectorId){P.load();const ds=descendants(sectorId),jobs=new Set(jobsOf(sectorId).map(fold));
 return P.selectable().filter(x=>x.active).filter(x=>{const full=P.byId(x.id);return (full?.orgUnitIds||[]).some(u=>ds.has(u))||(x.jobName&&jobs.has(fold(x.jobName)))}).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))}
const COMPRAS=()=>window.CicluzComprasDados,PATRIM=()=>window.CicluzProducaoDados;
const allProducts=()=>{try{return (COMPRAS()?.dados.produtos||[]).filter(p=>p.status!=='inativo').map(p=>({id:p.id,name:p.descricao}))}catch{return []}};
const productName=id=>{try{return COMPRAS()?.produto(id)?.descricao||'Produto não encontrado'}catch{return 'Produto não encontrado'}};
const curvaA=()=>{try{return COMPRAS()?.bolinhas().vende||new Set()}catch{return new Set()}};
const isCurvaA=id=>{const s=curvaA();return !!(s&&s.has&&s.has(id))};
function benchesAll(){try{return (PATRIM()?.patrimonio.dados.bens||[]).filter(b=>b.ativo!==false)}catch{return []}}
const BENCH_CATS={utensilio:'Utensílio',maquina:'Máquina',equipamento:'Equipamento',mobiliario:'Mobiliário'};
function benchesOf(sectorId){const ds=descendants(sectorId),ex=new Set(data.benches[sectorId]||[]);return benchesAll().filter(b=>ex.has(b.id)||(b.local&&ds.has(b.local)))}

/* ---------- Cálculo ---------- */
function score(answers){const ok=answers.filter(a=>a.state==='ok').length,bad=answers.filter(a=>a.state==='bad').length,na=answers.filter(a=>a.state==='na').length,pending=answers.filter(a=>!a.state).length,applicable=ok+bad;
 return {ok,bad,na,pending,applicable,pct:applicable?Math.round(ok/applicable*1000)/10:null}}
const pctText=p=>p==null?'—':String(p).replace('.',',')+'%';

/* ---------- Tela ---------- */
const view=el('section','view');view.id='avaliacoes-view';view.style.setProperty('--menu-accent',ACCENT);
const panel=el('div','panel form-demo uniforms-panel');panel.style.setProperty('--panel-color',ACCENT);panel.style.setProperty('--panel-text','#5520ad');
const head=el('div','head'),heading=el('div'),h2=el('h2',null,TITLE),crumbP=el('p',null,'Gestão de Pessoas · '+TITLE);heading.append(h2,crumbP);head.append(heading);
const body=el('div','content uniforms-content');panel.append(head,body);view.append(panel);document.querySelector('main').append(view);
const stack=[];let current=null;
const goHome=()=>{const o=document.querySelector('.overview-item');if(o)o.click();else document.querySelectorAll('.view').forEach(v=>v.classList.toggle('show',v===view))};
addShortcuts(view.id,()=>{if(stack.length>1){stack.pop();const prev=stack[stack.length-1];stack.pop();go(prev.fn,prev.arg)}else goHome()});
function go(fn,arg){stack.push({fn,arg});current={fn,arg};body.replaceChildren();if(loadError)body.append(el('p','people-alert','Não foi possível ler as avaliações salvas neste navegador. Nada será gravado para não sobrescrever os dados.'));fn(arg);normalizeHeaderActions?.(view)}
const lbl=(name,node,cls)=>{const l=el('label',cls,name);node.setAttribute('aria-label',name.replace(/\s*\*$/,''));l.append(node);return l};
const msgs=()=>{const error=el('p','uniforms-wide profiles-error'),status=el('p','uniforms-wide profiles-note');error.setAttribute('role','alert');status.setAttribute('role','status');return {error,status}};
const select=(options,placeholder,value)=>{const s=el('select');s.add(new Option(placeholder,''));for(const [v,n] of options)s.add(new Option(n,v));s.value=value||'';return s};
function table(heads){const t=el('table','uniforms-table'),hr=el('tr');for(const h of heads)hr.append(el('th',null,h));const th=el('thead');th.append(hr);const tb=el('tbody');t.append(th,tb);const w=el('div','uniforms-table-wrap');w.append(t);return {w,tb}}
const navBar=(...btns)=>{const d=el('div','people-banner-tools');d.append(...btns);return d};
const back=()=>button('Voltar',()=>{stack.pop();const prev=stack.pop();if(prev)go(prev.fn,prev.arg);else goHome()});
const homeBtn=()=>button('Início das Avaliações',()=>{stack.length=0;go(homeScreen)});

/* --- Início: card Avaliações que abre os submenus numerados (mesmo padrão de Documentações) --- */
function homeScreen(){
 body.append(el('div','form-note','Esboço funcional para o Rodrigo refinar: as avaliações usam os cadastros que já existem (Área/Setor, Cargos, Colaboradores, Compras e Patrimônio). Aqui só se marca o que está conforme ou não; nenhuma premiação é calculada.'));
 const card=el('button','avaliacoes-head');card.type='button';card.style.setProperty('--card-color',ACCENT);card.setAttribute('aria-expanded','true');
 const badge=el('span','avaliacoes-head-icon');badge.innerHTML=svg(CLIPBOARD);const ttl=el('span','avaliacoes-head-title');ttl.append(el('b',null,'Avaliações'),el('small',null,'Individual, em equipe e geral'));card.append(badge,ttl);
 const sub=el('div','docs-subcards');sub.setAttribute('role','group');sub.setAttribute('aria-label','Avaliações');sub.style.setProperty('--card-color',ACCENT);
 const items=[['individual','Avaliação Individual',()=>go(individualPick)],['equipe','Avaliação em Equipe',()=>go(teamPick)],['geral','Avaliação Geral',()=>go(generalScreen)],['vinculos','Vínculos do setor',()=>go(linksScreen)],['salvas','Avaliações salvas',()=>go(savedScreen)]];
 items.forEach(([k,name,fn],n)=>{const b=button('',fn,'docs-sub-card');b.dataset.mode=k;b.append(el('span','docs-nav-index',String(n+1)),el('span','docs-sub-name',name),el('span','card-arrow','›'));sub.append(b)});
 card.onclick=()=>{const open=card.getAttribute('aria-expanded')==='true';card.setAttribute('aria-expanded',String(!open));sub.hidden=open};
 body.append(card,sub)}

/* --- Seleção de colaborador (individual e serviço) --- */
function personPicker(onPick,title){const sSel=select(sectors().map(s=>[s.id,s.areaName+' › '+s.name]),'Selecione o setor'),pSel=select([],'Selecione o colaborador'),info=el('p','profiles-note'),{error}=msgs();
 const fill=()=>{pSel.replaceChildren(new Option('Selecione o colaborador',''));const l=sSel.value?peopleOf(sSel.value):[];for(const p of l)pSel.add(new Option(p.name+(p.jobName?' · '+p.jobName:''),p.id));
  info.textContent=!sSel.value?'Escolha o setor para ver os colaboradores vinculados.':l.length?l.length+' colaborador(es) ativo(s) vinculado(s) ao setor (pelo cargo na Ficha de Cargos ou pela estrutura do cadastro).':'Nenhum colaborador vinculado a este setor ainda. Vincule o cargo ao setor na Ficha de Cargos ou a estrutura no Cadastro Simples.'};
 sSel.addEventListener('change',fill);
 const draw=button('Sortear colaborador',()=>{error.textContent='';if(!sSel.value){error.textContent='Escolha o setor antes de sortear.';return}const l=peopleOf(sSel.value);if(!l.length){error.textContent='Não há colaboradores neste setor para sortear.';return}pSel.value=l[Math.floor(Math.random()*l.length)].id},'btn secondary');
 const go2=button('Continuar',()=>{error.textContent='';if(!sSel.value){error.textContent='Selecione o setor.';return}if(!pSel.value){error.textContent='Selecione ou sorteie o colaborador.';return}onPick(sSel.value,pSel.value)},'btn');
 const f=el('div','form-fields uniforms-form');f.append(el('h3','uniforms-wide uniforms-heading',title),lbl('Setor *',sSel),lbl('Colaborador *',pSel),info,error);const tools=navBar(draw,back(),go2);return {f,tools,sSel,pSel,fill}}
function individualPick(){const pk=personPicker((sid,pid)=>go(criteriaScreen,{mode:'individual',sectorId:sid,personId:pid,groups:MODES.individual.groups}),'Avaliação Individual — quem será avaliado');body.append(pk.f,pk.tools)}

/* --- Equipe: categoria → seleção --- */
function teamPick(){body.append(el('h3','uniforms-heading','Avaliação em Equipe — escolha a categoria'));const grid=el('div','avaliacoes-grid');
 for(const [k,n] of Object.entries(TEAM)){const c=el('button','avaliacoes-card');c.type='button';c.dataset.cat=k;c.append(el('b',null,n),el('small',null,CRITERIA[k].title.split('—')[1].trim()));c.onclick=()=>go(k==='produto'?teamProduct:k==='ambiente'?teamEnvironment:teamService);grid.append(c)}
 body.append(grid,navBar(back()))}
function teamProduct(){const f=el('div','form-fields uniforms-form'),sSel=select(sectors().map(s=>[s.id,s.areaName+' › '+s.name]),'Selecione o setor'),prSel=select([],'Selecione o produto'),info=el('p','uniforms-wide profiles-note'),{error}=msgs();
 const fill=()=>{prSel.replaceChildren(new Option('Selecione o produto',''));if(!sSel.value){info.textContent='Escolha o setor.';return}
  const linked=data.products[sSel.value]||[];const rows=linked.map(l=>({...l,name:productName(l.produtoId),a:isCurvaA(l.produtoId)})).sort((a,b)=>(b.a-a.a)||a.name.localeCompare(b.name,'pt-BR'));
  for(const r of rows)prSel.add(new Option((r.a?'★ Curva A · ':'')+r.name+(r.kind==='ingrediente'?' (ingrediente)':''),r.produtoId));
  info.textContent=rows.length?rows.length+' produto(s)/ingrediente(s) vinculado(s) ao setor'+(rows.some(r=>r.a)?'; os de Curva A vêm primeiro (★).':'. Curva A ainda não disponível para estes itens.'):'Nenhum produto vinculado a este setor. Vincule em "Vínculos do setor".'};
 sSel.addEventListener('change',fill);fill();
 const go2=button('Continuar',()=>{error.textContent='';if(!sSel.value||!prSel.value){error.textContent='Selecione o setor e o produto.';return}go(criteriaScreen,{mode:'equipe',category:'produto',sectorId:sSel.value,productId:prSel.value,groups:['produto']})},'btn');
 f.append(el('h3','uniforms-wide uniforms-heading','Produto — Bonito, Fresco e Saboroso'),lbl('Setor *',sSel),lbl('Produto *',prSel),info,error);body.append(f,navBar(back(),go2))}
function teamEnvironment(){const f=el('div','form-fields uniforms-form'),eSel=select(environments().map(n=>[n.id,n.path]),'Selecione o setor ou ambiente'),{error}=msgs();
 const go2=button('Continuar',()=>{error.textContent='';if(!eSel.value){error.textContent='Selecione o setor ou ambiente.';return}go(criteriaScreen,{mode:'equipe',category:'ambiente',sectorId:eSel.value,groups:['ambiente']})},'btn');
 f.append(el('h3','uniforms-wide uniforms-heading','Ambiente — Reposto, Organizado e Limpo'),lbl('Setor ou ambiente *',eSel,'uniforms-wide'),error);body.append(f,navBar(back(),go2))}
function teamService(){const pk=personPicker((sid,pid)=>go(criteriaScreen,{mode:'equipe',category:'servico',sectorId:sid,personId:pid,groups:['servico']}),'Serviço — Rápido, Gentil e Sugestivo');pk.f.append(el('p','uniforms-wide profiles-note','A avaliação de Serviço fica registrada no colaborador avaliado, mesmo dentro da modalidade Equipe.'));body.append(pk.f,pk.tools)}

/* --- Critérios --- */
function contextLines(ctx){const out=[];const sec=orgNode(ctx.sectorId);if(sec)out.push(['Setor',sec.path||sec.name]);
 if(ctx.personId){const p=P.byId(ctx.personId);out.push(['Colaborador',p?.name||'—'],['Cargo',p?.jobName||'—']);
  const J=window.CicluzJornada;if(ctx.mode==='individual'&&J){try{J.load();const ef=J.effective(ctx.personId,today());out.push(['Escala vinculada',ef.scale?ef.scale.name+' · '+J.daysText(ef.scale.days):'Nenhuma escala vinculada'],['Ponto','Ainda não integrado: o cumprimento do horário é marcado manualmente neste esboço'])}catch{}}}
 if(ctx.productId)out.push(['Produto',productName(ctx.productId)+(isCurvaA(ctx.productId)?' (Curva A)':'')]);return out}
function criteriaScreen(ctx){const answers=[];
 const sec=el('div');const dl=el('dl','profiles-info');for(const [k,v] of contextLines(ctx))dl.append(el('dt',null,k),el('dd',null,v));sec.append(el('h3','uniforms-heading',ctx.mode==='individual'?'Avaliação Individual':'Avaliação em Equipe — '+TEAM[ctx.category]),dl);body.append(sec);
 const counter=el('p','profiles-note');counter.setAttribute('aria-live','polite');
 const paint=()=>{const s=score(answers);counter.textContent='Conformes: '+s.ok+' · Não conformes: '+s.bad+' · Não se aplica: '+s.na+' · Ainda não avaliados: '+s.pending+' · Aproveitamento parcial: '+pctText(s.pct)};
 for(const g of ctx.groups){const c=CRITERIA[g],fs=el('section','profiles-section avaliacoes-group');fs.append(el('h3',null,c.title));if(c.note)fs.append(el('p','profiles-note',c.note));
  c.items.forEach((label,i)=>{const a={key:g+':'+i,group:g,groupTitle:c.title,label,state:'',reason:'',note:''};answers.push(a);
   const row=el('fieldset','avaliacoes-item');row.append(el('legend',null,label));const opts=el('div','avaliacoes-options'),extra=el('div','avaliacoes-extra');extra.hidden=true;
   const reasonSel=c.reasons?select(c.reasons.map(r=>[r,r]),'O que houve?'):null,noteIn=el('input');noteIn.maxLength=200;noteIn.placeholder='Observação objetiva: o que precisa melhorar';noteIn.setAttribute('aria-label','Observação — '+label);
   if(reasonSel){reasonSel.setAttribute('aria-label','Motivo — '+label);reasonSel.onchange=()=>{a.reason=reasonSel.value}}noteIn.oninput=()=>{a.note=noteIn.value};
   for(const [st,txt] of [['ok','✅ Conforme'],['bad','❌ Não conforme'],['na','N/A — Não se aplica']]){const l=el('label','avaliacoes-opt'),r=el('input');r.type='radio';r.name='av-'+a.key;r.value=st;r.setAttribute('aria-label',label+' — '+txt);r.onchange=()=>{a.state=st;extra.hidden=st!=='bad';if(st!=='bad'){a.reason='';a.note='';noteIn.value='';if(reasonSel)reasonSel.value=''}paint()};l.append(r,el('span',null,txt));opts.append(l)}
   if(reasonSel)extra.append(reasonSel);extra.append(noteIn);row.append(opts,extra);fs.append(row)});body.append(fs)}
 paint();const {error}=msgs();
 const finish=button('Ver resultado',()=>{error.textContent='';const s=score(answers);if(!s.applicable){error.textContent='Marque ao menos um critério como conforme ou não conforme para calcular o aproveitamento.';return}go(resultScreen,{ctx,answers:structuredClone(answers)})},'btn');
 body.append(counter,error,navBar(back(),finish))}

/* --- Resultado e feedback --- */
function relatedOccurrencesDialog(personId,names){U.dialog('Ocorrências relacionadas — '+(P.byId(personId)?.name||''),(f,form)=>{form.append(el('p','profiles-note','Consulta apenas. Uma avaliação não gera advertência: qualquer medida é decisão do DP, pela análise de ocorrências.'));
  for(const n of names){const id=catIdByName(n),list=occRecords().filter(r=>r.collaboratorId===personId&&r.matrixCatId&&r.matrixCatId===id).sort((a,b)=>b.date.localeCompare(a.date));form.append(el('h4',null,(LINK_TITLE[n]||n)+' ⇄ Ocorrências → '+n));
   if(!list.length){form.append(el('p','profiles-note','Nenhuma ocorrência nesta categoria.'));continue}const ul=el('ul','avaliacoes-list');for(const r of list)ul.append(el('li',null,dateBR(r.date)+' · '+r.type+' · '+(window.CicluzMatrix?.label(r.matrixCatId,r.matrixSubId)||'')+' · '+r.status));form.append(ul)}})}
function describe(ev){const parts=[];const sec=orgNode(ev.sectorId);if(sec)parts.push(sec.name);if(ev.personId)parts.push(P.byId(ev.personId)?.name||'colaborador');if(ev.productId)parts.push(productName(ev.productId));return parts.join(' · ')}
function feedback(ev,container){const s=score(ev.answers);const bads=ev.answers.filter(a=>a.state==='bad');
 const box=el('section','profiles-section avaliacoes-result');box.append(el('h3',null,'Resultado da avaliação: '+pctText(s.pct)+' de aproveitamento.'));
 box.append(el('p','avaliacoes-good','Pontos positivos: '+s.ok+' critério(s) atendido(s).'));
 box.append(el('p',null,'Pontos a melhorar: '+(bads.length?bads.length+' critério(s) não conforme(s).':'nenhum critério marcado como não conforme.')));
 if(bads.length){const ul=el('ul','avaliacoes-list');for(const a of bads)ul.append(el('li',null,a.label+(a.reason?' — '+a.reason:'')+(a.note?': '+a.note:'')));box.append(ul)}
 box.append(el('p','profiles-note','Avaliados: '+s.applicable+' · Não se aplica: '+s.na+' (fora do cálculo)'+(s.pending?' · Sem avaliação: '+s.pending+' (também fora do cálculo, nunca contam como conformes)':'')+'.'));
 const relNames=[...new Set([...(ev.groups||[...new Set(ev.answers.map(a=>a.group))]).map(g=>OCC_LINK[g]).filter(Boolean)])];
 if(ev.personId&&relNames.length){const b=button('Ver ocorrências relacionadas',()=>relatedOccurrencesDialog(ev.personId,relNames),'btn secondary');box.append(b)}
 box.append(el('p','profiles-note','Preparada para a premiação '+(ev.mode==='individual'?'Individual':ev.mode==='equipe'?'em Equipe':'Geral')+' da Ficha de Cargos. Nesta etapa nenhuma premiação é calculada nem concedida.'));container.append(box)}
function resultScreen({ctx,answers}){const ev={...ctx,answers},head=el('h3','uniforms-heading',(ctx.mode==='individual'?'Avaliação Individual':'Avaliação em Equipe — '+TEAM[ctx.category])+' · '+describe(ctx));body.append(head);feedback(ev,body);const {error,status}=msgs();
 let saved=false;const save=button('Salvar avaliação demonstrativa',()=>{error.textContent=status.textContent='';if(saved){status.textContent='Esta avaliação já foi salva.';return}load();const s=score(answers);
  if(!transact(d=>d.evaluations.push({id:newId(),mode:ctx.mode,category:ctx.category||'',sectorId:ctx.sectorId,personId:ctx.personId||'',productId:ctx.productId||'',answers,ok:s.ok,bad:s.bad,na:s.na,pending:s.pending,pct:s.pct,premiacao:{tipo:ctx.mode,status:'Não calculada'},demo:true,createdAt:nowIso(),by:sessionUser()}))){error.textContent='Não foi possível salvar neste navegador.';return}saved=true;status.textContent='Avaliação salva. Ela aparece em "Avaliações salvas" e no colaborador/setor avaliado.'},'btn');
 body.append(error,status,navBar(back(),button('Alterar seleção',()=>{stack.length=0;go(ctx.mode==='individual'?individualPick:teamPick)}),save,button('Nova avaliação',()=>{stack.length=0;go(homeScreen)},'btn secondary'),button('Avaliações salvas',()=>go(savedScreen),'btn secondary')))}

/* --- Avaliação Geral --- */
function generalScreen(){const f=el('div','form-fields uniforms-form');const company=el('input'),list=el('datalist'),sSel=select(sectors().map(s=>[s.id,s.areaName+' › '+s.name]),'Todos / não se aplica'),ind=select(INDICATORS.map(i=>[i,i]),'Selecione o indicador'),from=DB.field('Período: início *'),to=DB.field('Período: fim *'),ref=el('input'),real=el('input'),{error,status}=msgs();
 list.id='av-company-options';company.setAttribute('list',list.id);company.maxLength=80;try{const names=new Set();for(const x of P.get().exams||[]){const n=x.companyName||x.company?.name||'';if(n)names.add(n)}for(const n of names)list.append(new Option(n,n))}catch{}
 for(const i of [ref,real]){i.type='text';i.inputMode='numeric';i.dataset.money='true';i.placeholder='R$ 0,00'}
 const out=el('div','uniforms-wide');
 const calc=button('Comparar',()=>{error.textContent=status.textContent='';out.replaceChildren();const errs=[],r=cents(ref.value),a=cents(real.value);if(!company.value.trim())errs.push('Informe a empresa.');if(!ind.value)errs.push('Selecione o indicador.');if(!from.iso()||!to.iso())errs.push('Informe o período de referência.');else if(to.iso()<from.iso())errs.push('O fim do período não pode ser anterior ao início.');
  if(ind.value==='Aumento de vendas por setor'&&!sSel.value)errs.push('Selecione o setor para este indicador.');if(!(Number.isInteger(r)&&r>0))errs.push('Informe o valor de referência.');if(!Number.isInteger(a)||a<0)errs.push('Informe o valor realizado.');
  if(errs.length){error.textContent=errs.join(' ');return}const diff=a-r,pct=Math.round(diff/r*1000)/10,word=diff>0?'acima':diff<0?'abaixo':'igual';
  const box=el('section','profiles-section avaliacoes-result');box.append(el('h3',null,ind.value),el('p',null,'Referência: '+money(r)+' · Realizado: '+money(a)),el('p','avaliacoes-good','Resultado: '+(diff===0?'realizado igual à referência.':'realizado '+String(Math.abs(pct)).replace('.',',')+'% '+word+' da referência ('+(diff>0?'+':'−')+money(Math.abs(diff))+').')),
   el('p','profiles-note','Valores informados à mão: o esboço ainda não lê vendas nem ticket médio do sistema. Nenhuma meta ou premiação é definida aqui.'));out.append(box);
  const save=button('Salvar avaliação demonstrativa',()=>{load();if(!transact(d=>d.evaluations.push({id:newId(),mode:'geral',company:company.value.trim(),sectorId:sSel.value,indicator:ind.value,from:from.iso(),to:to.iso(),refCents:r,realCents:a,diffPct:pct,premiacao:{tipo:'geral',status:'Não calculada'},demo:true,createdAt:nowIso(),by:sessionUser()}))){error.textContent='Não foi possível salvar neste navegador.';return}status.textContent='Avaliação geral salva.'},'btn');out.append(navBar(save))},'btn');
 from.set(today());to.set(today());
 f.append(el('h3','uniforms-wide uniforms-heading','Avaliação Geral'),lbl('Empresa *',company),list,lbl('Setor (quando aplicável)',sSel),lbl('Indicador avaliado *',ind,'uniforms-wide'),from.label,to.label,lbl('Valor de referência *',ref),lbl('Valor realizado *',real),error,status,out);
 body.append(f,navBar(back(),calc))}

/* --- Avaliações salvas --- */
function savedScreen(){load();body.append(el('h3','uniforms-heading','Avaliações salvas'),el('p','profiles-note','Avaliações demonstrativas guardadas neste navegador. Filtre por colaborador ou setor.'));
 const pSel=select(P.selectable().sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(p=>[p.id,p.name]),'Todos os colaboradores'),sSel=select(sectors().map(s=>[s.id,s.areaName+' › '+s.name]),'Todos os setores');const f=el('div','form-fields uniforms-form');f.append(lbl('Colaborador',pSel),lbl('Setor',sSel));
 const box=el('div');const draw=()=>{box.replaceChildren();const list=data.evaluations.filter(e=>(!pSel.value||e.personId===pSel.value)&&(!sSel.value||e.sectorId===sSel.value)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if(!list.length){box.append(el('p','profiles-note','Nenhuma avaliação salva para este filtro.'));return}
  const {w,tb}=table(['Data','Modalidade','Avaliado','Resultado','']);for(const e of list){const tr=el('tr'),a=el('td','uniforms-row-actions');const res=e.mode==='geral'?(e.diffPct>0?'+':'')+String(e.diffPct).replace('.',',')+'% vs referência':pctText(e.pct);
   a.append(iconButton('Ver avaliação de '+dateBR(e.createdAt.slice(0,10)),ICON.eye,()=>go(detailScreen,e.id)));
   tr.append(el('td',null,dateBR(e.createdAt.slice(0,10))),el('td',null,e.mode==='individual'?'Individual':e.mode==='equipe'?'Equipe · '+TEAM[e.category]:'Geral'),el('td',null,e.mode==='geral'?e.indicator+(e.company?' · '+e.company:''):describe(e)),el('td',null,res),a);tb.append(tr)}box.append(w)};
 pSel.onchange=sSel.onchange=draw;draw();body.append(f,box,navBar(back(),button('Nova avaliação',()=>{stack.length=0;go(homeScreen)},'btn')))}
function detailScreen(id){load();const e=data.evaluations.find(x=>x.id===id);if(!e){body.append(el('p','profiles-note','Avaliação não encontrada.'),navBar(back()));return}
 body.append(el('h3','uniforms-heading',(e.mode==='geral'?'Avaliação Geral · '+e.indicator:(e.mode==='individual'?'Avaliação Individual':'Avaliação em Equipe — '+TEAM[e.category])+' · '+describe(e))+' · '+dateBR(e.createdAt.slice(0,10))));
 if(e.mode==='geral'){body.append(el('p',null,'Empresa: '+(e.company||'—')+' · Período: '+dateBR(e.from)+' a '+dateBR(e.to)),el('p',null,'Referência: '+money(e.refCents)+' · Realizado: '+money(e.realCents)),el('p','avaliacoes-good','Variação: '+String(e.diffPct).replace('.',',')+'%'))}else feedback(e,body);
 body.append(navBar(back()))}

/* --- Vínculos do setor --- */
function linksScreen(){load();body.append(el('h3','uniforms-heading','Vínculos do setor'),el('p','profiles-note','Área → Setor → Produtos/Ingredientes/Patrimônio → Cargo → Colaborador. Cargos e colaboradores vêm da Ficha de Cargos e do Cadastro; produtos, ingredientes e bens são vinculados aqui, sem copiar os cadastros.'));
 const sSel=select(sectors().map(s=>[s.id,s.areaName+' › '+s.name]),'Selecione o setor'),holder=el('div');body.append(lbl('Setor',sSel),holder);
 const draw=()=>{holder.replaceChildren();const sid=sSel.value;if(!sid)return;const node=orgNode(sid);
  const jobs=jobsOf(sid),ppl=peopleOf(sid);
  holder.append(el('h4',null,'Cargos e colaboradores'),el('p','profiles-note',jobs.length?'Cargos ligados ao setor na Ficha de Cargos: '+jobs.join(', ')+'.':'Nenhum cargo ligado a este setor na Ficha de Cargos.'),el('p','profiles-note',ppl.length?'Colaboradores: '+ppl.map(p=>p.name+' ('+(p.jobName||'sem cargo')+')').join(', ')+'.':'Nenhum colaborador vinculado a este setor.'));
  /* produtos e ingredientes */
  holder.append(el('h4',null,'Produtos e ingredientes'));const prods=allProducts(),pSel=select(prods.map(p=>[p.id,p.name]),prods.length?'Selecione o produto ou ingrediente':'Cadastro de produtos indisponível'),kSel=select([['produto','Produto'],['ingrediente','Ingrediente']],'Tipo');kSel.value='produto';const add=button('Vincular ao setor',()=>{if(!pSel.value)return;load();transact(d=>{const l=d.products[sid]=d.products[sid]||[];if(!l.some(x=>x.produtoId===pSel.value))l.push({id:newId(),produtoId:pSel.value,kind:kSel.value||'produto',at:nowIso()})});draw()},'btn');
  const f=el('div','form-fields uniforms-form');f.append(lbl('Produto / ingrediente',pSel),lbl('Tipo',kSel));holder.append(f,navBar(add));
  const linked=data.products[sid]||[];if(linked.length){const {w,tb}=table(['Item','Tipo','Curva A','']);for(const l of linked){const tr=el('tr'),a=el('td','uniforms-row-actions');a.append(iconButton('Desvincular '+productName(l.produtoId),ICON.trash,()=>confirmDialog('Desvincular do setor?',productName(l.produtoId)+' deixa de aparecer nas avaliações de '+node.name+'. O cadastro do produto não é alterado.','Desvincular',()=>{transact(d=>{d.products[sid]=(d.products[sid]||[]).filter(x=>x.id!==l.id)});draw();return null},()=>{})));tr.append(el('td',null,productName(l.produtoId)),el('td',null,l.kind==='ingrediente'?'Ingrediente':'Produto'),el('td',null,isCurvaA(l.produtoId)?'Sim':'Não disponível / não'),a);tb.append(tr)}holder.append(w)}else holder.append(el('p','profiles-note','Nenhum produto ou ingrediente vinculado.'));
  /* patrimônio */
  holder.append(el('h4',null,'Patrimônio'));const bens=benchesAll(),bSel=select(bens.map(b=>[b.id,b.nome+' · '+(BENCH_CATS[b.categoria]||b.categoria)]),bens.length?'Selecione o bem':'Nenhum bem cadastrado em Patrimônio'),addB=button('Vincular bem ao setor',()=>{if(!bSel.value)return;load();transact(d=>{const l=d.benches[sid]=d.benches[sid]||[];if(!l.includes(bSel.value))l.push(bSel.value)});draw()},'btn'),fb=el('div','form-fields uniforms-form');fb.append(lbl('Bem',bSel));holder.append(fb,navBar(addB));
  const mine=benchesOf(sid);if(mine.length){const {w,tb}=table(['Bem','Categoria','Origem']);for(const b of mine){const tr=el('tr');tr.append(el('td',null,b.nome),el('td',null,BENCH_CATS[b.categoria]||b.categoria),el('td',null,(data.benches[sid]||[]).includes(b.id)?'Vinculado aqui':'Local do próprio bem'));tb.append(tr)}holder.append(w)}else holder.append(el('p','profiles-note','Nenhum bem ligado a este setor.'))};
 sSel.onchange=draw;body.append(navBar(back()))}

function show(key){document.querySelectorAll('.view').forEach(v=>v.classList.remove('show'));view.classList.add('show');const c=document.getElementById('crumb');if(c)c.textContent='Gestão de Pessoas · '+TITLE;const t=document.getElementById('title');if(t)t.textContent=TITLE;P.load();load();stack.length=0;go(homeScreen);const direct={individual:individualPick,equipe:teamPick,geral:generalScreen,vinculos:linksScreen,salvas:savedScreen}[key];if(direct)go(direct)}
/* Entrevistas: a aba de Entrevista saiu do fluxo de admissão em 04/11/2026 (Cadastro Simples começa o fluxo). O ícone só reserva o lugar. */
{const v=el('section','view');v.id='entrevistas-view';v.style.setProperty('--menu-accent',ACCENT);const pn=el('div','panel form-demo uniforms-panel');pn.style.setProperty('--panel-color',ACCENT);pn.style.setProperty('--panel-text','#5520ad');
 const hd=el('div','head'),hh=el('div');hh.append(el('h2',null,'Entrevistas'),el('p',null,'Gestão de Pessoas · Entrevistas'));hd.append(hh);const bd=el('div','content uniforms-content');
 bd.append(el('div','form-note','Tela reservada. A Entrevista deixou de ser uma etapa da admissão (o fluxo começa no Cadastro Simples) e ainda não há definição do que este espaço terá. Aguardando as orientações do Rodrigo; nenhum cadastro foi duplicado.'));pn.append(hd,bd);v.append(pn);document.querySelector('main').append(v);addShortcuts(v.id,goHome);
 window.showEntrevistas=()=>{document.querySelectorAll('.view').forEach(x=>x.classList.remove('show'));v.classList.add('show');const c=document.getElementById('crumb');if(c)c.textContent='Gestão de Pessoas · Entrevistas';const t=document.getElementById('title');if(t)t.textContent='Entrevistas';normalizeHeaderActions?.(v)}}
window.showAvaliacoes=show;
/* Avaliações do mesmo colaborador com itens não conformes nos grupos ligados à categoria da ocorrência. */
function relatedToOccurrence(r){if(!r.collaboratorId||!r.matrixCatId)return [];load();const cat=window.CicluzMatrix?.catById(r.matrixCatId);if(!cat)return [];const groups=Object.entries(OCC_LINK).filter(([,n])=>fold(n)===fold(cat.name)).map(([g])=>g);
 return data.evaluations.filter(e=>e.personId===r.collaboratorId).map(e=>({e,bad:e.answers.filter(a=>a.state==='bad'&&groups.includes(a.group))})).filter(x=>x.bad.length||(x.e.answers||[]).some(a=>groups.includes(a.group))).map(x=>({date:x.e.createdAt.slice(0,10),mode:x.e.mode,pct:x.e.pct,bad:x.bad.map(a=>a.label)}))}
window.CicluzAvaliacoes={relatedToOccurrence,OCC_LINK,LINK_TITLE,score,CRITERIA,evaluationsOf:({personId,sectorId}={})=>{load();return data.evaluations.filter(e=>(!personId||e.personId===personId)&&(!sectorId||e.sectorId===sectorId))}};
})();
