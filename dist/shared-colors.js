(()=>{
const key='cicluz-custom-colors-v1',legacy='cicluz-location-custom-colors-v1',valid=x=>/^#[0-9a-f]{6}$/i.test(x);const mounted=new Map();
function read(k=key){try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v.filter(valid).map(x=>x.toLowerCase()):[]}catch{return []}}
function write(values){const all=[...new Set(values)];try{localStorage.setItem(key,JSON.stringify(all))}catch{}return all}
write([...read(),...read(legacy)]);
function remember(v){if(valid(v)){write([...read(),v.toLowerCase()]);paint()}}
function paint(){for(const [input,box]of mounted){if(!input.isConnected){mounted.delete(input);continue}const pool=box.lastElementChild;pool.replaceChildren();const colors=read();if(!colors.length){const hint=document.createElement('small');hint.textContent='As cores personalizadas usadas aparecem aqui.';pool.append(hint)}for(const color of colors){const b=document.createElement('button');b.type='button';b.style.background=color;b.title=color;b.setAttribute('aria-label','Usar minha cor '+color);b.onclick=()=>{input.value=color;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))};pool.append(b)}}}
function scan(){let changed=false;document.querySelectorAll('input[type=color]').forEach(input=>{if(input.closest('.location-dialog')||mounted.has(input))return;const box=document.createElement('div');box.className='shared-color-history';const title=document.createElement('span');title.textContent='Minhas cores';box.append(title,document.createElement('div'));input.parentElement.append(box);mounted.set(input,box);changed=true});if(changed)paint()}
document.addEventListener('change',e=>{if(e.target.matches('input[type=color]'))remember(e.target.value)});
window.addEventListener('storage',e=>{if(e.key===key)paint()});
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&!n.closest?.('.shared-color-history'))))scan()}).observe(document.body,{childList:true,subtree:true});scan();
})();
