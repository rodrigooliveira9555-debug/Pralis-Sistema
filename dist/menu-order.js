// Ordenação compartilhada dos menus internos; a árvore principal e os registros
// financeiros mantêm seus controles existentes e suas regras de hierarquia.
(()=>{
 const activeTools=new Map();const storage='cicluz-menu-item-order-v1';let orders={};try{orders=JSON.parse(localStorage.getItem(storage)||'{}')}catch{}
 const remember=(key,container)=>{orders[key]=[...container.children].filter(n=>n.dataset.menuItemKey).map(n=>n.dataset.menuItemKey);try{localStorage.setItem(storage,JSON.stringify(orders))}catch{alert('Não foi possível salvar a ordem neste navegador.')}};
 function enhance(container){
  if(container.classList.contains('financial-list')||container.querySelector('.account-list-row'))return;
  const nav=container.classList.contains('children'),nodes=[...container.children].filter(n=>nav?n.tagName==='BUTTON':n.classList.contains('record')||n.classList.contains('job-item'));
  if(!nodes.length)return;if(container.classList.contains('record-grid'))container.dataset.navigationMenu='true';if(container.dataset.menuSortable&&nodes.every(n=>n.classList.contains('menu-sort-item')))return;activeTools.get(container)?.remove();
  container.dataset.menuSortable='1';
  const view=container.closest('.view'),key=nav?'nav:'+container.closest('[data-menu-name]').dataset.menuName:'cards:'+(view?.id||'root')+':'+(view?.querySelector('#sector-path')?.textContent||view?.querySelector('h2')?.textContent||'');
  if(!orders[key]&&!nav){const prior=Object.keys(orders).find(k=>k.startsWith(key+':'));if(prior)orders[key]=orders[prior]}
  if(!nav&&!container.classList.contains('record-grid')){const alphabetize=createAlphabetizeButton(()=>{[...nodes].sort((a,b)=>a.dataset.menuItemLabel.localeCompare(b.dataset.menuItemLabel,'pt-BR',{numeric:true,sensitivity:'base'})).forEach(n=>container.append(n));remember(key,container)});alphabetize.classList.add('menu-alphabetize');if(view)mountAlphabetizeButton(view,alphabetize);else container.before(alphabetize);activeTools.set(container,alphabetize)}

  nodes.forEach((node,index)=>{const label=(node.querySelector('b')?.textContent||node.textContent).trim();node.dataset.menuItemKey=node.dataset.menuItemKey||node.dataset.target||node.dataset.page||label;node.dataset.menuItemLabel=label;if(node.classList.contains('menu-sort-item'))return;node.classList.add('menu-sort-item');if(node.tagName==='BUTTON')node.setAttribute('aria-label',label);
   const handle=document.createElement('span');handle.className='menu-item-move';handle.textContent='⠿';handle.title='Arraste para mover; use as setas para reorganizar';handle.setAttribute('role','button');handle.tabIndex=0;handle.setAttribute('aria-label','Mover '+label);node.prepend(handle);
   handle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()},true);
   enableContinuousReorder(handle,{item:node,items:()=>[...container.children].filter(n=>n.dataset.menuItemKey),onCommit:()=>remember(key,container)});
   handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();e.stopPropagation();const up=e.key==='ArrowUp'||e.key==='ArrowLeft',other=up?node.previousElementSibling:node.nextElementSibling;if(!other?.dataset.menuItemKey)return;container.insertBefore(node,up?other:other.nextSibling);remember(key,container);handle.focus()};
  });
  const normalizeLabel=value=>String(value).replace(/⠿/g,'').replace(/ de Cartões| Cartões/g,'').trim();const saved=orders[key]||[];const arranged=[];for(const id of saved){const node=nodes.find(n=>n.dataset.menuItemKey===id||normalizeLabel(n.dataset.menuItemLabel)===normalizeLabel(id));if(node&&!arranged.includes(node))arranged.push(node)}nodes.forEach((node,i)=>{if(arranged.includes(node))return;const prev=i>0?arranged.indexOf(nodes[i-1]):-1;if(prev>=0)arranged.splice(prev+1,0,node);else arranged.push(node)});arranged.forEach(node=>container.append(node));if(saved.length)remember(key,container);
 }
 function scan(){document.querySelectorAll('.nav-tree>.overview-item>.drag-handle,.nav-tree details>summary>.drag-handle').forEach(handle=>{const item=handle.closest('[data-menu-name]');const container=item.parentElement;enableContinuousReorder(handle,{item,items:()=>[...container.children].filter(n=>n.dataset.menuName),onCommit:()=>{localStorage.setItem('cicluz-menu-ordem',JSON.stringify([...container.children].map(n=>n.dataset.menuName).filter(Boolean)))}})});for(const [container,button] of activeTools){if(!container.isConnected){button.remove();activeTools.delete(container)}}document.querySelectorAll('.nav-tree .children,.record-grid,#jobs-list').forEach(enhance)}
 scan();let queued=false;new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})}).observe(document.querySelector('.app'),{childList:true,subtree:true});
})();
