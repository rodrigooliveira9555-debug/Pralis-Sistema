function formatFinancialName(value){return String(value||'').toLocaleLowerCase('pt-BR').replace(/(^|[\s/·-])([a-zà-ÿ])/g,(_,sep,letter)=>sep+letter.toLocaleUpperCase('pt-BR')).replace(/^(Cnt|Vnd|Ret|Mer|Des)(?=\s|$)/,m=>m.toUpperCase()).replace(/\b(Pdv)\b/g,'PDV').replace(/\b([1-4])([mt])\b/gi,(_,number,shift)=>number+shift.toUpperCase())}
// Ações compartilhadas por Contas e todos os grupos financeiros.
function createFinancialActions({label,container,onEdit,onDelete}){
 const arrow=document.createElement('button');arrow.type='button';arrow.className='account-action-toggle';arrow.textContent='›';arrow.setAttribute('aria-label','Ações de '+label);arrow.setAttribute('aria-expanded','false');
 const actions=document.createElement('div');actions.className='account-row-actions';actions.hidden=true;
 const edit=document.createElement('button');edit.type='button';edit.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4-.8L19 8l-3-3L5 16zM14.5 6.5l3 3"/></svg>';edit.title='Editar';edit.setAttribute('aria-label','Editar '+label);edit.onclick=e=>{e.preventDefault();e.stopPropagation();onEdit()};
 const remove=document.createElement('button');remove.type='button';remove.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 10v7M14 10v7"/></svg>';remove.title='Excluir';remove.setAttribute('aria-label','Excluir '+label);remove.onclick=e=>{e.preventDefault();e.stopPropagation();onDelete()};actions.append(remove,edit);
 arrow.onclick=e=>{e.preventDefault();e.stopPropagation();const opening=actions.hidden;container.querySelectorAll('.account-row-actions').forEach(x=>x.hidden=true);container.querySelectorAll('.account-action-toggle').forEach(x=>x.setAttribute('aria-expanded','false'));actions.hidden=!opening;arrow.setAttribute('aria-expanded',String(opening))};return {arrow,actions};
}

function createAlphabetizeButton(onSort){const b=document.createElement('button');b.type='button';b.className='shortcut-circle sort-az';b.textContent='A/Z';b.title='Organizar de A a Z';b.setAttribute('aria-label','Organizar de A a Z');b.onclick=e=>{e.preventDefault();e.stopPropagation();onSort()};return b}

function mountAlphabetizeButton(view,button){view.querySelectorAll('.view-alphabetize').forEach(b=>b.remove());const head=view.querySelector('.head');if(!head)return;let tools=head.querySelector('.shortcut-actions');if(!tools){tools=document.createElement('div');tools.className='shortcut-actions';head.append(tools)}button.classList.add('view-alphabetize');tools.append(button);normalizeHeaderActions(view)}

function normalizeHeaderActions(view){for(const tools of view.querySelectorAll('.head .shortcut-actions')){const original=[...tools.children];const rank=el=>{const label=el.getAttribute('aria-label')||el.title||'';return label==='Voltar'?0:label==='Fechar'?1:el.classList.contains('sort-az')?2:label.startsWith('Expandir')?3:label.startsWith('Recolher')?4:5};const next=[...original].sort((a,b)=>rank(a)-rank(b));if(next.some((el,i)=>el!==original[i]))next.forEach(el=>tools.append(el))}}
// Document-level pointer tracking survives moving the dragged node in the DOM.
function enableContinuousReorder(handle,{item,items,onCommit}){
 if(handle.dataset.continuousDrag)return;handle.dataset.continuousDrag='1';handle.style.touchAction='none';
 handle.addEventListener('pointerdown',start,true);handle.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation()},true);
 function start(event){if(event.button!==0)return;event.preventDefault();event.stopImmediatePropagation();const moving=typeof item==='function'?item():item;const original=items();if(!moving||original.length<2)return;
  let point={x:event.clientX,y:event.clientY},active=true,changed=false,frame=0;const pointer=event.pointerId;const parent=moving.parentElement;let scroller=parent;
  while(scroller&&scroller!==document.body){const css=getComputedStyle(scroller);if(/auto|scroll/.test(css.overflowY)&&scroller.scrollHeight>scroller.clientHeight)break;scroller=scroller.parentElement}
  if(!scroller||scroller===document.body)scroller=document.scrollingElement;const page=scroller===document.scrollingElement;
  moving.classList.add('continuous-moving');document.body.classList.add('continuous-dragging');
  function reorder(){const others=items().filter(n=>n!==moving&&n.parentElement===parent);if(!others.length)return;const rects=others.map(node=>({node,rect:node.getBoundingClientRect()}));let before=null;
   const grid=rects.some((a,i)=>rects.some((b,j)=>i!==j&&Math.abs(a.rect.top-b.rect.top)<5));
   if(grid){before=rects.find(({rect})=>point.y<rect.top||(point.y<=rect.bottom&&point.x<rect.left+rect.width/2))?.node||null}
   else before=rects.find(({rect})=>point.y<rect.top+rect.height/2)?.node||null;
   if(before){if(moving.nextElementSibling!==before){parent.insertBefore(moving,before);changed=true}}
   else {const last=others[others.length-1];if(last.nextElementSibling!==moving){parent.insertBefore(moving,last.nextSibling);changed=true}}
  }
  function tick(){if(!active)return;const rect=page?{top:0,bottom:innerHeight}:scroller.getBoundingClientRect();const top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom),edge=Math.min(64,(bottom-top)/4);let speed=0;
   if(point.y<top+edge)speed=-Math.min(20,Math.max(2,(top+edge-point.y)/3));else if(point.y>bottom-edge)speed=Math.min(20,Math.max(2,(point.y-bottom+edge)/3));
   if(speed){scroller.scrollTop+=speed;reorder()}frame=requestAnimationFrame(tick);
  }
  function move(e){if(e.pointerId!==pointer)return;e.preventDefault();e.stopImmediatePropagation();point={x:e.clientX,y:e.clientY};reorder()}
  function finish(e){if(e.pointerId!==pointer)return;e.preventDefault();e.stopImmediatePropagation();active=false;cancelAnimationFrame(frame);document.removeEventListener('pointermove',move,true);document.removeEventListener('pointerup',finish,true);document.removeEventListener('pointercancel',finish,true);moving.classList.remove('continuous-moving');document.body.classList.remove('continuous-dragging');if(e.type==='pointercancel'){const anchor=original[original.length-1]?.nextSibling;original.forEach(n=>parent.insertBefore(n,anchor&&anchor.parentElement===parent?anchor:null))}else if(changed)onCommit();}
  document.addEventListener('pointermove',move,{capture:true,passive:false});document.addEventListener('pointerup',finish,true);document.addEventListener('pointercancel',finish,true);frame=requestAnimationFrame(tick);
 }
}
