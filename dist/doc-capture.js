/* Bloco padrão de foto e anexo de documento. Mesmo desenho em todas as telas: ícone, título e ajuda, os dois botões
   (Usar câmera, Selecionar arquivo) e uma linha de estado. A tela só escuta o evento 'doc-capture'
   (detail: file, source, side, block). Nos blocos com frenteVerso, "Usar câmera" tira duas fotos seguidas: depois da frente o mesmo botão pede o verso (side: frente, verso, unica). */
(function(root){
'use strict';
const ICON={camera:'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',file:'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6'};
const ACCEPT='image/jpeg,image/png,image/webp,application/pdf';
const svg=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
const LABEL={camera:'Usar câmera',file:'Selecionar arquivo'};
/* Botão com o ícone no quadrado arredondado; também usado fora do bloco (ex.: Ocorrências). */
function botao(kind,label,onClick){const b=document.createElement('button');b.type='button';b.className='btn btn-com-icone';b.dataset.docPick=kind;b.innerHTML='<span class="btn-icone-quadro">'+svg(ICON[kind])+'</span>';b.append(label||LABEL[kind]);if(onClick)b.onclick=onClick;return b}
const btnHtml=kind=>'<button type="button" class="btn btn-com-icone" data-doc-pick="'+kind+'"><span class="btn-icone-quadro">'+svg(ICON[kind])+'</span>'+LABEL[kind]+'</button>';
function markup(title,help,opts={}){const tipos=opts.tipos?'<label class="doc-capture-type">Tipo do documento<select aria-label="Tipo do documento">'+opts.tipos.map(t=>'<option>'+t+'</option>').join('')+'</select></label>':'';
 return '<div class="doc-capture"'+(opts.frenteVerso?' data-doc-sides':'')+'><div class="doc-capture-head"><span class="doc-capture-tile">'+svg(ICON.file)+'</span><div><strong>'+title+'</strong><p>'+help+'</p></div></div>'+tipos+'<div class="doc-capture-actions">'+btnHtml('camera')+btnHtml('file')+'<button type="button" class="btn secondary doc-capture-skip" hidden>Só a frente</button></div><p class="doc-capture-status" role="status"></p></div>'}
function create(title,help,opts){const t=document.createElement('template');t.innerHTML=markup(title,help,opts);return t.content.firstElementChild}
/* Texto da linha de estado e liga/desliga os dois botões. */
function estado(block,{texto,ativo=true}={}){const s=block.querySelector('.doc-capture-status');if(s&&texto!==undefined)s.textContent=texto+(block.dataset.docNext==='verso'&&!/verso/.test(texto)?' Agora o verso do documento.':'');block.querySelectorAll('[data-doc-pick]').forEach(b=>{b.disabled=!ativo})}
const tipo=block=>block.querySelector('.doc-capture-type select')?.value||'';
/* Volta o bloco ao estado normal (sem verso pendente). */
function zerarLado(block){delete block.dataset.docNext;const cam=block.querySelector('[data-doc-pick=camera]');if(cam)cam.lastChild.textContent=LABEL.camera;const skip=block.querySelector('.doc-capture-skip');if(skip)skip.hidden=true}
function pedirVerso(block){block.dataset.docNext='verso';block.querySelector('[data-doc-pick=camera]').lastChild.textContent='Tirar foto do verso';block.querySelector('.doc-capture-skip').hidden=false;estado(block,{texto:'Frente enviada. Agora o verso do documento.'})}
document.addEventListener('change',e=>{const t=e.target;if(t.matches&&t.matches('.doc-capture-type select'))zerarLado(t.closest('.doc-capture'))});
document.addEventListener('click',e=>{const skip=e.target.closest('.doc-capture-skip');if(skip){const bl=skip.closest('.doc-capture');zerarLado(bl);estado(bl,{texto:'Só a frente foi enviada.'});return}const b=e.target.closest('.doc-capture [data-doc-pick]');if(!b||b.disabled)return;const block=b.closest('.doc-capture'),source=b.dataset.docPick,input=document.createElement('input');input.type='file';input.accept=source==='camera'?'image/*':ACCEPT;if(source==='camera')input.setAttribute('capture','environment');
 input.onchange=()=>{const file=input.files&&input.files[0];if(!file)return;const duplo=source==='camera'&&block.hasAttribute('data-doc-sides'),side=!duplo?'unica':block.dataset.docNext==='verso'?'verso':'frente';
  if(side!=='frente')zerarLado(block);block.dispatchEvent(new CustomEvent('doc-capture',{bubbles:true,detail:{file,source,side,block}}));if(side==='frente')pedirVerso(block)};input.click()});
root.CicluzDocCapture={markup,create,botao,estado,tipo,ICON};
})(window);
