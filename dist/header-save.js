/* Header save shortcuts delegate to the existing action and its validation. */
(()=>{
 const entries=new Map();let queued=false;
 function sync(){
  const surfaces=[...document.querySelectorAll('.view.show,dialog[open],.modal.show>.dialog')];
  for(const [surface,entry] of entries){if(!surface.isConnected||!surfaces.includes(surface)||!entry.source.isConnected||entry.source.hidden||!/^Salvar(?:\s|$)/i.test(entry.source.textContent?.trim()||entry.source.value||'')){entry.button.remove();entries.delete(surface)}}
  for(const surface of surfaces){
   const source=[...surface.querySelectorAll('button:not(.header-save-circle),input[type=submit]')].find(el=>!el.closest('.head,.location-dialog-header,.organogram-dialog-header,.organogram-editor-header,.people-bottom-header')&&!el.hidden&&!el.closest('[hidden]')&&el.getClientRects().length>0&&/^Salvar(?:\s|$)/i.test(el.textContent?.trim()||el.value||''));
   let head=surface.querySelector('.head,.location-dialog-header,.organogram-dialog-header,.organogram-editor-header');
   if(!head&&source&&surface.matches('dialog,.dialog')){const title=surface.querySelector(':scope>h2,:scope>h3');if(title){head=document.createElement('div');head.className='location-dialog-header';title.before(head);head.append(title);const tools=document.createElement('div');tools.className='location-dialog-tools';head.append(tools)}}
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
