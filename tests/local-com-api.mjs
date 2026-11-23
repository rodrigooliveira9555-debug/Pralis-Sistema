// Revisão local COM a API (o cadastro de produtos grava no servidor): sobe Postgres limpo + API + site e mostra
// o endereço e um login de administrador fictício. Precisa do Docker. Rodar: npm run local:api  (Ctrl+C para parar)
import { iniciarApi } from './servidor-api.mjs';

const api = await iniciarApi();
console.log('\nS2 local com a API no ar:');
console.log('  Endereço: ' + api.url + '/entrar.html');
console.log('  E-mail:   ' + api.email);
console.log('  Senha:    ' + api.senha);
console.log('Na primeira entrada, confirme a importação inicial (empresa nova, vazia). Ctrl+C para parar.\n');
process.on('SIGINT', () => { api.parar(); setTimeout(() => process.exit(0), 500); });
setInterval(() => {}, 1 << 30);
