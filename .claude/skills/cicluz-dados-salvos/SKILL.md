---
name: cicluz-dados-salvos
description: Como mudar com segurança qualquer coisa que o CICLUZ guarda no localStorage (grupos financeiros, contas, cargos, salários, locais, organograma, cadastro completo, ícones, cores). Use sempre que uma mudança alterar formato, chave, ID, seed ou flag de importação, ou quando o pedido for "exportar", "importar", "backup", "levar os dados para o servidor". Evita apagar o que o Rodrigo já digitou no iPad.
---

# Dados salvos no navegador — CICLUZ

Os dados reais do projeto vivem **só no navegador do aparelho** (prefixo `cicluz-`). Não há backup.
Uma chave renomeada ou um seed reaplicado apaga semanas de cadastro.

## Antes de mudar
1. Liste as chaves tocadas (ver `PROJECT_BRAIN/04_DADOS_E_CODIGO.md`).
2. Mudança de formato? Então ela precisa de **chave/flag nova** (`…-v2`).
3. Se o pedido muda um **ID** ou o vínculo por ID (bandeira→tipo de venda, taxa→grupo,
   posição→cargo), pare e pergunte: IDs são a identidade, nomes não.

## Padrão de migração (obrigatório)
```js
// 1. lê o formato antigo sem apagar
const antigo = lerJSON('cicluz-xxx-v1');
// 2. só migra uma vez
if (antigo && !localStorage.getItem('cicluz-xxx-v2')) {
  const novo = migrar(antigo);          // função pura, testável em tests/*.cjs
  localStorage.setItem('cicluz-xxx-v2', JSON.stringify(novo));
  // 3. a v1 continua lá até a v2 estar comprovada em uso (remover em entrega separada)
}
```
- `migrar` é **pura** e tem teste em `tests/` com um exemplo do formato antigo.
- Nunca reaplicar seed por cima de dado do usuário: seed só preenche quando a chave **não existe**.
- Toda leitura com `try/catch` (Safari privado pode bloquear storage) e fallback seguro.

## Exportar antes de mudanças grandes
Antes de qualquer mudança de formato em massa, oferecer ao Rodrigo exportar um JSON com todas as
chaves `cicluz-*` (sem enviar para lugar nenhum) e guardar o arquivo.

## Importar (para backend futuro)
- Validar forma e tipos antes de gravar (rejeitar o arquivo inteiro se inválido).
- Importação **idempotente**: rodar duas vezes não duplica (usar o `id` de origem).
- Nunca registrar CPF ou dado de pessoa em log.

## Conferir
Abrir a tela com um `localStorage` no formato antigo e confirmar: mesmos registros, mesma ordem,
flag nova presente, nada perdido.
