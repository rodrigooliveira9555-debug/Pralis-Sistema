// Luz que percorre a marca, a faixa colorida e o símbolo. Motor único: o menu principal
// (navigation-layout.js) e a tela de entrada (entrar-luz.js) usam o mesmo perfil, a mesma espessura,
// o mesmo relógio e a mesma velocidade em pixels.
(()=>{
 const svgNS='http://www.w3.org/2000/svg';
 const beamProfile=[[42,.08,5.4],[34,.16,5.7],[26,.28,6],[18,.48,6.3],[12,.88,6.6]];
 // Eixo da fita do símbolo, nas coordenadas da arte cicluz-gestao-padaria-logo.png (177,6 × 64).
 const FITA='M 25.7 16 C 25.7 6.8 37.2 6.8 37.2 16 L 37.2 19 C 44 13.6 49.7 15.1 49.3 22.2 C 49 25.2 46.4 27 43 28.8 L 20 41 C 13.4 44.5 9.2 37.4 15.2 32.1 L 18.3 29.2 C 8.2 23.4 12.3 12.9 19.3 16.3 L 43 29.1 C 52.7 34.5 49.3 44 42.5 41.6 L 37.2 39 C 37.2 50.7 25.7 50.7 25.7 41 L 25.7 16 Z';
 const beamTracks=[];
 function addBeam(svg,d,mask){
  const group=document.createElementNS(svgNS,'g');
  if(mask)group.setAttribute('mask',mask);
  svg.append(group);
  const layers=beamProfile.map(([size,opacity,width])=>{
   const path=document.createElementNS(svgNS,'path');
   for(const [key,value] of Object.entries({d,fill:'none',stroke:'#fff','stroke-width':width,'stroke-opacity':opacity,'stroke-linecap':'butt'}))path.setAttribute(key,value);
   group.append(path);return {path,size};
  });
  const track={svg,layers,length:layers[0].path.getTotalLength()};beamTracks.push(track);return track;
 }
 const reducedMotion=matchMedia('(prefers-reduced-motion:reduce)');
 const start=performance.now();let lastFrame=0;
 function animateBeam(now){
  if(now-lastFrame>30){
   lastFrame=now;
   for(const track of beamTracks){
    const distance=((now-start)/1000*24)%Math.max(1,track.length);
    for(const {path,size} of track.layers){
     path.style.display=reducedMotion.matches?'none':'';
     const length=Math.min(size,track.length*.8);
     path.setAttribute('stroke-dasharray',length+' '+Math.max(0,track.length-length));
     path.setAttribute('stroke-dashoffset',String(-distance+length/2));
    }
   }
  }
  requestAnimationFrame(animateBeam);
 }
 requestAnimationFrame(animateBeam);
 window.CicluzLuz={svgNS,addBeam,FITA};
})();
