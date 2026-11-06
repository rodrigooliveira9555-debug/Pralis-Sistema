/* Estrutura organizacional (Área → Setor → Subsetor/Local) — one source: the Área / Setor / Local tree
   (cicluz-location-tree-v1). This file loads before location-tree.js: it merges the structure sent by the
   company (PRALIS-Areas-Setores-Subsetores.pdf, 06/11/2026) once, by name, without duplicating or removing
   anything, and gives the other screens a read-only view of the tree by id. */
(()=>{
'use strict';
const KEY='cicluz-location-tree-v1',SEED_KEY='cicluz-org-seed-v1';
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLocaleLowerCase('pt-BR');
const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const sigla=n=>Array.from(String(n).replace(/[^\p{L}\p{N}]/gu,'')).slice(0,3).join('');
/* Hierarchy from the PDF (7 áreas, 20 setores, 11 subsetores). */
const PDF=[
 ['Gestão','#7c3aed',[['Direção Geral'],['Gerência Geral']]],
 ['Comercial','#a16207',[['Compras'],['Marketing']]],
 ['Operação de Loja','#2563eb',[['Caixa',['Principal','Secundário']],['Atendimento',['Copa','Mesa','Chapa','Vitrines','Pães e Frios']],['Reposição'],['Limpeza']]],
 ['Operação de Produção','#c2410c',[['Panificação'],['Confeitaria'],['Sanduíches'],['Salgados'],['Almoço/Cozinha']]],
 ['Financeiro','#15803d',[['Tesouraria'],['Fiscal'],['Contas a Pagar e Receber']]],
 ['Gestão de Pessoas','#b91c1c',[['RH'],['Departamento Pessoal']]],
 ['Infraestrutura e Tecnologia','#7c2d12',[['Manutenção',['Estrutura Física','Hidráulica','Elétrica','Máquinas e Equipamentos']],['TI']]]];
function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'[]');return {tree:Array.isArray(s)?s:s.tree||[],history:Array.isArray(s.history)?s.history:[]}}catch{return null}}
function seed(){try{if(localStorage.getItem(SEED_KEY))return}catch{return}const st=read();if(!st)return;let added=0;
 const node=(name,color)=>({id:uid(),identityMode:'text',sigla:sigla(name),name,color,children:[]});
 const ensure=(pool,name,color)=>{let n=pool.find(x=>fold(x.name)===fold(name));if(!n){n=node(name,color);pool.push(n);added++}n.children=n.children||[];return n};
 for(const [area,color,sectors] of PDF){const a=ensure(st.tree,area,color);for(const [sector,subs] of sectors){const s=ensure(a.children,sector,a.color||color);for(const sub of subs||[])ensure(s.children,sub,a.color||color)}}
 try{localStorage.setItem(KEY,JSON.stringify({tree:st.tree,history:st.history}));localStorage.setItem(SEED_KEY,JSON.stringify({at:new Date().toISOString(),source:'PRALIS-Areas-Setores-Subsetores.pdf',added}))}catch{}}
seed();
const LEVELS=['Área','Setor','Local','Sublocal'];
/* Flat list with level, parent, area and path; inactive nodes are flagged, never hidden from history. */
function flat(){const st=read(),out=[];if(!st)return out;const walk=(pool,level,parent,area,path)=>{for(const n of pool){const p=path?path+' › '+n.name:n.name,a=area||n;out.push({id:n.id,name:n.name,level,levelName:LEVELS[level-1],parentId:parent?.id||null,areaId:a.id,areaName:a.name,color:a.color||n.color,path:p,inactive:!!n.inactive||!!parent?.inactiveChain,inactiveChain:!!n.inactive||!!parent?.inactiveChain});walk(n.children||[],level+1,{id:n.id,inactiveChain:!!n.inactive||!!parent?.inactiveChain},a,p)}};walk(st.tree,1,null,null,'');return out}
const byId=id=>flat().find(x=>x.id===id)||null;
/* Valid selection: every chosen setor/local must sit under a chosen área (and a local under a chosen setor). */
function invalidSelection(ids){const all=flat(),set=new Set(ids),bad=[];for(const id of ids){const n=all.find(x=>x.id===id);if(!n)continue;if(n.level>1&&!set.has(n.areaId))bad.push(n.path+' (área '+n.areaName+' não selecionada)');else if(n.level>2&&!set.has(n.parentId))bad.push(n.path+' (setor não selecionado)')}return bad}
window.CicluzOrg={LEVELS,flat,byId,areas:()=>flat().filter(x=>x.level===1),childrenOf:id=>flat().filter(x=>x.parentId===id),invalidSelection,pathOf:id=>byId(id)?.path||'',namesOf:(ids,level)=>(ids||[]).map(byId).filter(x=>x&&(!level||x.level===level)).map(x=>x.name)};
})();
