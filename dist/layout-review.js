/* Shared rules from the user's cross-tab review. */
(()=>{
 const searches=new WeakSet();let queued=false;
 const headerHosts='.head .shortcut-actions,.location-dialog-tools,.organogram-editor-header .shortcut-actions,.fee-header-actions';
 /* Ao lado de Cancelar o botão diz só "Salvar"; o rótulo completo fica na dica e no leitor de tela. Rótulos que distinguem dois salvamentos (rascunho, sem enviar, e Enviar) ficam inteiros. */
 function shorten(save,parent){
  const node=[...save.childNodes].find(n=>n.nodeType===3&&n.textContent.trim()),text=node?node.textContent.trim():'';
  if(text==='Salvar'||!text.startsWith('Salvar ')||[' e ','rascunho','sem enviar','só esta'].some(k=>text.includes(k))||parent.querySelectorAll('.footer-save-accent').length!==1)return;
  save.setAttribute('aria-label',text);save.title=text;node.textContent='Salvar';
 }
 /* Todo botão retangular (.btn) leva o ícone da sua função em um círculo à direita; a primeira palavra do rótulo decide o ícone. Rótulo sem palavra conhecida leva a seta de seguir. */
 const ICONS={check:'m5 12 4 4L19 6',x:'m6 6 12 12M18 6 6 18',plus:'M12 5v14M5 12h14',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',trash:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',search:'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM16 16l5 5',calendar:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',pencil:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',printer:'M7 8V3h10v5M6 17H4V9h16v8h-2M7 14h10v7H7z',download:'M12 4v11M7 11l5 5 5-5M5 20h14',upload:'M12 16V5M7 9l5-5 5 5M5 20h14',refresh:'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',mic:'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',send:'M4 12 20 4l-6 16-3-7z',link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',camera:'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',copy:'M9 9h11v11H9zM5 15H4V4h11v1',clock:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3'};
 const WORDS={check:'salvar confirmar concluir aplicar aprovar marcar ok encerrar finalizar conferir receber aceitar permitir ativar entendi sim, sim recebi fechou só fazer selecionar tornar responder',x:'cancelar fechar limpar descartar parar reprovar desmarcar rejeitar recusar não inativar zerar',plus:'novo nova adicionar iniciar registrar cadastrar criar lançar incluir',left:'voltar anterior',right:'avançar próximo próxima continuar entrar seguir ir dar',trash:'excluir remover esvaziar apagar',eye:'ver visualizar abrir mostrar consultar detalhes analisar ler comparar ouvir',search:'buscar pesquisar filtrar procurar',calendar:'agendar hoje amanhã semanal mensal anual',clock:'adiar histórico extrato',pencil:'editar alterar ajustar renomear configurar preencher contrapropor corrigir',printer:'imprimir',download:'baixar exportar gerar png svg',upload:'importar',refresh:'atualizar recarregar recomeçar desfazer revincular',mic:'gravar',send:'enviar compartilhar',link:'vincular',copy:'copiar duplicar'};
 function iconFor(text){
  if(text.startsWith('+'))return 'plus';if(text.startsWith('←'))return 'left';if(text.endsWith('›')||text.endsWith('→'))return 'right';
  const word=text.toLowerCase().split(' ')[0];
  if(word==='fechar'&&text.includes(' '))return 'check';
  const lower=text.toLowerCase();if(lower.includes('foto')||lower.includes('câmera'))return 'camera';
  return Object.keys(WORDS).find(k=>WORDS[k].split(' ').includes(word))||'right';
 }
 function sync(){
  document.querySelectorAll('button.standard-form-action,.view button,dialog button,.modal button,.btn').forEach(button=>{
   if(button.closest('.head,.location-dialog-header,.organogram-editor-header,.people-bottom-header'))return;
   const text=button.textContent.trim();
   if(button.closest('.form-actions')){if((/^Voltar(?:\s|$)/i.test(text)||button.id==='prev-step')&&!button.classList.contains('form-back-action'))button.classList.add('form-back-action');if((/^Avançar(?:\s|$)/i.test(text)||button.id==='next-step')&&!button.classList.contains('form-next-action'))button.classList.add('form-next-action')}
   if(/^Salvar(?:\s+.*)?$/.test(text)&&!button.classList.contains('footer-save-accent'))button.classList.add('footer-save-accent');
   if(text==='Cancelar'&&!button.classList.contains('footer-cancel-accent'))button.classList.add('footer-cancel-accent');
   const has=button.querySelector('.footer-action-icon');
   const kind=has?'':button.classList.contains('footer-save-accent')?'check':button.classList.contains('footer-cancel-accent')?'x':text&&button.classList.contains('btn')&&!button.querySelector('svg,img,input')?iconFor(text):'';
   if(kind){
    const node=[...button.childNodes].find(n=>n.nodeType===3&&n.textContent.trim());
    if(node){const clean=node.textContent.replace(/^\s*[+←]\s*/,'').replace(/\s*[›→]\s*$/,'');if(clean!==node.textContent)node.textContent=clean}
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.classList.add('footer-action-icon');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',ICONS[kind]);icon.append(path);button.append(icon);
   }
   if(button.classList.contains('btn')&&button.classList.contains('acao-com-circulo')!==!!(has||kind))button.classList.toggle('acao-com-circulo',!!(has||kind));
  });
  document.querySelectorAll('.footer-save-accent').forEach(save=>{
   const parent=save.parentElement,cancel=[...parent.children].find(el=>el.classList.contains('footer-cancel-accent'));
   if(!cancel)return;
   if(!parent.classList.contains('footer-action-pair'))parent.classList.add('footer-action-pair');
   shorten(save,parent);
   if(save.compareDocumentPosition(cancel)&Node.DOCUMENT_POSITION_FOLLOWING)save.before(cancel);
  });
  document.querySelectorAll('.view label,dialog label,.modal label,.account-field-group,.job-identity,.account-identity,.location-identity').forEach(block=>{
   const inputs=[...block.querySelectorAll('input,select,textarea')].filter(el=>!el.dataset.datePicker&&!['hidden','checkbox','radio'].includes(el.type));
   const simple=!block.classList.contains('salary-row')&&inputs.length===1&&!block.querySelector('.identity-pick,.location-sigla-field,.icon-library,.account-icon-options,.extra-library');
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
   if(input.closest('.fixed-header-tools,.jobs-toolbar,.financial-list-controls,.location-toolbar,.profiles-search,.people-bottom-search')||searches.has(input))return;
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
