/* Ferramentas de Ocorrências: câmera do aparelho, impressão para assinatura física e assinatura eletrônica DEMONSTRATIVA (não certificada). Tudo local: nada é enviado a servidores. */
(()=>{
'use strict';
const U=window.CicluzUniformUI,G=window.CicluzGP;if(!U||!G)return;
const {el,dialog}=U;
const IC={clip:'m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8',camera:'M4 8h3l2-3h6l2 3h3v11H4zM12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',mic:'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',stop:'M7 7h10v10H7z',trash:'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',print:'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',pen:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',redo:'M4 12a8 8 0 1 0 3-6.2M4 4v4h4',ok:'m5 12 4 4L19 6',x:'M6 6l12 12M18 6 6 18',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'};

/* ---------- Câmera: pede permissão, mostra a imagem, captura, confere e só então devolve o arquivo ---------- */
function camera(onFile,fallback){
 if(!navigator.mediaDevices?.getUserMedia){fallback?.();return}
 const d=el('dialog','location-dialog profiles-dialog uniforms-dialog edit-panel');const msg=el('p','profiles-note');msg.setAttribute('role','status');
 const video=el('video','occ-camera-video');video.autoplay=true;video.playsInline=true;video.muted=true;const shot=el('img','occ-camera-shot');shot.hidden=true;shot.alt='Foto capturada';
 const tools=el('div','actions');let stream=null,blob=null;
 const stop=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null};
 const bShot=G.roundButton('Capturar',IC.camera,capture),bAgain=G.roundButton('Descartar e refazer',IC.redo,again),bUse=G.roundButton('Usar esta foto',IC.ok,use),bX=U.iconize(el('button'),'Cancelar',IC.x);bX.type='button';bX.addEventListener('click',()=>d.close());bAgain.hidden=bUse.hidden=true;
 tools.append(bX,bShot,bAgain,bUse);d.append(el('h2',null,'Usar câmera'),video,shot,msg,tools);document.body.append(d);d.onclose=()=>{stop();d.remove()};d.showModal();
 navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(s=>{if(!d.open){s.getTracks().forEach(t=>t.stop());return}stream=s;video.srcObject=s;msg.textContent='Enquadre o documento e toque em Capturar.'}).catch(()=>{d.close();if(fallback)fallback();else alert('Não foi possível acessar a câmera. Verifique a permissão do navegador ou escolha um arquivo.')});
 function capture(){if(!stream||!video.videoWidth){msg.textContent='A câmera ainda não está pronta.';return}const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);c.toBlob(b=>{if(!b){msg.textContent='Não foi possível capturar a imagem.';return}blob=b;shot.src=URL.createObjectURL(b);shot.hidden=false;video.hidden=true;bShot.hidden=true;bAgain.hidden=bUse.hidden=false;msg.textContent='Confira a imagem. Use a foto ou descarte para refazer.'},'image/jpeg',.9)}
 function again(){blob=null;if(shot.src)URL.revokeObjectURL(shot.src);shot.removeAttribute('src');shot.hidden=true;video.hidden=false;bShot.hidden=false;bAgain.hidden=bUse.hidden=true;msg.textContent='Enquadre o documento e toque em Capturar.'}
 function use(){if(!blob)return;const f=new File([blob],'foto-'+new Date().toISOString().slice(0,19).replace(/[-:T]/g,'')+'.jpg',{type:'image/jpeg'});d.close();onFile(f)}
}

