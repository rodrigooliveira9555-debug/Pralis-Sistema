/* Local document reading for occurrences: OCR (Tesseract.js) and PDF text/rendering (pdf.js), both served from vendor/. Nothing leaves the browser. */
(function(root){
'use strict';
const UF=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const MONTHS=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const WORDS={um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,quatorze:14,catorze:14,quinze:15,vinte:20,trinta:30};
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const pad=n=>String(n).padStart(2,'0');
function validISO(y,m,d){const leap=y%4===0&&(y%100!==0||y%400===0);return y>=1900&&y<=2100&&m>=1&&m<=12&&d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]}

/* Each field is accepted only when its own label appears in the text; nothing is guessed. */
function extract(text){const lines=String(text||'').replace(/\r/g,'').split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).filter(Boolean),all=lines.join('\n'),out={};
 /* CID-10: letter + two digits (+ optional subcategory). OCR often reads 0 as O and 1 as I/l, and may double the O after the letter. */
 const cidRaw=/\bC\.?\s?I\.?\s?D\.?(?:\s*-?\s*10)?\s*(?:n[º°o.]*)?\s*[:\-–º°.]*\s*([A-TV-Z])\s?([0-9OoIl]{2,3})(?:\s?[.,]\s?([0-9OoIl]{1,2}))?(?![0-9A-Za-z])/i.exec(all);
 if(cidRaw){const dig=v=>v.replace(/[Oo]/g,'0').replace(/[Il]/g,'1');let main=cidRaw[2];if(main.length===3&&/^[Oo]/.test(main))main=main.slice(1);main=dig(main);if(/^\d{2}$/.test(main))out.cid=cidRaw[1].toUpperCase()+main+(cidRaw[3]?'.'+dig(cidRaw[3]):'')}
 const crm=/\bCRM\s*[-\/:.]?\s*(?:([A-Z]{2})\s*[-\/:.]?\s*)?(?:n[º°o.]*\s*)?(\d[\d.]{2,8}\d)(?:\s*[-\/]\s*([A-Z]{2})\b)?/i.exec(all);
 if(crm){const uf=(crm[1]||crm[3]||'').toUpperCase();out.crm=crm[2].replace(/\./g,'')+(UF.includes(uf)?'-'+uf:'')}
 /* Connectors (da, de, e…) must be whole words so they never swallow the initial of the next name. */
 const name='([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÿ\']+(?:\\s+(?:(?:d[aeo]s?|e)(?=\\s)|[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-zÀ-ÿ\'.]*)){1,6})';
 const doctor=new RegExp('\\b(?:Dra?\\.|Dra?\\b|Doutora?)\\s*'+name).exec(all)||new RegExp('\\b[Mm][ée]dic[oa](?:\\s+[Rr]espons[áa]vel)?\\s*:\\s*'+name).exec(all);if(doctor)out.doctor=doctor[1].replace(/\s+(d[aeo]s?|e)$/i,'').replace(/\s*\bCRM\b.*$/i,'').trim();
 const clinic=lines.find(l=>/\b(cl[ií]nica|hospital|posto de sa[uú]de|policl[ií]nica|unidade b[aá]sica|ubs|upa|pronto[- ]socorro|pronto atendimento|santa casa|centro m[eé]dico|consult[oó]rio|laborat[oó]rio)\b/i.test(l));if(clinic)out.clinic=clinic.slice(0,120);
 let date=null;for(const m of all.matchAll(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})\b/g)){let y=+m[3];if(m[3].length===2)y+=y<50?2000:1900;if(validISO(y,+m[2],+m[1])){date=y+'-'+pad(m[2])+'-'+pad(m[1]);break}}
 if(!date){const m=new RegExp('\\b(\\d{1,2})\\s+de\\s+('+MONTHS.join('|')+')\\s+de\\s+(\\d{4})').exec(fold(all));if(m){const mo=MONTHS.indexOf(m[2])+1;if(validISO(+m[3],mo,+m[1]))date=m[3]+'-'+pad(mo)+'-'+pad(m[1])}}
 if(date)out.date=date;
 /* Days: prefer a line about leave/rest; accept digits or written numbers right before "dia(s)". */
 const dayPattern=/\b(\d{1,3}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|vinte|trinta)\s*(?:\([^)]{0,20}\)\s*)?dias?\b/;
 const folded=lines.map(fold),ranked=[...folded.filter(l=>/afast|repouso|ausent|licenca/.test(l)),...folded];
 for(const l of ranked){const m=dayPattern.exec(l);if(m){const n=/^\d+$/.test(m[1])?+m[1]:WORDS[m[1]];if(n>=1&&n<=365){out.days=n;break}}}
 return out}

/* Lazy, local-only loading of the reading libraries. */
const base=()=>new URL('vendor/',document.baseURI).href;
const scripts=new Map();
function loadScript(src){if(!scripts.has(src))scripts.set(src,new Promise((ok,fail)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{scripts.delete(src);fail(Error('script'))};document.head.append(s)}));return scripts.get(src)}
let worker=null,progressHandler=null;
async function ocrWorker(){if(worker)return worker;await loadScript(base()+'tesseract/tesseract.min.js');const v=base()+'tesseract/';
 worker=root.Tesseract.createWorker('por',1,{workerPath:v+'worker.min.js',corePath:v,langPath:v+'lang',gzip:true,logger:m=>{if(progressHandler&&m.status==='recognizing text')progressHandler(Math.round(m.progress*100))}}).catch(e=>{worker=null;throw e});return worker}
async function pdfLib(){await loadScript(base()+'pdfjs/pdf.min.js');const lib=root.pdfjsLib;lib.GlobalWorkerOptions.workerSrc=base()+'pdfjs/pdf.worker.min.js';return lib}
/* Returns {text, method}; method says how the text was obtained so the screen can explain it. */
async function read(file,onProgress=()=>{}){progressHandler=onProgress;try{
 if(file.type==='application/pdf'){const lib=await pdfLib(),pdf=await lib.getDocument({data:await file.arrayBuffer()}).promise;let text='';for(let i=1;i<=Math.min(pdf.numPages,3);i++){const page=await pdf.getPage(i),content=await page.getTextContent();let line='',lastY=null;for(const item of content.items){const y=item.transform?.[5];if(lastY!==null&&Math.abs(y-lastY)>2){text+=line+'\n';line=''}line+=(line?' ':'')+item.str;lastY=y}text+=line+'\n'}
  if(text.replace(/\s/g,'').length>=40)return {text,method:'pdf-text'};
  const page=await pdf.getPage(1),viewport=page.getViewport({scale:2}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const w=await ocrWorker(),r=await w.recognize(canvas);canvas.width=canvas.height=0;return {text:r.data.text,method:'pdf-ocr'}}
 const w=await ocrWorker(),r=await w.recognize(file);return {text:r.data.text,method:'ocr'}}finally{progressHandler=null}}
const api={UF,extract,read};
if(typeof module!=='undefined')module.exports=api;
root.CicluzOccurrenceReader=api;
})(typeof window!=='undefined'?window:globalThis);
