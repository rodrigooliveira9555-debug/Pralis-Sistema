/* Shared rules from the user's cross-tab review. */
(()=>{
 const searches=new WeakSet();let queued=false;
 const headerHosts='.head .shortcut-actions,.location-dialog-tools,.organogram-editor-header .shortcut-actions,.fee-header-actions';
 function sync(){
  document.querySelectorAll('.view button,dialog button,.modal button').forEach(button=>{
   if(button.closest('.head,.location-dialog-header,.organogram-editor-header'))return;
   const text=button.textContent.trim();
   if(/^Salvar(?: e continuar)?$/.test(text)&&!button.classList.contains('footer-save-accent'))button.classList.add('footer-save-accent');
   if(text==='Cancelar'&&!button.classList.contains('footer-cancel-accent'))button.classList.add('footer-cancel-accent');
   if(button.matches('.footer-save-accent,.footer-cancel-accent')&&!button.querySelector('.footer-action-icon')){
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.classList.add('footer-action-icon');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',button.classList.contains('footer-save-accent')?'m5 12 4 4L19 6':'m6 6 12 12M18 6 6 18');icon.append(path);button.append(icon);
   }
  });
  document.querySelectorAll('.view label,dialog label,.modal label,.account-field-group,.job-identity,.account-identity,.location-identity').forEach(block=>{
   const inputs=[...block.querySelectorAll('input,select,textarea')].filter(el=>!['hidden','checkbox','radio'].includes(el.type));
   const simple=inputs.length===1&&!block.querySelector('.identity-pick,.location-sigla-field,.icon-library,.account-icon-options,.extra-library');
   if(block.classList.contains('single-field-block')!==simple)block.classList.toggle('single-field-block',simple);
  });
  document.querySelectorAll(headerHosts).forEach(host=>{
   [...host.children].filter(el=>el.tagName==='BUTTON').forEach(button=>{
    const label=button.getAttribute('aria-label')||button.title||'';
    const rank=button.classList.contains('mobile-menu-open')?-100:/^(Voltar|Avançar)/i.test(label)?0:/^Fechar/i.test(label)?1:button.classList.contains('unified-expand-toggle')||/^(Expandir|Recolher)/i.test(label)&&!/(busca|filtro)/i.test(label)?2:/^Atualizar/i.test(label)?3:button.classList.contains('header-save-circle')?4:button.classList.contains('sort-az')?5:button.classList.contains('header-search-circle')?6:7;
    if(button.style.order!==String(rank))button.style.order=String(rank);
   });
  });
  document.querySelectorAll('.view input[type=search],dialog input[type=search],.modal input[type=search]').forEach(input=>{
   if(input.closest('.fixed-header-tools,.jobs-toolbar,.financial-list-controls,.location-toolbar')||searches.has(input))return;
   searches.add(input);const wrap=document.createElement('div');wrap.className='local-search-control';input.before(wrap);wrap.append(input);
   const button=document.createElement('button');button.type='button';button.className='shortcut-circle local-search-toggle';const feeHeader=input.closest('.operator-fees')?.querySelector('.fee-header-actions');if(feeHeader){button.classList.add('header-search-circle');feeHeader.append(button)}const hint=input.getAttribute('aria-label')||input.placeholder||'Buscar';
   button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';if(!feeHeader)wrap.prepend(button);
   const toggle=open=>{input.hidden=!open;button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',(open?'Recolher busca: ':'Abrir busca: ')+hint);button.title=open?'Recolher busca':'Buscar';if(open)input.focus()};
   button.onclick=()=>toggle(input.hidden);input.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();toggle(false);button.focus()}});toggle(false);
  });
 }
 const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync()})};
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open']});sync();
})();
