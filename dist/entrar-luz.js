// Luz da marca na tela de entrada: logomarca, faixa colorida e símbolo do rodapé, com o mesmo motor
// do menu principal (marca-luz.js). Sem o motor ou sem SVG, a tela continua legível com as imagens.
(()=>{
 const luz=window.CicluzLuz;if(!luz)return;
 const {svgNS,addBeam,FITA}=luz,ARTE='cicluz-gestao-padaria-logo.png';
 const criar=(classe,viewBox,miolo)=>{const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('class',classe);svg.setAttribute('viewBox',viewBox);svg.setAttribute('aria-hidden','true');if(miolo)svg.innerHTML=miolo;return svg};
 const mascara=id=>'<defs><mask id="'+id+'" maskUnits="userSpaceOnUse" x="0" y="0" width="177.6" height="64" style="mask-type:alpha"><image href="'+ARTE+'" width="177.6" height="64" preserveAspectRatio="none"/></mask></defs>';

 const logo=document.querySelector('.entrada-logo');
 if(logo){const svg=criar('entrada-luz','0 0 177.6 64',mascara('entrada-logo-alfa'));logo.append(svg);addBeam(svg,FITA,'url(#entrada-logo-alfa)')}

 const faixa=document.querySelector('.entrada-faixa');
 if(faixa){
  const svg=criar('entrada-luz','0 0 100 3');faixa.append(svg);
  const trilha=addBeam(svg,'M 0 1.5 H 100');
  const ajustar=()=>{const largura=faixa.clientWidth;if(!largura)return;svg.setAttribute('viewBox','0 0 '+largura+' 3');trilha.layers.forEach(({path})=>path.setAttribute('d','M 0 1.5 H '+largura));trilha.length=largura};
  new ResizeObserver(ajustar).observe(faixa);ajustar();
 }

 const simbolo=document.querySelector('.entrada-simbolo');
 if(simbolo){
  const svg=criar('entrada-luz','10 6 42 44',mascara('entrada-simbolo-alfa'));
  const arte=document.createElementNS(svgNS,'image');arte.setAttribute('href',ARTE);arte.setAttribute('width','177.6');arte.setAttribute('height','64');arte.setAttribute('preserveAspectRatio','none');svg.append(arte);
  simbolo.replaceChildren(svg);addBeam(svg,FITA,'url(#entrada-simbolo-alfa)');
 }
})();
