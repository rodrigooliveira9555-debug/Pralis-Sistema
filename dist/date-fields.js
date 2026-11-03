/* Display DD/MM/YY while application values and form data retain ISO dates. */
(function(root){
 'use strict';
 const isoPattern=/^(\d{4})-(\d{2})-(\d{2})$/;
 function valid(value){const m=isoPattern.exec(value||'');if(!m||+m[1]<1)return false;const y=+m[1],month=+m[2],day=+m[3],leap=y%4===0&&(y%100!==0||y%400===0);return month>=1&&month<=12&&day>=1&&day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1]}
 function display(value){const m=isoPattern.exec(value||'');return m?m[3]+'/'+m[2]+'/'+m[1].slice(-2):''}
 function mask(value){const d=String(value||'').replace(/\D/g,'').slice(0,6);return d.slice(0,2)+(d.length>2?'/'+d.slice(2,4):'')+(d.length>4?'/'+d.slice(4,6):'')}
 function parse(value,reference=''){const m=/^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value||'');if(!m)return '';const prior=isoPattern.exec(reference),short=+m[3],year=prior&&+prior[1]%100===short?+prior[1]:(short<50?2000:1900)+short;const iso=String(year).padStart(4,'0')+'-'+m[2]+'-'+m[1];return valid(iso)?iso:''}
 const api={valid,display,mask,parse};if(typeof module!=='undefined')module.exports=api;if(!root.document)return;root.CicluzDateFields=api;
 const entries=new Set(),mounted=new WeakSet(),value=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');let serial=0;
 function validate(entry){const {original,input}=entry,raw=input.value,iso=parse(raw,entry.reference);let error=entry.external||'';if(!error&&raw&&!iso)error='Informe uma data válida no formato DD/MM/AA.';if(!error&&iso&&original.min&&iso<original.min)error='A data está antes do limite permitido.';if(!error&&iso&&original.max&&iso>original.max)error='A data está depois do limite permitido.';input.setCustomValidity(error);if(error)input.setAttribute('aria-invalid','true');else input.removeAttribute('aria-invalid');return iso}
 function paint(entry){const iso=value.get.call(entry.original);entry.last=iso;if(valid(iso))entry.reference=iso;else if(!iso)entry.reference='';entry.input.value=display(iso);validate(entry)}
 function syncAttributes(entry){const {original,input}=entry;for(const key of ['required','disabled','readOnly','hidden'])if(input[key]!==original[key])input[key]=original[key]}
 function mount(original){
  if(mounted.has(original)||original.dataset.datePicker)return;mounted.add(original);
  const initial=original.value,defaultValue=original.defaultValue,originalId=original.id||(original.id='date-value-'+(++serial));
  const wrapper=document.createElement('span');wrapper.className='date-field-control';
  const input=document.createElement('input');input.type='text';input.className='date-mask-input';input.dataset.dateDisplay='true';input.id=originalId+'-display';input.inputMode='numeric';input.maxLength=8;input.pattern='[0-9]{2}/[0-9]{2}/[0-9]{2}';input.placeholder='DD/MM/AA';input.autocomplete='off';
  for(const attr of ['aria-label','aria-describedby','aria-labelledby'])if(original.hasAttribute(attr))input.setAttribute(attr,original.getAttribute(attr));
  original.before(wrapper);original.dataset.dateNative='true';original.classList.add('date-native-value');original.type='hidden';wrapper.append(input,original);
  for(const label of document.querySelectorAll('label[for]'))if(label.htmlFor===originalId)label.htmlFor=input.id;
  const entry={original,input,defaultValue,reference:initial,last:initial,external:'',editing:false};entries.add(entry);
  Object.defineProperty(original,'value',{configurable:true,get(){return value.get.call(this)},set(next){value.set.call(this,next);if(!entry.editing)paint(entry)}});
  original.setCustomValidity=message=>{entry.external=String(message);validate(entry)};original.checkValidity=()=>input.checkValidity();original.reportValidity=()=>input.reportValidity();original.focus=options=>input.focus(options);
  input.addEventListener('input',()=>{const cursor=input.selectionStart||0,digits=input.value.slice(0,cursor).replace(/\D/g,'').length;input.value=mask(input.value);let at=0,count=0;while(at<input.value.length&&count<digits){if(/\d/.test(input.value[at]))count++;at++}input.setSelectionRange(at,at);entry.external='';const iso=validate(entry);entry.editing=true;original.value=iso;entry.last=iso;entry.editing=false;if(iso)entry.reference=iso;else if(!input.value)entry.reference='';original.dispatchEvent(new Event('input',{bubbles:true}))});
  input.addEventListener('paste',event=>{const text=event.clipboardData?.getData('text').trim()||'',full=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text),iso=isoPattern.test(text)?text:full?full[3]+'-'+full[2]+'-'+full[1]:'';if(iso){event.preventDefault();entry.reference=iso;input.value=display(iso);input.dispatchEvent(new Event('input',{bubbles:true}))}});
  input.addEventListener('change',()=>{validate(entry);original.dispatchEvent(new Event('change',{bubbles:true}))});input.addEventListener('blur',()=>validate(entry));
  value.set.call(original,initial);syncAttributes(entry);paint(entry);
 }
 function scan(){document.querySelectorAll('input[type=date]:not([data-date-picker])').forEach(mount);for(const entry of entries){if(!entry.original.isConnected){entries.delete(entry);continue}syncAttributes(entry);if(value.get.call(entry.original)!==entry.last)paint(entry);else validate(entry)}}
 document.addEventListener('reset',event=>requestAnimationFrame(()=>{for(const entry of entries)if(entry.original.form===event.target){entry.external='';entry.reference=entry.defaultValue;value.set.call(entry.original,entry.defaultValue);paint(entry)}}));
 let queued=false;const schedule=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;scan()})};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['value','required','disabled','readonly','min','max','hidden']});scan();
})(typeof window!=='undefined'?window:globalThis);
