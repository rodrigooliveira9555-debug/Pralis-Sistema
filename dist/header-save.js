/* Header save shortcuts delegate to the existing action and its validation. */
(()=>{
 const entries=new Map();let queued=false;
 function sync(){
  const surfaces=[...document.querySelectorAll('.view.show,dialog[open],.modal.show>.dialog')];
  for(const [surface,entry] of entries){if(!surface.isConnected||!surfaces.includes(surface)||!entry.source.isConnected||entry.source.hidden){entry.button.remove();entries.delete(surface)}}
  for(const surface of surfaces){
   const source=[...surface.querySelectorAll('button:not(.header-save-circle),input[type=submit]')].find(el=>!el.closest('.head,.location-dialog-header,.organogram-dialog-header')&&!el.hidden&&!el.closest('[hidden]')&&el.getClientRects().length>0&&/^Salvar(?: atualização)?$/i.test(el.textContent?.trim()||el.value||''));
   const head=surface.querySelector('.head,.location-dialog-header,.organogram-dialog-header');
   if(!source||!head)continue;
   let tools=head.querySelector('.shortcut-actions,.location-dialog-tools,.organogram-dialog-tools');if(!tools)tools=head;
   let entry=entries.get(surface);
   if(entry&&entry.source!==source){entry.button.remove();entries.delete(surface);entry=null}
   if(!entry){const button=document.createElement('button');button.type='button';button.className='shortcut-circle header-save-circle';button.title='Salvar';button.setAttribute('aria-label','Salvar pelo cabeçalho');button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';button.onclick=()=>{if(source.isConnected&&!source.disabled)source.click()};tools.append(button);entry={source,button};entries.set(surface,entry)}
   if(entry.button.disabled!==source.disabled)entry.button.disabled=source.disabled;
  }
 }
 const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;sync()})};
 new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','open','hidden','disabled']});sync();
})();
