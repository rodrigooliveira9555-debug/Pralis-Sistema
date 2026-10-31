// Ordenação compartilhada dos menus internos; a árvore principal e os registros
// financeiros mantêm seus controles existentes e suas regras de hierarquia.
(()=>{
 const storage='cicluz-menu-item-order-v1';let orders={};try{orders=JSON.parse(localStorage.getItem(storage)||'{}')}catch{}
 const remember=(key,container)=>{orders[key]=[...container.children].filter(n=>n.dataset.menuItemKey).map(n=>n.dataset.menuItemKey);try{localStorage.setItem(storage,JSON.stringify(orders))}catch{alert('Não foi possível salvar a ordem neste navegador.')}};
 function enhance(container){
  if(container.dataset.menuSortable||container.classList.contains('financial-list')||container.querySelector('.account-list-row'))return;
  const nav=container.classList.contains('children'),nodes=[...container.children].filter(n=>nav?n.tagName==='BUTTON':n.classList.contains('record'));
  if(!nodes.length)return;
  container.dataset.menuSortable='1';
  const view=container.closest('.view'),key=nav?'nav:'+container.closest('[data-menu-name]').dataset.menuName:'cards:'+(view?.id||'root')+':'+(view?.querySelector('#sector-path')?.textContent||view?.querySelector('h2')?.textContent||'')+':'+[...container.parentElement.children].indexOf(container);
  nodes.forEach((node,index)=>{const label=(node.querySelector('b')?.textContent||node.textContent).trim();node.dataset.menuItemKey=node.dataset.target||node.dataset.page||label;node.classList.add('menu-sort-item');if(node.tagName==='BUTTON')node.setAttribute('aria-label',label);
   const handle=document.createElement('span');handle.className='menu-item-move';handle.textContent='⠿';handle.title='Arraste para mover; use as setas para reorganizar';handle.setAttribute('role','button');handle.tabIndex=0;handle.setAttribute('aria-label','Mover '+label);node.prepend(handle);
   handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()},true);
   let original=null,changed=false;
   handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();original=[...container.children];changed=false;handle.setPointerCapture(e.pointerId);node.classList.add('menu-item-moving')};
   handle.onpointermove=e=>{if(!original)return;e.preventDefault();const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.menu-sort-item');if(!target||target===node||target.parentElement!==container)return;const siblings=[...container.children];container.insertBefore(node,siblings.indexOf(node)<siblings.indexOf(target)?target.nextSibling:target);changed=true};
   const finish=e=>{if(!original)return;e.preventDefault();e.stopPropagation();node.classList.remove('menu-item-moving');if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);if(e.type==='pointercancel')original.forEach(n=>container.append(n));else if(changed)remember(key,container);original=null};handle.onpointerup=finish;handle.onpointercancel=finish;
   handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const up=e.key==='ArrowUp'||e.key==='ArrowLeft',other=up?node.previousElementSibling:node.nextElementSibling;if(!other?.dataset.menuItemKey)return;container.insertBefore(node,up?other:other.nextSibling);remember(key,container);handle.focus()};
  });
  for(const id of orders[key]||[]){const node=nodes.find(n=>n.dataset.menuItemKey===id);if(node)container.append(node)}
 }
 function scan(){document.querySelectorAll('.nav-tree .children,.record-grid').forEach(enhance)}
 scan();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})}).observe(document.querySelector('.app'),{childList:true,subtree:true});
})();
