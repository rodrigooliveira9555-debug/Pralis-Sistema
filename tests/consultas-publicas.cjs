// Consultas públicas de CNPJ e CEP (dist/consultas-publicas.js): só as partes puras, sem rede.
// Rodar: node tests/consultas-publicas.cjs. Os dados abaixo são fictícios, no formato das respostas do serviço.
const assert = require('node:assert/strict');
const c = require('../dist/consultas-publicas.js');
let n = 0;
const ok = (fn) => { fn(); n++; };

ok(() => {
  assert.equal(c.cepMask('01001000'), '01001-000');
  assert.equal(c.cepMask('0100'), '0100');
  assert.equal(c.cepMask('01001-0009'), '01001-000');
});
ok(() => {
  const r = c.normalizarCnpj({
    razao_social: '  EMPRESA  EXEMPLO LTDA ', nome_fantasia: 'EXEMPLO', cep: '01001000', descricao_tipo_de_logradouro: 'RUA',
    logradouro: 'DAS FLORES', numero: '100', complemento: 'SALA 2', bairro: 'CENTRO', municipio: 'SAO PAULO', uf: 'sp',
  });
  assert.deepEqual(r, { razaoSocial: 'EMPRESA EXEMPLO LTDA', nomeFantasia: 'EXEMPLO', endereco: { cep: '01001-000', logradouro: 'RUA DAS FLORES', numero: '100', complemento: 'SALA 2', bairro: 'CENTRO', cidade: 'SAO PAULO', uf: 'SP' } });
});
ok(() => {
  // Não repete o tipo quando a rua já vem com ele; campo que não veio fica vazio; UF desconhecida é descartada.
  const r = c.normalizarCnpj({ razao_social: 'X', descricao_tipo_de_logradouro: 'AVENIDA', logradouro: 'AVENIDA BRASIL', uf: 'XX' });
  assert.equal(r.endereco.logradouro, 'AVENIDA BRASIL');
  assert.deepEqual([r.nomeFantasia, r.endereco.cep, r.endereco.numero, r.endereco.uf], ['', '', '', '']);
  assert.equal(c.normalizarCnpj(null), null);
});
ok(() => {
  assert.deepEqual(c.normalizarCep({ cep: '01001000', state: 'SP', city: 'São Paulo', neighborhood: 'Sé', street: 'Praça da Sé' }), { cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', uf: 'SP' });
  assert.deepEqual(c.normalizarCep({ cep: '12345678' }), { cep: '12345-678', logradouro: '', bairro: '', cidade: '', uf: '' });
  assert.equal(c.normalizarCep('texto'), null);
});
ok(() => assert.equal(c.UFS.length, 27));

(async () => {
  // Número incompleto não chega a sair para a rede.
  assert.deepEqual(await c.cnpj('123'), { erro: 'invalido' });
  assert.deepEqual(await c.cep('0100'), { erro: 'invalido' });
  n++;
  console.log('consultas-publicas: ' + n + ' grupos de verificação ok');
})();
