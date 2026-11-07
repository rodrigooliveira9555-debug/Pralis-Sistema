/* Reads name, CPF and birth date from the text of an RG, CPF card or CNH photo. A field is returned only when its own label or a valid CPF is found; nothing is guessed. */
(function(root){
'use strict';
const pad=n=>String(n).padStart(2,'0');
const fold=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
function cpfValid(v){const d=String(v).replace(/\D/g,'');if(d.length!==11||/^(\d)\1{10}$/.test(d))return false;for(let n=9;n<=10;n++){let sum=0;for(let i=0;i<n;i++)sum+=+d[i]*(n+1-i);if((sum*10%11)%10!==+d[n])return false}return true}
function validISO(y,m,d){const leap=y%4===0&&(y%100!==0||y%400===0);return y>=1900&&y<=new Date().getFullYear()&&m>=1&&m<=12&&d>=1&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1]}
function dateIn(text){for(const m of String(text).matchAll(/\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})\b/g)){if(validISO(+m[3],+m[2],+m[1]))return m[3]+'-'+pad(m[2])+'-'+pad(m[1])}return ''}
const NOT_NAME=/\b(filiacao|registro|nascimento|documento|identidade|republica|federativa|brasil|carteira|nacional|habilitacao|validade|categoria|expedicao|emissor|naturalidade|assinatura|pai|mae|cpf|secretaria|ministerio|detran|permiso|permissao|observacoes|social)\b/;
const CONNECTORS=new Set(['da','de','do','das','dos','e']);
function titleCase(s){return s.toLowerCase().split(/\s+/).map((w,i)=>i&&CONNECTORS.has(w)?w:w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
function asName(raw){const s=String(raw||'').replace(/[^A-Za-zÀ-ÿ' ]/g,' ').replace(/\s+/g,' ').trim();const words=s.split(' ').filter(w=>w.length>1||CONNECTORS.has(w.toLowerCase()));if(words.length<2||s.length<5||s.length>80||NOT_NAME.test(fold(s)))return '';if(s!==s.toUpperCase()&&!/^[A-ZÀ-Ý]/.test(s))return '';return titleCase(words.join(' '))}
function extract(text){const lines=String(text||'').replace(/\r/g,'').split('\n').map(l=>l.replace(/[ \t]+/g,' ').trim()).filter(Boolean),out={};
 for(const m of lines.join('\n').matchAll(/(?<!\d)(\d{3})\s?[.,]?\s?(\d{3})\s?[.,]?\s?(\d{3})\s?[-–.]?\s?(\d{2})(?!\d)/g)){const d=m[1]+m[2]+m[3]+m[4];if(cpfValid(d)){out.cpf=d;break}}
 for(let i=0;i<lines.length;i++){if(/nasc/.test(fold(lines[i]))){const iso=dateIn(lines[i])||dateIn(lines[i+1]||'');if(iso){out.birth=iso;break}}}
 for(let i=0;i<lines.length;i++){const m=/^nome(?!\s+(?:social|d[oa]\b))\b\s*[:\-]?\s*(.*)$/i.exec(lines[i]);if(!m)continue;const rest=asName(m[1])||asName(lines[i+1]);if(rest){out.name=rest;break}}
 return out}
const api={extract,cpfValid};
if(typeof module!=='undefined')module.exports=api;
root.CicluzIdentityReader=api;
})(typeof window!=='undefined'?window:globalThis);
