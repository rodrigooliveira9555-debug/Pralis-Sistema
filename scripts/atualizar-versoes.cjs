// Atualiza ?v= (12 hex do SHA-256 do conteúdo com finais LF) dos assets citados em dist/index.html e dist/rodada.html.
// Rodar depois de alterar qualquer .js/.css: npm run versoes
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dist=path.resolve(__dirname,'..','dist');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(dist,f),'utf8').replace(/\r\n/g,'\n')).digest('hex').slice(0,12);
for(const page of ['index.html','rodada.html']){
  const p=path.join(dist,page);let s=fs.readFileSync(p,'utf8');let n=0;
  s=s.replace(/(src|href)="((?:[a-z0-9-]+\/)?[a-z0-9-]+\.(?:js|css))\?v=([a-z0-9]+)"/g,(m,a,f,v)=>{const h=hash(f);if(h!==v){n++;console.log(page,f,v,'->',h)}return a+'="'+f+'?v='+h+'"'});
  fs.writeFileSync(p,s);console.log(page,n,'atualizados');
}
