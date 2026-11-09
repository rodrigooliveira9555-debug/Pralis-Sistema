/* Barra de etapas única do sistema. Layout "wizard" (Cadastro Completo: etapas que se clicam, resumo "Etapa N de M")
   e layout "timeline" (fluxo de admissão: cada etapa mostra o estado e o texto; vira lista vertical no celular).
   Cada etapa: {label, state, status, text}. state: done, current, pending, progress, failed, attention, blocked, legacy. */
(function(root){
'use strict';
const CHECK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 7"/></svg>';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
function create({steps,current=-1,layout='wizard',onSelect,summary=layout==='wizard',label='Etapas'}){
 const wrap=el('div','stepper-wrap'),sum=el('p','stepper-summary'),ol=el('ol','stepper stepper--'+layout);ol.setAttribute('aria-label',label);
 wrap.append(...(summary?[sum]:[]),ol);let all=steps,now=current;
 function paint(){ol.replaceChildren();
  all.forEach((s,i)=>{const state=s.state||(i<now?'done':i===now?'current':'pending'),isNow=i===now,prevDone=i>0&&(all[i-1].state||(i-1<now?'done':''))==='done';
   const li=el('li','stepper-item is-'+state+(isNow?' is-current':'')+(prevDone?' is-linked':''));if(isNow)li.setAttribute('aria-current','step');
   const node=onSelect?el('button','stepper-node'):el('div','stepper-node');if(onSelect){node.type='button';node.onclick=()=>onSelect(i)}
   const mark=el('span','stepper-mark');if(state==='done')mark.innerHTML=CHECK;else mark.textContent=String(i+1);
   node.append(mark,el('span','stepper-label',s.label));if(s.status)node.append(el('span','stepper-state',s.status));if(s.text)node.append(el('small','stepper-text',s.text));
   li.append(node);ol.append(li)});
  if(summary){sum.replaceChildren();const l=all[now]?.label;sum.append(document.createTextNode('Etapa '+(now+1)+' de '+all.length));if(l){sum.append(document.createTextNode(' · '),el('b',null,l))}}}
 paint();
 return {el:wrap,set(i){now=i;paint()},update(next,i){all=next;if(i!==undefined)now=i;paint()}}}
root.CicluzStepper={create};
})(window);
