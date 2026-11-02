/* Final-step actions save the completed form in the same browser. */
(()=>{
 const view=document.getElementById('cadastro-completo'),steps=document.getElementById('form-steps');
 if(!view||!steps)return;
 const key='cicluz-cadastro-completo-v1';
 const fields=()=>[...steps.querySelectorAll('input,select,textarea')].filter(el=>el.type!=='file'&&!el.dataset.dateDisplay&&!el.dataset.datePicker);
 const status=document.createElement('p');status.className='registration-status';status.setAttribute('role','status');view.querySelector('.form-actions').after(status);
 const next=document.createElement('button');next.type='button';next.className='shortcut-circle registration-next';next.setAttribute('aria-label','Avançar etapa');next.title='Avançar etapa';next.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';next.onclick=()=>document.getElementById('next-step').click();view.querySelector('.head .shortcut-actions').append(next);
 function sync(){next.hidden=!!steps.querySelector('.form-step:last-child.active');view.querySelectorAll('[data-step]').forEach(button=>{if(button.classList.contains('active'))button.setAttribute('aria-current','step');else button.removeAttribute('aria-current')})}
 document.addEventListener('cicluz-registration-step',sync);sync();
 document.addEventListener('cicluz-registration-save',()=>{
  const invalid=fields().find(el=>!el.disabled&&!el.checkValidity());
  if(invalid){const step=[...steps.querySelectorAll('.form-step')].indexOf(invalid.closest('.form-step'));if(step>=0)showStep(step);invalid.reportValidity();invalid.focus();status.textContent='Confira os campos obrigatórios antes de salvar.';return}
  const data={version:1,savedAt:new Date().toISOString(),dependents:steps.querySelectorAll('.dep-card').length,fields:fields().map(el=>({type:el.dataset.dateNative?'date':el.type,value:el.value,checked:el.checked}))};
  try{localStorage.setItem(key,JSON.stringify(data));status.textContent='Cadastro salvo neste navegador. Fotos e arquivos anexados não são guardados ao fechar a página.'}catch{status.textContent='Não foi possível salvar neste navegador. Seus dados continuam no formulário.'}
 });
 try{const data=JSON.parse(localStorage.getItem(key)||'null');if(data?.version===1&&Array.isArray(data.fields)&&Number.isInteger(data.dependents)&&data.dependents>=0&&data.dependents<=100){while(steps.querySelectorAll('.dep-card').length<data.dependents)document.getElementById('add-dependent').click();fields().forEach((el,i)=>{const saved=data.fields[i];if(!saved||saved.type!==(el.dataset.dateNative?'date':el.type))return;el.value=typeof saved.value==='string'?saved.value:'';if(['checkbox','radio'].includes(el.type))el.checked=!!saved.checked});status.textContent='Cadastro salvo recuperado deste navegador.'}}catch{status.textContent='Não foi possível recuperar o cadastro salvo. O formulário está disponível para preenchimento.'}
})();
