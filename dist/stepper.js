/* Barra de etapas única do sistema. Layout "wizard" (cadastros em etapas) e layout "timeline" (fluxo de admissão: cada etapa mostra o estado e o texto; vira lista vertical no celular).
   WIZARD (26/11/2026, Washington): no padrão da Nova Transferência. Um quadro na cor da origem, fixo no topo, diz "Etapa N de M", o nome da etapa e uma barra de segmentos;
   embaixo, a linha "Ir para a etapa" abre a lista das etapas (a que já passou diz "Feita", a de agora diz "Atual"; podeIr(i) apaga as que ainda não podem ser abertas).
   O contêiner leva o escopo transferencia-tela (as regras do quadro do valor e das linhas moram em compras.css) e fica fixo junto: o quadro e a linha andam juntos.
   Cada etapa: {label, state, status, text}. state: done, current, pending, progress, failed, attention, blocked, legacy. */
(function(root){
'use strict';
const CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 7"/></svg>';
const SETA='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function createWizard({steps,current=-1,onSelect,podeIr,label='Etapas'}){
 const wrap=el('div','stepper-wrap stepper-wrap--etapa transferencia-tela transferencia-contexto');
 const rotulo=el('span','transferencia-valor-rotulo'),titulo=el('span','stepper-etapa-titulo'),barra=el('ol','stepper-etapa-barra');barra.setAttribute('aria-hidden','true');
 const cab=el('div','transferencia-valor-cab');cab.setAttribute('role','group');cab.setAttribute('aria-label',label);cab.append(rotulo,titulo,barra);
 const abre=el('button','transferencia-linha transferencia-linha-acao');abre.type='button';abre.setAttribute('aria-expanded','false');
 const resumo=el('span','transferencia-linha-valor'),seta=el('span','transferencia-seta');seta.setAttribute('aria-hidden','true');seta.innerHTML=SETA;
 abre.append(el('span','transferencia-linha-rotulo','Ir para a etapa'),resumo,seta);
 const painel=el('div','transferencia-multi-painel');painel.hidden=true;
 const opcao=el('div','transferencia-opcao');opcao.append(abre,painel);
 const quadro=el('div','transferencia-quadro');quadro.append(opcao);
 const secao=el('section','transferencia-secao');secao.append(quadro);
 wrap.append(cab,secao);
 let all=steps,now=current;
 const fora=(e)=>{if(!wrap.isConnected)document.removeEventListener('pointerdown',fora);else if(!opcao.contains(e.target))lista(false)};
 function lista(sim){
  if(sim){const q=el('div','transferencia-quadro');
   all.forEach((s,i)=>{
    const b=el('button','transferencia-linha transferencia-linha-acao');b.type='button';b.disabled=Boolean(podeIr&&!podeIr(i));if(i===now)b.setAttribute('aria-current','step');
    b.append(el('span','transferencia-linha-rotulo',(i+1)+' · '+s.label),el('span','transferencia-linha-valor',i<now?'Feita':i===now?'Atual':''));
    b.onclick=()=>{lista(false);if(onSelect)onSelect(i)};q.append(b)});
   painel.replaceChildren(q)}
  painel.hidden=!sim;abre.setAttribute('aria-expanded',String(sim));abre.classList.toggle('aberto',sim);
  document.removeEventListener('pointerdown',fora);if(sim)document.addEventListener('pointerdown',fora)}
 abre.onclick=()=>lista(painel.hidden);
 wrap.addEventListener('keydown',(e)=>{if(e.key==='Escape'&&!painel.hidden){lista(false);e.stopPropagation();e.preventDefault();abre.focus()}});
 function paint(){
  rotulo.textContent='Etapa '+(now+1)+' de '+all.length;titulo.textContent=(all[now]&&all[now].label)||'';
  barra.replaceChildren(...all.map((s,i)=>el('li',i<=now?'feito':'')));
  resumo.textContent=(now+1)+' de '+all.length;secao.style.display=all.length<2?'none':'';lista(false)}
 paint();
 return {el:wrap,set(i){now=i;paint()},update(next,i){all=next;if(i!==undefined)now=i;paint()}}}
function createTimeline({steps,current=-1,layout='timeline',label='Etapas'}){
 const wrap=el('div','stepper-wrap'),ol=el('ol','stepper stepper--'+layout);ol.setAttribute('aria-label',label);
 wrap.append(ol);let all=steps,now=current;
 function paint(){ol.replaceChildren();
  all.forEach((s,i)=>{const state=s.state||(i<now?'done':i===now?'current':'pending'),isNow=i===now,prevDone=i>0&&(all[i-1].state||(i-1<now?'done':''))==='done';
   const li=el('li','stepper-item is-'+state+(isNow?' is-current':'')+(prevDone?' is-linked':''));if(isNow)li.setAttribute('aria-current','step');
   const node=el('div','stepper-node');
   const mark=el('span','stepper-mark');if(state==='done')mark.innerHTML=CHECK;else mark.textContent=String(i+1);
   node.append(mark,el('span','stepper-label',s.label));if(s.status)node.append(el('span','stepper-state',s.status));if(s.text)node.append(el('small','stepper-text',s.text));
   li.append(node);ol.append(li)})}
 paint();
 return {el:wrap,set(i){now=i;paint()},update(next,i){all=next;if(i!==undefined)now=i;paint()}}}
function create(opcoes){return opcoes.layout==='timeline'?createTimeline(opcoes):createWizard(opcoes)}
root.CicluzStepper={create};
})(window);