/* ---------- Impressão para assinatura física ---------- */
function printDoc(title,rows,sig){
 const f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.append(f);
 const d=f.contentDocument;d.title=title;const body=d.body;body.style.cssText='font:14px/1.5 Arial,sans-serif;color:#111;margin:24px';
 const h=d.createElement('h1');h.style.cssText='font-size:20px;margin:0 0 4px';h.textContent=title;body.append(h);
 const sub=d.createElement('p');sub.style.cssText='margin:0 0 16px;color:#555';sub.textContent='Documento para assinatura física. Imprima, colete as assinaturas e anexe o documento assinado à ocorrência.';body.append(sub);
 const t=d.createElement('table');t.style.cssText='border-collapse:collapse;width:100%';for(const [k,v] of rows){const tr=d.createElement('tr'),a=d.createElement('td'),b=d.createElement('td');a.style.cssText='border:1px solid #bbb;padding:6px 8px;font-weight:700;width:34%;vertical-align:top';b.style.cssText='border:1px solid #bbb;padding:6px 8px;white-space:pre-wrap';a.textContent=k;b.textContent=v;tr.append(a,b);t.append(tr)}body.append(t);
 const sg=d.createElement('div');sg.style.cssText='display:flex;gap:40px;margin-top:56px';for(const who of ['Assinatura do colaborador','Assinatura da empresa']){const c=d.createElement('div');c.style.cssText='flex:1;border-top:1px solid #111;padding-top:4px;text-align:center;font-size:12px;position:relative';if(sig&&who.includes('colaborador')){const im=d.createElement('img');im.src=sig;im.alt='';im.style.cssText='position:absolute;left:50%;bottom:100%;transform:translateX(-50%);max-width:90%;max-height:70px';c.append(im)}c.append(d.createTextNode(who));sg.append(c)}body.append(sg);
 const clean=()=>setTimeout(()=>f.remove(),500);f.contentWindow.addEventListener('afterprint',clean);setTimeout(()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch{}},150);setTimeout(()=>f.remove(),120000)}

/* ---------- Assinatura eletrônica demonstrativa ---------- */
function signPad(onDone){
 dialog('Assinar eletronicamente (demonstrativa)',(field,form)=>{
  form.append(el('p','people-alert','Assinatura demonstrativa: um desenho feito nesta tela. Não é assinatura digital certificada e não tem validade jurídica automática.'));
  const c=document.createElement('canvas');c.width=520;c.height=180;c.className='occ-sign-pad';c.setAttribute('aria-label','Área para desenhar a assinatura');let drawing=false,dirty=false;const x=c.getContext('2d');x.lineWidth=2.2;x.lineCap='round';x.strokeStyle='#111';
  const pos=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
  c.addEventListener('pointerdown',e=>{drawing=true;c.setPointerCapture(e.pointerId);const [px,py]=pos(e);x.beginPath();x.moveTo(px,py);e.preventDefault()});
  c.addEventListener('pointermove',e=>{if(!drawing)return;const [px,py]=pos(e);x.lineTo(px,py);x.stroke();dirty=true});
  const end=()=>{drawing=false};c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
  const redo=G.roundButton('Refazer',IC.redo,()=>{x.clearRect(0,0,c.width,c.height);dirty=false});
  form.append(c,redo);return {c,isDirty:()=>dirty}},
  r=>{if(!r.isDirty())return 'Desenhe a assinatura antes de confirmar.';onDone(r.c.toDataURL('image/png'));return null},'Confirmar',()=>{})}

/* ---------- Botões para a visualização dos documentos de Ocorrências ---------- */
function docActions(title,rows){
 const box=el('div','occ-doc-actions');let sig=null;const tools=el('div','people-banner-tools'),show=el('div','occ-sign-view');show.hidden=true;
 const paint=()=>{show.replaceChildren();if(!sig){show.hidden=true;return}show.hidden=false;const im=el('img');im.src=sig;im.alt='Assinatura demonstrativa';im.className='occ-sign-img';show.append(el('b',null,'Assinatura demonstrativa registrada nesta visualização (não certificada, sem validade jurídica automática).'),im,G.roundButton('Remover assinatura',IC.trash,()=>{sig=null;paint()}))};
 tools.append(G.roundButton('Imprimir para assinatura física',IC.print,()=>printDoc(title,rows,sig)),G.roundButton('Assinar eletronicamente (demonstrativa)',IC.pen,()=>signPad(s=>{sig=s;paint()})));
 box.append(tools,show);return box}
window.CicluzOccTools={camera,printDoc,signPad,docActions,ICON:IC};
})();
