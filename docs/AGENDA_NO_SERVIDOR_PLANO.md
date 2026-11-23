# Agenda no servidor — plano para aprovação (Zé; Marco de acordo)

> **Status (23/11/2026): Entrega A concluída (A2–A7, servidor e testes); Entrega B (tela) em andamento.** Na Entrega A,
> escolhas de detalhe feitas seguindo as propostas da seção 9: lista visível para membro, dona, administrador ou quem vê
> algum compromisso dela; criar compromisso exige ser membro ou dona da lista; mudar a ordenação da lista é da dona ou do
> administrador; compromisso criado por id que não é conta fica com o gestor escolhido para os "sem criador" (o id antigo
> vai para `legado`); colunas com nome repetido no documento ganham " (2)" (como as listas).
> A2 feito: a regra está em `servidor/shared/src/agenda/regras.ts`,
> com a cópia gerada `dist/agenda/regras.js` (ainda não carregada pela tela; isso é a Entrega B), e o servidor usa essa
> regra no chat e nos arquivos (`acessoAgenda` saiu). A3 feito: **SQL aprovado pelo Zé em 23/11/2026**; o arquivo é
> `servidor/db/migrations/0007_agenda_tabelas.sql` (gerado pelo drizzle-kit; o índice de `perfis_usuarios` foi posto
> no começo e o trigger no fim, à mão). O bloco SQL abaixo é a proposta original; **vale o arquivo**. Diferença aprovada:
> a cópia concluída de uma repetição **pode ser reaberta**, como hoje na tela (`agenda_compromissos_copia_check` só
> exige que a cópia não repita).
> Responde à P-45 item 1 (doc 11) e fecha G1, G4, G5, M2, M3 e M4 da `docs/REVISAO_AGENDA_2026-11-23.md` e o DT-15.
> Modelo seguido: `docs/PRODUTOS_NO_SERVIDOR_PLANO.md` (tabela + API + transferência com conclusão só se tudo chegou).

## 0. Resumo em uma frase por parte

| Parte | O que muda para quem usa |
|---|---|
| Tabelas | Cada compromisso passa a ser um registro próprio no servidor; ninguém mais consegue "se pôr" num compromisso mexendo no arquivo. |
| API | O aparelho só recebe o que a pessoa pode ver; dois aparelhos só brigam se mexerem **no mesmo** compromisso. |
| Transferência | Tudo o que já existe vai para as tabelas uma vez, com conferência de contagem; o arquivo antigo fica guardado. |
| Tela | A Agenda fica igual por fora; por dentro passa a falar com o servidor. Sem internet, mostra a última cópia (proposta: só para ver). |
| Testes | Testes com banco de verdade provam que documento forjado não dá acesso, que duplo toque não duplica e que nota não muda. |

## 1. Por que (resumo da revisão de 23/11)

- **G1:** o servidor decide quem vê chat e arquivos lendo `cicluz-agenda-v1`, que qualquer usuário logado regrava pelo
  `PUT /api/documentos` (`servidor/api/src/agenda/agenda.service.ts:19-41`). Basta pôr o próprio id em `criadoPor`.
- **G4:** a Agenda inteira tem **uma** versão; dois aparelhos ao mesmo tempo = um perde a alteração.
- **G5:** avaliações e permissões só valem na tela; o documento, com as notas e comentários, vai para todos os aparelhos.
- A regra "quem pode o quê" está escrita duas vezes, e diferente: `dist/agenda/dominio.js:377` (`acesso`, com
  concluir/excluir) e `servidor/shared/src/agenda.ts:43` (`acessoAgenda`, sem concluir/excluir).

## 2. Tabelas (migration `0007_agenda_tabelas.sql`)

**Para quem usa:** nada muda na aparência. Muda que o banco passa a recusar sozinho o que a regra não deixa: cor com
código (G2), nota alterada, pessoa de outra empresa, duas cópias da mesma ocorrência concluída.

Decisões de modelo:
- **Ids em texto, os mesmos de hoje** (`ag-<uuid>`, `lista-…`, `col-…`, `rel-…`, `sub-…`), com a mesma regra do
  `compromissoIdSchema` (`^[A-Za-z0-9_-]{1,100}$`). Chat e arquivos da 0003 continuam valendo sem mudar nada.
- **Empresa em toda chave** (`primary key (empresa_id, id)`) e toda ligação inclui `empresa_id`: um compromisso nunca
  aponta para grupo, pessoa ou coluna de outra empresa.
- **Pessoa = conta da mesma empresa:** a 0007 cria um índice único `perfis_usuarios (empresa_id, usuario_id)` só para
  permitir a ligação composta. Ids da lista provisória (`u-jose`, `u-rodrigo`, `u-ana`, de `dist/compras/dados.js:24`)
  **não são contas** e não entram como pessoa (ver transferência, seção 4).
- **Excluir = esconder** (`excluido_em`): o compromisso some das telas, mas avaliações, chat e arquivos ficam no banco
  até o Rodrigo decidir o destino (perguntas 4 e 5 da revisão). Nada é apagado de verdade pela API.
- **Coluna própria** para o que filtra, confere permissão ou tem regra; `jsonb` só para subtarefas (lista pequena, sempre
  lida e gravada junto com o compromisso) e para `legado` (o que veio do documento e não tem lugar: nada se perde).
- **Versão por compromisso** (`versao`), como em `produtos`: gravação com versão velha é recusada só para aquele
  compromisso.
- **Ordem manual fracionária** (`ordem numeric`): arrastar um cartão muda **um** registro (fica entre os vizinhos), em vez
  de renumerar a lista inteira como `dist/agenda/dados.js:301-312` faz hoje (o que geraria conflito em todos).
- **Gestor** = `gestor_id` (é o `criadoPor` da tela). `criado_por` é a auditoria de quem gravou a linha.

### SQL proposto (aguardando aprovação)

```sql
-- 0007_agenda_tabelas.sql — PROPOSTA, NÃO APLICADA.

-- Permite ligar "pessoa da agenda" a "conta da MESMA empresa" (usuario_id já é único; isto só cria o par).
CREATE UNIQUE INDEX "perfis_usuarios_empresa_usuario_uq" ON "perfis_usuarios" ("empresa_id", "usuario_id");

-- Contador por empresa: sobe a cada gravação da Agenda. A tela pergunta "mudou algo?" sem baixar tudo (ETag).
CREATE TABLE "agenda_estado" (
  "empresa_id" uuid PRIMARY KEY REFERENCES "empresas"("id"),
  "versao"     bigint NOT NULL DEFAULT 0 CHECK ("versao" >= 0)
);

-- 1. Grupos (as "Minhas listas", P-45 item 2)
CREATE TABLE "agenda_grupos" (
  "empresa_id"     uuid        NOT NULL REFERENCES "empresas"("id"),
  "id"             text        NOT NULL,
  "nome"           text        NOT NULL,
  "cor"            text        NOT NULL,
  "icone"          text        NOT NULL DEFAULT 'lista',
  "ordenacao"      text        NOT NULL DEFAULT 'manual',
  "ordem"          integer     NOT NULL DEFAULT 0,
  "dono_id"        text        NOT NULL,
  "excluido_em"    timestamptz,
  "excluido_por"   text        REFERENCES "user"("id"),
  "versao"         integer     NOT NULL DEFAULT 1,
  "criado_em"      timestamptz NOT NULL DEFAULT now(),
  "criado_por"     text        NOT NULL REFERENCES "user"("id"),
  "atualizado_em"  timestamptz NOT NULL DEFAULT now(),
  "atualizado_por" text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_grupos_pk" PRIMARY KEY ("empresa_id", "id"),
  CONSTRAINT "agenda_grupos_dono_fk" FOREIGN KEY ("empresa_id", "dono_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id"),
  CONSTRAINT "agenda_grupos_id_check" CHECK ("id" ~ '^[A-Za-z0-9_-]{1,100}$'),
  CONSTRAINT "agenda_grupos_nome_check" CHECK (char_length(btrim("nome")) BETWEEN 1 AND 40),
  CONSTRAINT "agenda_grupos_cor_check" CHECK ("cor" ~ '^#[0-9a-fA-F]{6}$'),          -- fecha G2 no banco
  CONSTRAINT "agenda_grupos_icone_check" CHECK ("icone" ~ '^[a-z0-9-]{1,30}$'),
  CONSTRAINT "agenda_grupos_ordenacao_check" CHECK ("ordenacao" IN ('manual', 'data', 'criacao', 'prioridade', 'titulo')),
  CONSTRAINT "agenda_grupos_versao_check" CHECK ("versao" >= 1),
  CONSTRAINT "agenda_grupos_excluido_check" CHECK (("excluido_em" IS NULL) = ("excluido_por" IS NULL))
);
CREATE UNIQUE INDEX "agenda_grupos_nome_uq" ON "agenda_grupos" ("empresa_id", lower(btrim("nome"))) WHERE "excluido_em" IS NULL;

-- Membros do grupo. Modelo para "escolhido à mão" (pergunta P-45 (a) em aberto; ver seção 7).
CREATE TABLE "agenda_grupo_membros" (
  "empresa_id"  uuid        NOT NULL,
  "grupo_id"    text        NOT NULL,
  "usuario_id"  text        NOT NULL,
  "origem"      text        NOT NULL DEFAULT 'manual',
  "criado_em"   timestamptz NOT NULL DEFAULT now(),
  "criado_por"  text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_grupo_membros_pk" PRIMARY KEY ("empresa_id", "grupo_id", "usuario_id"),
  CONSTRAINT "agenda_grupo_membros_grupo_fk" FOREIGN KEY ("empresa_id", "grupo_id") REFERENCES "agenda_grupos"("empresa_id", "id"),
  CONSTRAINT "agenda_grupo_membros_usuario_fk" FOREIGN KEY ("empresa_id", "usuario_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id"),
  CONSTRAINT "agenda_grupo_membros_origem_check" CHECK ("origem" IN ('manual', 'transferencia'))
);
CREATE INDEX "agenda_grupo_membros_usuario_idx" ON "agenda_grupo_membros" ("empresa_id", "usuario_id");

-- 2. Colunas do Kanban (hoje valem para a empresa toda; "Concluído" é fixa e não é linha).
CREATE TABLE "agenda_colunas" (
  "empresa_id"     uuid        NOT NULL REFERENCES "empresas"("id"),
  "id"             text        NOT NULL,
  "nome"           text        NOT NULL,
  "ordem"          integer     NOT NULL DEFAULT 0,
  "criado_em"      timestamptz NOT NULL DEFAULT now(),
  "criado_por"     text        NOT NULL REFERENCES "user"("id"),
  "atualizado_em"  timestamptz NOT NULL DEFAULT now(),
  "atualizado_por" text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_colunas_pk" PRIMARY KEY ("empresa_id", "id"),
  CONSTRAINT "agenda_colunas_id_check" CHECK ("id" ~ '^[A-Za-z0-9_-]{1,100}$' AND "id" <> 'concluido'),
  CONSTRAINT "agenda_colunas_nome_check" CHECK (char_length(btrim("nome")) BETWEEN 1 AND 30 AND lower(btrim("nome")) <> 'concluído')
);
CREATE UNIQUE INDEX "agenda_colunas_nome_uq" ON "agenda_colunas" ("empresa_id", lower(btrim("nome")));

-- 3. Compromissos (um registro por compromisso; campos de dist/agenda/dominio.js:5-16)
CREATE TABLE "agenda_compromissos" (
  "empresa_id"            uuid        NOT NULL REFERENCES "empresas"("id"),
  "id"                    text        NOT NULL,
  "grupo_id"              text        NOT NULL,
  "gestor_id"             text        NOT NULL,                 -- = criadoPor da tela
  "sem_criador_original"  boolean     NOT NULL DEFAULT false,   -- veio do documento sem criadoPor (seção 4)
  "titulo"                text        NOT NULL,
  "notas"                 text        NOT NULL DEFAULT '',
  "url"                   text        NOT NULL DEFAULT '',
  "local"                 text        NOT NULL DEFAULT '',
  "local_lat"             numeric(9,6),
  "local_lng"             numeric(9,6),
  "local_aviso"           text        NOT NULL DEFAULT '',
  "local_raio"            integer,
  "data"                  date,
  "hora"                  text,                                 -- 'HH:MM', como a tela
  "hora_fim"              text,
  "repeticao_tipo"        text,                                 -- nulo = não repete
  "repeticao_intervalo"   smallint    NOT NULL DEFAULT 1,
  "repeticao_unidade"     text        NOT NULL DEFAULT 'semana',
  "repeticao_dias_semana" smallint[]  NOT NULL DEFAULT '{}',
  "repeticao_fim_tipo"    text        NOT NULL DEFAULT 'nunca',
  "repeticao_fim_data"    date,
  "repeticao_fim_vezes"   smallint,
  "repeticao_feitas"      integer     NOT NULL DEFAULT 0,
  "repeticao_ancora"      date,
  "alerta_minutos"        integer,                              -- nulo = sem alerta
  "prioridade"            text        NOT NULL DEFAULT 'normal',
  "sinalizado"            boolean     NOT NULL DEFAULT false,
  "etiquetas"             text[]      NOT NULL DEFAULT '{}',
  "subtarefas"            jsonb       NOT NULL DEFAULT '[]',    -- [{ id, titulo, concluida, concluidaEm }]
  "avaliacao_tipo"        text        NOT NULL DEFAULT '',
  "coluna_id"             text,
  "ordem"                 numeric     NOT NULL DEFAULT 0,
  "concluida"             boolean     NOT NULL DEFAULT false,
  "concluida_em"          timestamptz,
  "concluida_por"         text        REFERENCES "user"("id"),
  "origem_id"             text,                                 -- cópia concluída de uma repetição
  "ocorrencia"            date,                                 -- data da ocorrência que essa cópia concluiu
  "legado"                jsonb       NOT NULL DEFAULT '{}',    -- o que veio do documento sem lugar próprio
  "excluido_em"           timestamptz,
  "excluido_por"          text        REFERENCES "user"("id"),
  "versao"                integer     NOT NULL DEFAULT 1,
  "criado_em"             timestamptz NOT NULL DEFAULT now(),
  "criado_por"            text        NOT NULL REFERENCES "user"("id"),
  "atualizado_em"         timestamptz NOT NULL DEFAULT now(),
  "atualizado_por"        text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_compromissos_pk" PRIMARY KEY ("empresa_id", "id"),
  CONSTRAINT "agenda_compromissos_grupo_fk" FOREIGN KEY ("empresa_id", "grupo_id") REFERENCES "agenda_grupos"("empresa_id", "id"),
  CONSTRAINT "agenda_compromissos_gestor_fk" FOREIGN KEY ("empresa_id", "gestor_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id"),
  CONSTRAINT "agenda_compromissos_coluna_fk" FOREIGN KEY ("empresa_id", "coluna_id") REFERENCES "agenda_colunas"("empresa_id", "id"),
  CONSTRAINT "agenda_compromissos_origem_fk" FOREIGN KEY ("empresa_id", "origem_id") REFERENCES "agenda_compromissos"("empresa_id", "id"),
  CONSTRAINT "agenda_compromissos_id_check" CHECK ("id" ~ '^[A-Za-z0-9_-]{1,100}$'),
  CONSTRAINT "agenda_compromissos_titulo_check" CHECK (char_length(btrim("titulo")) BETWEEN 1 AND 200),
  CONSTRAINT "agenda_compromissos_url_check" CHECK ("url" = '' OR "url" ~* '^https?://\S+\.\S+'),
  CONSTRAINT "agenda_compromissos_hora_check" CHECK (
    ("hora" IS NULL OR "hora" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') AND
    ("hora_fim" IS NULL OR "hora_fim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') AND
    ("hora" IS NULL OR "data" IS NOT NULL) AND
    ("hora_fim" IS NULL OR ("hora" IS NOT NULL AND "hora_fim" > "hora"))),
  CONSTRAINT "agenda_compromissos_local_check" CHECK (
    ("local_lat" IS NULL OR "local_lat" BETWEEN -90 AND 90) AND ("local_lng" IS NULL OR "local_lng" BETWEEN -180 AND 180) AND
    "local_aviso" IN ('', 'entrar', 'sair') AND
    ("local_aviso" = '' OR ("local_lat" IS NOT NULL AND "local_lng" IS NOT NULL AND "local_raio" BETWEEN 50 AND 50000))),
  CONSTRAINT "agenda_compromissos_repeticao_check" CHECK (
    ("repeticao_tipo" IS NULL OR "repeticao_tipo" IN ('hora', 'dia', 'dias-uteis', 'fins-de-semana', 'semana', 'quinzena',
                                                       'mes', 'trimestre', 'semestre', 'ano', 'personalizada')) AND
    ("repeticao_tipo" IS NULL OR "data" IS NOT NULL) AND
    ("repeticao_tipo" IS DISTINCT FROM 'hora' OR "hora" IS NOT NULL) AND
    "repeticao_intervalo" BETWEEN 1 AND 99 AND
    "repeticao_unidade" IN ('dia', 'semana', 'mes', 'ano') AND
    "repeticao_dias_semana" <@ '{0,1,2,3,4,5,6}'::smallint[] AND
    "repeticao_fim_tipo" IN ('nunca', 'data', 'vezes') AND
    ("repeticao_fim_tipo" <> 'data' OR "repeticao_fim_data" IS NOT NULL) AND
    ("repeticao_fim_tipo" <> 'vezes' OR "repeticao_fim_vezes" BETWEEN 1 AND 999) AND
    "repeticao_feitas" >= 0),
  CONSTRAINT "agenda_compromissos_alerta_check" CHECK ("alerta_minutos" IS NULL OR ("alerta_minutos" BETWEEN 0 AND 40320 AND "data" IS NOT NULL)),
  CONSTRAINT "agenda_compromissos_prioridade_check" CHECK ("prioridade" IN ('muito-baixa', 'baixa', 'normal', 'alta', 'muito-alta')),
  CONSTRAINT "agenda_compromissos_subtarefas_check" CHECK (jsonb_typeof("subtarefas") = 'array'),
  CONSTRAINT "agenda_compromissos_legado_check" CHECK (jsonb_typeof("legado") = 'object'),
  CONSTRAINT "agenda_compromissos_avaliacao_check" CHECK ("avaliacao_tipo" IN ('', 'estrelas', 'niveis', 'nps', 'feito')),
  CONSTRAINT "agenda_compromissos_concluida_check" CHECK ("concluida" = ("concluida_em" IS NOT NULL)),
  CONSTRAINT "agenda_compromissos_copia_check" CHECK ("origem_id" IS NULL OR ("concluida" AND "repeticao_tipo" IS NULL)),
  CONSTRAINT "agenda_compromissos_excluido_check" CHECK (("excluido_em" IS NULL) = ("excluido_por" IS NULL)),
  CONSTRAINT "agenda_compromissos_versao_check" CHECK ("versao" >= 1)
);
-- Trava do duplo toque no banco: a mesma ocorrência de uma repetição só vira cópia concluída uma vez.
CREATE UNIQUE INDEX "agenda_compromissos_ocorrencia_uq" ON "agenda_compromissos" ("empresa_id", "origem_id", "ocorrencia")
  WHERE "origem_id" IS NOT NULL AND "ocorrencia" IS NOT NULL;
CREATE INDEX "agenda_compromissos_grupo_idx"  ON "agenda_compromissos" ("empresa_id", "grupo_id") WHERE "excluido_em" IS NULL;
CREATE INDEX "agenda_compromissos_gestor_idx" ON "agenda_compromissos" ("empresa_id", "gestor_id") WHERE "excluido_em" IS NULL;
CREATE INDEX "agenda_compromissos_data_idx"   ON "agenda_compromissos" ("empresa_id", "data") WHERE "excluido_em" IS NULL;

-- 4. Pessoas do compromisso e o que cada uma pode (P-19). O gestor não precisa de linha aqui.
CREATE TABLE "agenda_participantes" (
  "empresa_id"     uuid        NOT NULL,
  "compromisso_id" text        NOT NULL,
  "usuario_id"     text        NOT NULL,
  "responsavel"    boolean     NOT NULL DEFAULT false,
  "ver"            boolean     NOT NULL DEFAULT true,
  "editar"         boolean     NOT NULL DEFAULT false,
  "concluir"       boolean     NOT NULL DEFAULT false,
  "excluir"        boolean     NOT NULL DEFAULT false,
  "ordem"          smallint    NOT NULL DEFAULT 0,
  "criado_em"      timestamptz NOT NULL DEFAULT now(),
  "criado_por"     text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_participantes_pk" PRIMARY KEY ("empresa_id", "compromisso_id", "usuario_id"),
  CONSTRAINT "agenda_participantes_compromisso_fk" FOREIGN KEY ("empresa_id", "compromisso_id") REFERENCES "agenda_compromissos"("empresa_id", "id"),
  CONSTRAINT "agenda_participantes_usuario_fk" FOREIGN KEY ("empresa_id", "usuario_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id"),
  -- Quem pode fazer algo também pode ver (a mesma regra de normalizarPessoas, dominio.js:364).
  CONSTRAINT "agenda_participantes_ver_check" CHECK ("ver" OR NOT ("responsavel" OR "editar" OR "concluir" OR "excluir"))
);
CREATE INDEX "agenda_participantes_usuario_idx" ON "agenda_participantes" ("empresa_id", "usuario_id");

-- 5. Avaliações: uma por (compromisso, avaliado, papel). Registrada, não muda nem some.
CREATE TABLE "agenda_avaliacoes" (
  "id"             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "empresa_id"     uuid        NOT NULL,
  "compromisso_id" text        NOT NULL,
  "avaliado_id"    text        NOT NULL,
  "por_id"         text        NOT NULL,
  "papel"          text        NOT NULL,
  "tipo"           text        NOT NULL,
  "valor"          smallint    NOT NULL,
  "comentario"     text        NOT NULL DEFAULT '',
  "em"             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "agenda_avaliacoes_compromisso_fk" FOREIGN KEY ("empresa_id", "compromisso_id") REFERENCES "agenda_compromissos"("empresa_id", "id"),
  CONSTRAINT "agenda_avaliacoes_avaliado_fk" FOREIGN KEY ("empresa_id", "avaliado_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id"),
  CONSTRAINT "agenda_avaliacoes_por_fk" FOREIGN KEY ("empresa_id", "por_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id"),
  CONSTRAINT "agenda_avaliacoes_papel_check" CHECK ("papel" IN ('gestor', 'auto') AND ("papel" <> 'auto' OR "avaliado_id" = "por_id")),
  CONSTRAINT "agenda_avaliacoes_valor_check" CHECK (
    ("tipo" IN ('estrelas', 'niveis') AND "valor" BETWEEN 1 AND 5) OR
    ("tipo" = 'nps' AND "valor" BETWEEN 0 AND 10) OR
    ("tipo" = 'feito' AND "valor" IN (0, 1))),
  CONSTRAINT "agenda_avaliacoes_comentario_check" CHECK (char_length("comentario") <= 500)
);
CREATE UNIQUE INDEX "agenda_avaliacoes_uq" ON "agenda_avaliacoes" ("empresa_id", "compromisso_id", "avaliado_id", "papel");

CREATE FUNCTION "agenda_avaliacoes_imutavel"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Avaliação registrada não muda nem é apagada (agenda_avaliacoes)';
END $$;
CREATE TRIGGER "agenda_avaliacoes_sem_alterar" BEFORE UPDATE OR DELETE ON "agenda_avaliacoes"
  FOR EACH ROW EXECUTE FUNCTION "agenda_avaliacoes_imutavel"();

-- 6. Adiar o alerta ("soneca"), por pessoa — proposta para a pergunta M3 (seção 7).
CREATE TABLE "agenda_adiamentos" (
  "empresa_id"     uuid        NOT NULL,
  "compromisso_id" text        NOT NULL,
  "usuario_id"     text        NOT NULL,
  "ate"            timestamptz NOT NULL,
  "atualizado_em"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "agenda_adiamentos_pk" PRIMARY KEY ("empresa_id", "compromisso_id", "usuario_id"),
  CONSTRAINT "agenda_adiamentos_compromisso_fk" FOREIGN KEY ("empresa_id", "compromisso_id") REFERENCES "agenda_compromissos"("empresa_id", "id"),
  CONSTRAINT "agenda_adiamentos_usuario_fk" FOREIGN KEY ("empresa_id", "usuario_id") REFERENCES "perfis_usuarios"("empresa_id", "usuario_id")
);

-- 7. Ligações do mapa mental ("depende de", "antes de"…)
CREATE TABLE "agenda_relacoes" (
  "empresa_id"     uuid        NOT NULL,
  "id"             text        NOT NULL,
  "de_id"          text        NOT NULL,
  "para_id"        text        NOT NULL,
  "rotulo"         text        NOT NULL DEFAULT '',
  "criado_em"      timestamptz NOT NULL DEFAULT now(),
  "criado_por"     text        NOT NULL REFERENCES "user"("id"),
  "atualizado_em"  timestamptz NOT NULL DEFAULT now(),
  "atualizado_por" text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_relacoes_pk" PRIMARY KEY ("empresa_id", "id"),
  CONSTRAINT "agenda_relacoes_de_fk" FOREIGN KEY ("empresa_id", "de_id") REFERENCES "agenda_compromissos"("empresa_id", "id"),
  CONSTRAINT "agenda_relacoes_para_fk" FOREIGN KEY ("empresa_id", "para_id") REFERENCES "agenda_compromissos"("empresa_id", "id"),
  CONSTRAINT "agenda_relacoes_id_check" CHECK ("id" ~ '^[A-Za-z0-9_-]{1,100}$'),
  CONSTRAINT "agenda_relacoes_pontas_check" CHECK ("de_id" <> "para_id"),
  CONSTRAINT "agenda_relacoes_rotulo_check" CHECK (char_length("rotulo") <= 40)
);
-- Os mesmos dois compromissos só se ligam uma vez, em qualquer sentido (dados.js:407).
CREATE UNIQUE INDEX "agenda_relacoes_par_uq" ON "agenda_relacoes" ("empresa_id", least("de_id", "para_id"), greatest("de_id", "para_id"));

-- 8. Registro de cada transferência do documento (seção 4). Só INSERT.
CREATE TABLE "agenda_transferencias" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "empresa_id"        uuid        NOT NULL REFERENCES "empresas"("id"),
  "origem"            text        NOT NULL,
  "documento_versao"  integer,
  "contagem_antes"    jsonb       NOT NULL,
  "contagem_depois"   jsonb       NOT NULL,
  "pendencias"        jsonb       NOT NULL DEFAULT '[]',
  "situacao"          text        NOT NULL,
  "feita_em"          timestamptz NOT NULL DEFAULT now(),
  "feita_por"         text        NOT NULL REFERENCES "user"("id"),
  CONSTRAINT "agenda_transferencias_origem_check" CHECK ("origem" IN ('servidor', 'aparelho', 'retransferencia')),
  CONSTRAINT "agenda_transferencias_situacao_check" CHECK ("situacao" IN ('concluida', 'recusada'))
);
CREATE INDEX "agenda_transferencias_empresa_idx" ON "agenda_transferencias" ("empresa_id", "feita_em");
```

Observações do SQL:
- O schema Drizzle correspondente entra em `servidor/db/src/schema/agenda.ts` (as três tabelas da 0003 continuam lá);
  o `drizzle-kit` gera o arquivo e o trigger é acrescentado à mão no fim, como texto revisado. O `meta/_journal.json`
  ganha a entrada `0007_agenda_tabelas`.
- A 0007 **só acrescenta**: não mexe em `documentos` nem nas tabelas da 0003. Desfazer antes do uso = apagar as tabelas novas.
- **Ligação com chat e arquivos (0003):** `agenda_mensagens`, `agenda_chat_leituras` e `agenda_arquivos` continuam com
  `compromisso_id` em texto. A ligação com `agenda_compromissos` (FK) **não** vai na 0007: hoje pode haver mensagens de
  compromissos já apagados do documento, e a FK falharia. Vai numa migration depois da transferência no ar
  (`0009_agenda_chat_ligado.sql`): `ADD CONSTRAINT … FOREIGN KEY (empresa_id, compromisso_id) REFERENCES
  agenda_compromissos (empresa_id, id) NOT VALID` (vale para tudo o que entrar dali em diante) e `VALIDATE CONSTRAINT`
  só depois que o Zé decidir o que fazer com as mensagens órfãs (a transferência conta quantas são).
- **Chat do grupo (P-45 item 2):** fica para a segunda migration, `0008_agenda_chat_grupo.sql`, numa entrega própria
  depois da base: `agenda_grupo_mensagens` (id, empresa, grupo_id → agenda_grupos, autor_id, texto 1–2000, criado_em) e
  `agenda_grupo_leituras` (empresa, grupo, usuário, lido_ate), com a mesma forma das tabelas da 0003. Não entra agora
  porque depende da pergunta (a) (quem é membro) e o chat atual não precisa dele para funcionar.

## 3. API (`servidor/api/src/agenda/`, contratos em `servidor/shared/src/agenda/`)

**Para quem usa:** cada aparelho recebe só os compromissos de que a pessoa participa; quando dois aparelhos mexem em
compromissos diferentes, os dois salvam; quando mexem no mesmo, o segundo vê "outra pessoa alterou este compromisso" e a
versão nova, sem perder o resto.

### Arquivos

| Arquivo | O que tem |
|---|---|
| `servidor/shared/src/agenda/regras.ts` | **A regra, uma vez só:** `acesso(compromisso, usuarioId)`, `normalizarPessoas`, `podeAvaliar`, `valorValido`, `comparativo`, `validar`, `proxima` (repetição com âncora) e as listas fixas (prioridades, repetições, tipos de avaliação). Puro, sem banco. |
| `servidor/shared/src/agenda/contratos.ts` | Zod de entrada e tipos de resposta (abaixo). O `agenda.ts` atual vira `agenda/arquivos.ts` (chat e arquivos, sem mudança de contrato). |
| `servidor/api/src/agenda/agenda.controller.ts` | Rotas novas + as de chat/arquivos que já existem. Valida com Zod, pega o perfil da sessão. |
| `servidor/api/src/agenda/compromissos.service.ts` | Regra e transação: permissão, versão, conclusão com repetição, avaliação, exclusão. |
| `servidor/api/src/agenda/compromissos.repository.ts` | Só SQL/Drizzle. A leitura "o que eu posso ver" é **uma consulta** com o filtro no `WHERE`. |
| `servidor/api/src/agenda/transferencia.service.ts` | Transferência do documento (seção 4). |
| `servidor/api/src/agenda/agenda.service.ts` | Chat e arquivos: `exigirAcesso` passa a ler as tabelas; somem o cache do documento, `versaoAgenda` e `documentoAgenda`. |

**Regra escrita uma vez:** o servidor calcula o `acesso` de cada compromisso e o manda pronto na resposta
(`acesso: { ver, editar, concluir, excluir, gestor, responsavel }`). A tela **não calcula permissão** (sai `acesso` de
`dist/agenda/dominio.js`). Para a repetição e a validação, que a tela precisa para desenhar o calendário e avisar antes de
enviar, o `regras.ts` é convertido em `dist/agenda/regras.js` por um script (`servidor/scripts/gerar-regras-agenda.mjs`,
com o esbuild que já vem com o `tsx`), e um teste falha se o arquivo gerado estiver diferente da fonte (o mesmo
cuidado de `scripts/extrair-cargos-referencia.mjs`). Saem de `dominio.js`: `acesso`, `normalizarPessoas`,
`podeAvaliar`, `valorValido`, `proxima`, `somarMeses`, `validar` (passam a vir de `CicluzAgendaRegras`). Sai
`acessoAgenda` de `servidor/shared/src/agenda.ts`.

### Rotas (todas exigem sessão; tudo da empresa da sessão)

| Rota | Para quê | Quem pode |
|---|---|---|
| `GET /api/agenda` | Tudo o que a tela precisa, **já filtrado**: grupos visíveis, colunas, compromissos que a pessoa vê (cada um com `acesso`, `adiadoPara` **dela** e só as avaliações que ela pode ver), ligações com as duas pontas visíveis, `estado.noServidor`. Responde `ETag` (contador `agenda_estado` + usuário); sem mudança → 304. | logado |
| `GET /api/agenda/pessoas` | Contas ativas da empresa (`id`, `nome`), para escolher responsável. Sem e-mail, sem CPF. Substitui a lista provisória (P-18). | logado |
| `GET /api/agenda/compromissos/:id` | Um compromisso atualizado (para abrir o formulário). Quem não vê recebe **404** (não revela que existe). | `ver` |
| `POST /api/agenda/compromissos` | Cria. O **id vem do aparelho** (`ag-<uuid>`): repetir o mesmo pedido devolve o já criado (idempotente). Gestor = quem está logado, sempre (o corpo não escolhe). | membro do grupo (pergunta 2) |
| `PUT /api/agenda/compromissos/:id` | Formulário inteiro, com `versao`. Versão velha → **409 `AGENDA_VERSAO`** com o compromisso atual. Quem não é gestor não muda `pessoas`, `gestor` nem `avaliacaoTipo` (o servidor ignora e avisa). `avaliacaoTipo` não muda depois da primeira nota. | `editar` |
| `PATCH /api/agenda/compromissos/:id` | Mudança parcial (renomear, prioridade, sinalizar, mover de dia/hora/lista/coluna, ordem "entre A e B", subtarefas do mapa mental), com `versao`. **Passa pela mesma função do PUT**: uma validação e **uma** regra de âncora (mudou a data e a âncora era a data antiga → a âncora vai junto; fecha M5). | `editar` |
| `POST /api/agenda/compromissos/:id/conclusao` | Corpo com o **estado desejado**: `{ concluida: true, ocorrencia: 'AAAA-MM-DD' }` ou `{ concluida: false }`. Não é "alternar": o segundo toque pede o mesmo estado e recebe o mesmo resultado (fecha M2 e M4). Repetição: o servidor cria a cópia com id fixo `<id>-c<n>` e `ocorrencia`, soma `feitas`, calcula a próxima data com `proxima` do `regras.ts` e desmarca as subtarefas, tudo numa transação com `SELECT … FOR UPDATE`; o índice `agenda_compromissos_ocorrencia_uq` é a segunda trava. `concluida_em` = hora do servidor. | `concluir` |
| `PUT /api/agenda/compromissos/:id/subtarefas/:subId` | `{ concluida: true|false }` (estado desejado, idempotente). | `concluir` |
| `DELETE /api/agenda/compromissos/:id?versao=N` | Exclui (esconde: `excluido_em`). Ligações do mapa que tocam nele somem junto. | `excluir` |
| `POST /api/agenda/limpar-concluidos` | `{ grupoId? }`: esconde os concluídos que a pessoa pode excluir; devolve quantos. | `excluir` em cada um |
| `PUT` / `DELETE /api/agenda/compromissos/:id/adiamento` | `{ ate }`: soneca **só para quem pediu** (proposta M3). | `ver` |
| `POST /api/agenda/compromissos/:id/avaliacoes` | `{ avaliadoId, valor, comentario }`. Confere `podeAvaliar` no servidor; já registrada → **409 `AGENDA_AVALIACAO_REGISTRADA`**. Não existe rota de alterar nem de apagar nota. | gestor ou o próprio responsável |
| `POST` / `PATCH` / `DELETE /api/agenda/relacoes[/:id]` | Ligações do mapa mental. | `editar` na ponta "de" e `ver` na "para" |
| `POST` / `PUT` / `DELETE /api/agenda/grupos[/:id]` | Grupo: criar, renomear (nome, cor só hexadecimal, ícone, ordenação), excluir **só vazio** (como hoje). | criar: logado; mudar/excluir: dono ou administrador (pergunta 3) |
| `PUT /api/agenda/grupos/:id/membros` | Lista de membros (à mão). | dono ou administrador |
| `POST` / `PUT` / `DELETE /api/agenda/colunas[/:id]` | Colunas do Kanban; excluir só sem cartão aberto (os concluídos ficam sem coluna). | logado (como hoje; pergunta 11) |
| `GET` / `POST /api/agenda/transferencia` | Ver a prévia (contagens) e executar a transferência do documento do servidor. | administrador |
| `POST /api/agenda/transferencia/aparelho` | O aparelho entrega a cópia local antiga para conferência (seção 4). | logado |
| Chat e arquivos (`/api/agenda/compromissos/:id/mensagens`, `/leitura`, `/arquivos`, `/api/agenda/chat/nao-lidas`, `/api/agenda/arquivos/:id`) | **Mesmos endereços e respostas.** Muda só de onde vem a permissão: das tabelas. Compromisso excluído → 404. | como hoje |

**Ver = consulta única no banco**, nunca filtro na tela: `gestor_id = eu OR existe participante (eu, ver)`, mais
`excluido_em IS NULL`. Avaliações na resposta: o gestor recebe todas; o responsável, só a própria autoavaliação
(como `comparativo`, `dominio.js:420`). Quem só vê recebe o compromisso sem notas.

**Códigos de erro** (mensagem em português, padrão de `servidor/api/src/erros.ts`): `AGENDA_COMPROMISSO_NAO_ENCONTRADO`
(404), `AGENDA_SEM_ACESSO` (403, quando a pessoa vê mas não pode a ação), `AGENDA_VERSAO` (409),
`AGENDA_AVALIACAO_REGISTRADA` (409), `AGENDA_GRUPO_COM_COMPROMISSOS` (409), `AGENDA_NAO_TRANSFERIDA` (409: rotas novas
antes da transferência), `AGENDA_ID_EM_USO` (409: id já usado por outro gestor).

## 4. Transferência dos dados já salvos

**Para quem usa:** um dia, o administrador abre a Agenda, vê "Levar a Agenda para o servidor: 3 listas, 128
compromissos, 41 concluídos, 12 avaliações" e confirma. Se algo não bater, nada muda e aparece o motivo. Nada é apagado.

### De onde vem
1. **Documento `cicluz-agenda-v1` no servidor** (fonte principal; adotado do aparelho desde 05/11, então o iPad já
   mandou o que tinha). O **servidor lê o próprio documento**; o aparelho não manda os compromissos nessa etapa (um
   corpo enviado pelo aparelho poderia ser forjado: é exatamente o G1).
2. **Cópia local nos aparelhos** (iPad do Rodrigo): quando a tela nova abre num aparelho que ainda tem
   `cicluz-agenda-v1` no `localStorage` e não tem a flag nova `cicluz-agenda-transferida-v1`, ela envia a cópia para
   `POST /api/agenda/transferencia/aparelho`. O servidor **guarda a cópia inteira** em `documentos_historico`
   (tipo `conflito`, já aceito pelo CHECK), compara com as tabelas e registra em `agenda_transferencias` (origem
   `aparelho`) o que existe só no aparelho ou está diferente. **Não aplica nada sozinho**: o administrador vê a lista e
   decide. Depois disso a flag é gravada e a cópia local deixa de ser lida (não é apagada nesta entrega).
3. **Alterações recusadas por conflito** já guardadas em `documentos_historico` (G4: o que "sumiu da tela"): a prévia
   lista os compromissos que aparecem nesses registros e não estão no documento atual, para o Zé decidir se volta algum.

### Como converte (num lugar só: `transferencia.service.ts`, uma transação)
- `listas` → `agenda_grupos` (mesmo id). Cor que não for `#rrggbb` vira a primeira cor padrão e a original vai para a
  pendência (neutraliza G2). Dono = administrador que transfere (pergunta 3). Membros iniciais = **todas as contas ativas
  da empresa**, `origem = 'transferencia'` (hoje todo mundo vê todas as listas; ninguém perde nada; pergunta 4).
- **Decisões do Zé (23/11/2026, junto com o SQL):** compromisso cuja lista não existe mais vai para a primeira lista e
  entra na pendência; duas listas com o mesmo nome: a segunda ganha " (2)" no nome e entra na pendência.
- `colunas` → `agenda_colunas`; documento sem colunas recebe as duas iniciais (`col-a-fazer`, `col-em-progresso`), como `completar()` faz.
- `itens` → `agenda_compromissos` (mesmo id), passando antes pelo mesmo `completar()` de hoje (`responsavelId` antigo
  vira responsável, `avaliacao` vazia). `repeticao.ancora` vazia vira a `data`. `localizacao` → colunas `local_*`.
  `adiadoPara` não é copiado (a soneca era temporária; o alerta volta ao normal) e fica em `legado`. Campos que a tabela
  não tem ficam em `legado` (nada se perde).
- **Item sem `criadoPor`** (feito antes do login; hoje fica aberto a **todos**, inclusive chat e arquivos): recebe
  `gestor_id` = conta que o Zé escolher na prévia (padrão proposto: a do Rodrigo, dono do iPad) e
  `sem_criador_original = true`. As pessoas dele continuam. Pergunta 7.
- **`criadoPor` ou pessoa que não é conta da empresa** (ids da lista provisória `u-jose`, `u-rodrigo`, `u-ana`): a prévia
  mostra um "de → para" para o Zé ligar a uma conta real; o que ficar sem ligação vai para `legado.pessoasSemConta`
  (com as permissões) e **não dá acesso a ninguém**. Pergunta 8.
- `avaliacao.notas` → `agenda_avaliacoes` (inseridas como estão; nota com pessoa sem conta vai para `legado`).
- Cópias concluídas (`origemId`) → `origem_id` + `ocorrencia` = a data da cópia. Se o duplo toque (M2) já criou duas
  cópias da mesma ocorrência, só a primeira recebe `ocorrencia`; as outras entram com `ocorrencia` vazia e aparecem na
  pendência. `origemId` de um original já apagado → `origem_id` vazio e o id antigo em `legado`.
- `relacoes` → `agenda_relacoes`; ligação com ponta inexistente ou repetida vai para a pendência.
- `ordem` → `ordem` (mesmo número). `criadoEm`/`atualizadoEm`/`concluidaEm` do documento são mantidos.

### Conferência de contagens (antes × depois, na mesma transação)
`listas`, `colunas`, `itens`, `itens concluídos`, `cópias de repetição`, `subtarefas`, `pessoas`, `responsáveis`,
`notas de avaliação`, `relações`, `itens sem criadoPor`, `ids sem conta`. Regra: **cada item do documento tem de estar
na tabela ou na pendência, nunca em nenhum dos dois**. Se a soma não fechar, a transação é desfeita, a tentativa fica
registrada como `recusada` com o motivo e nada muda. Também conta (só informa) as mensagens e arquivos da 0003 cujo
compromisso não existe no documento (órfãos para a 0009).

### Idempotente e sem apagar
- Rodar de novo **não duplica** (`ON CONFLICT DO NOTHING` por `(empresa_id, id)`) e **não sobrescreve**.
- O documento `cicluz-agenda-v1` **não é apagado nem alterado** nesta entrega. Continua na sincronização até a entrega C
  (seção 6), aceitando gravação de aba antiga ainda aberta: nada se perde, vai para `documentos` e para o histórico.
- **Retransferência segura** (origem `retransferencia`): se o documento subir de versão depois da transferência (aba
  antiga aberta), o administrador roda de novo; compromisso novo entra; compromisso que mudou no documento só é
  atualizado se a linha na tabela ainda estiver na `versao = 1` (ninguém mexeu pela tela nova); senão, vai para a pendência.

## 5. Como a tela muda

**Para quem usa:** as telas (listas, calendário, Kanban, mapa mental, alertas, chat) ficam iguais. Ao salvar, aparece
"Salvando…" por um instante. Se outra pessoa mexeu antes no mesmo compromisso, aparece a versão nova com o aviso.

- **`dist/agenda/dados.js` vira cliente da API** e é a única porta (mesmo papel de `dist/compras/produtos-api.js`). Some:
  `transacao`, leitura/gravação de `cicluz-agenda-v1`, o ouvinte de `storage`, `pessoas()` com a lista provisória,
  `acesso` local e todo `if (!acesso(...))` (a resposta do servidor já traz `acesso`). Os nomes das funções ficam
  (`salvarItem`, `alternarConcluida`→`concluir`, `avaliar`, `adiar`, `moverPara`, …), mas passam a devolver **Promise**.
- **Chamadas na tela** (`telas.js`, `kanban.js`, `calendario.js`, `mapa*.js`, `alertas.js`, `conversa.js`): cerca de 35
  pontos passam a `await` e mostram o erro do servidor com `U.avisar`. O botão fica desabilitado enquanto a gravação
  anda (segunda barreira contra duplo toque).
- **Atualização:** `GET /api/agenda` ao abrir, ao voltar para a aba e a cada 30 s com `If-None-Match` (o mesmo relógio
  dos alertas, `alertas.js:131`); 304 não custa nada. Substitui o aviso "outro aparelho salvou antes" da Agenda.
- **Âncora da repetição e conclusão** deixam de ser calculadas na tela; o calendário continua desenhando as próximas
  datas com `CicluzAgendaRegras.proxima` (o arquivo gerado do `regras.ts`).
- **Sem internet (proposta, pergunta 9):** a última resposta de `GET /api/agenda` fica em
  `cicluz-agenda-cache-v1` (localStorage, **não sincronizada**, com o `usuarioId` dentro: cópia de outra conta é
  ignorada). Sem conexão, a Agenda **mostra** a cópia com a faixa "Sem internet: mostrando a última cópia; para criar
  ou alterar, conecte" e os botões de gravar ficam desabilitados. Essa chave é **apagada no "Sair"**
  (`dist/entrar.js:379`, junto das chaves sincronizadas), porque tem dado de uma pessoa só e o iPad pode ser
  compartilhado. Fila de alterações sem internet fica fora desta entrega (risco de conflito alto; decidir antes).
- **Antes da transferência:** a tela nova não tem modo antigo. Se o servidor diz `noServidor: false`, o administrador vê
  a prévia e o botão "Levar a Agenda para o servidor"; os outros veem "A Agenda está sendo levada para o servidor.
  Volte em alguns minutos." Assim **não existem dois caminhos** nem por um dia.
- **Ao fim (entrega C):** `cicluz-agenda-v1` sai de `CHAVES_SINCRONIZADAS` e de `CHAVES_ADOTADAS_DO_APARELHO`
  (`servidor/shared/src/documentos.ts:35,69`); a tela não lê mais a cópia local; `PROJECT_BRAIN/04` é reescrito.

## 6. Passos de entrega (commit por passo; branch `feat/agenda-servidor`)

| Entrega | Passo (um commit cada) | Para aprovação |
|---|---|---|
| **A — servidor** | A1 este plano. A2 `shared/src/agenda/regras.ts` + gerador `dist/agenda/regras.js` + teste de igualdade com os 125 casos de `tests/agenda-dominio.cjs` (sem mudar comportamento). A3 schema Drizzle + `0007_agenda_tabelas.sql` (**só depois do SQL aprovado**). A4 repository + service + rotas de compromissos e testes. A5 grupos, colunas, relações, avaliações, adiamento. A6 transferência (prévia, execução, aparelho, retransferência) e testes. A7 chat e arquivos lendo as tabelas; sai o cache do documento; `docs/BACKEND.md` atualizado. | SQL da 0007 |
| **B — tela** | B1 `dados.js` cliente da API e cache sem internet; `entrar.js` apaga o cache ao sair. B2 telas com `await` e estados de "salvando"/erro. B3 tela de transferência (prévia, "de → para", confirmação). B4 `tests/agenda-telas.mjs` rodando com a API real (`npm run test:telas-api`), 320/390/1024 claro e escuro. B5 brain (04, 09 DT-15, 11 P-45). | — |
| **Publicar** | API (migrate aplica a 0007) → administrador transfere logo em seguida → site. Conferência no ar: contagens, `agenda:conferir` (versão do documento × versão transferida). | com o Marco |
| **C — limpeza** | Depois da conferência no ar: chave sai da sincronização e do código; `0009_agenda_chat_ligado.sql` (FK `NOT VALID`); apagar o documento antigo do banco só com pedido explícito. | SQL da 0009 |
| **D — chat do grupo** | `0008_agenda_chat_grupo.sql` + rotas + tela, depois da resposta da pergunta 1. | SQL da 0008 |

Estimativa: A ~2,5 dias · B ~2 dias · C ~0,5 dia · D ~1 dia.

## 7. Testes (Vitest + Testcontainers, `servidor/tests/integracao/agenda-compromissos.test.ts` e `agenda-transferencia.test.ts`)

**Para quem usa:** são as provas automáticas de que as falhas da revisão não voltam.

| Caso | Prova |
|---|---|
| Documento forjado (G1) | Usuário grava `cicluz-agenda-v1` pelo `PUT /api/documentos` pondo o próprio id em `criadoPor` de `ag-1` → `GET /api/agenda` não traz `ag-1`, chat e arquivos de `ag-1` dão 404/403. Depois da transferência o documento não muda nada. |
| Quem não participa não recebe | Pessoa de fora: `GET /api/agenda` sem o compromisso; `GET /compromissos/:id` 404. Quem só vê: recebe sem notas. Responsável: só a própria autoavaliação. Outra empresa: nada. |
| Item antigo sem criador | Depois da transferência, deixa de ser aberto a todos (hoje `agenda.test.ts:71` espera 201 para qualquer um; esse teste é **trocado**). |
| Duplo concluir (M2) | Duas conclusões simultâneas (`Promise.all`) de um que repete → **uma** cópia, `feitas + 1`, próxima data uma vez só. Não repetitivo → concluído uma vez; o compromisso vizinho intacto. Cartão de alerta velho (M4) com `concluida: true` num já concluído → continua concluído. |
| Conflito por compromisso (G4) | Aparelho A grava X (v1→v2); B grava X com v1 → 409 com a versão atual; B grava Y com v1 → 200. |
| Avaliação imutável (G5) | Segunda nota do mesmo papel → 409; `UPDATE`/`DELETE` direto no banco → erro do trigger; `avaliacaoTipo` não muda depois da primeira nota; quem não é gestor nem o responsável → 403. |
| Permissões | Só-ver não edita, conclui, exclui; não-gestor não muda pessoas; participante de outra empresa recusado pelo banco (FK composta). |
| Adiamento (M3) | Soneca de uma pessoa não muda o alerta do gestor. |
| Âncora (M5) | Mensal do dia 31 trocado para o dia 10 pelo `PUT` ou pelo `PATCH` → próximas no dia 10. |
| Banco se defende | Cor `"><script>` recusada (Zod e CHECK); hora fim antes do início; repetição sem data. |
| Transferência | Contagens iguais; rodar 2× não duplica; cópia do aparelho guardada e diferenças listadas; ids sem conta e itens sem criador tratados; soma que não fecha → nada muda e fica `recusada`. |
| Regras iguais | `dist/agenda/regras.js` gerado = fonte; os 125 casos de domínio passam com o arquivo gerado. |

**Não cobre:** o comportamento real do Safari do iPad sem internet (conferir à mão), e o desempenho com milhares de
compromissos (hoje são centenas; se crescer, `GET /api/agenda` ganha "só mudanças desde").

## 8. Pré-mortem (o que pode dar errado)

| Risco | Como fica coberto |
|---|---|
| Aba antiga aberta grava o documento depois da transferência | Documento continua aceito e guardado; `agenda:conferir` + retransferência segura; publicar o site logo depois da transferência. |
| Chat e arquivos param entre publicar a API e transferir | A transferência é feita logo após a API subir (minutos); avisar o Rodrigo do horário. |
| Pessoa da lista provisória perde acesso | Nunca teve acesso real (não é conta); fica em `legado` e o "de → para" resolve. |
| Cópia da Agenda fica no iPad compartilhado para a próxima pessoa | Cache com `usuarioId` e apagado ao sair. |
| Tela quebra ao virar assíncrona (~35 pontos) | Testes de tela com a API real antes do PR; um passo por grupo de telas. |
| Regra da repetição diverge entre tela e servidor | Arquivo gerado + teste de igualdade. |
| Muitos aparelhos perguntando a cada 30 s | `ETag`/304 pelo contador `agenda_estado`. |
| Duplo toque passa pelas duas travas da tela | Estado desejado + `FOR UPDATE` + índice único de ocorrência. |
| Migration errada | A 0007 só acrescenta tabelas; desfazer = apagar as novas; o documento antigo segue intacto. |

## 9. Perguntas para o Zé e o Rodrigo

1. **(P-45 a) Quem entra no grupo de uma lista:** escolhido à mão pelo dono (o modelo acima) ou quem tem certa permissão
   (cargo de acesso)? O modelo aceita os dois; "por permissão" acrescentaria uma coluna no grupo.
2. **Ser membro do grupo dá o quê?** Proposta: ver o grupo, criar compromissos nele e usar o chat do grupo; cada
   compromisso continua visível só para quem participa (P-19). Ou membro vê **todas** as tarefas do grupo, como no WhatsApp?
3. **Quem cria, renomeia e exclui grupo e escolhe os membros?** Proposta: quem criou (dono) e o administrador. As duas
   listas iniciais ficam com o administrador como dono.
4. **Membros iniciais** das listas que já existem: todas as contas ativas (como hoje), e cada dono enxuga depois?
5. **Pessoa de um compromisso precisa ser membro do grupo?** (Proposta: não obrigatório na primeira versão.)
6. **Adiar o alerta (M3):** vale **só para quem adiou** (proposta) ou para todos do compromisso?
7. **Compromisso sem criador** (feito antes do login): quem vira o gestor? Proposta: a conta do Rodrigo.
8. **Pessoas da lista provisória** (`José · Compras`, `Rodrigo · Gerência`, `Ana · Estoque`) usadas em compromissos:
   ligar a quais contas reais? O que não for ligado fica guardado sem dar acesso.
9. **Sem internet:** só ver (proposta) ou também criar/alterar com fila (mais trabalho e risco de conflito)?
10. **Repetição atrasada (M6):** a próxima conta a partir de hoje? Até a resposta, fica como hoje (conta da data marcada).
11. **Colunas do Kanban:** continuam iguais para a empresa toda e qualquer pessoa edita, ou passam a ser por grupo?
12. **Excluir e "Limpar concluídos":** com a exclusão que esconde, avaliações, chat e arquivos ficam no banco. Confirmar.
    Alguém (administrador) deve poder ver ou restaurar o que foi excluído?
13. **Quem vê as notas:** hoje o gestor vê todas e o responsável só a própria autoavaliação. O administrador também vê
    (relatório de desempenho do P-45)?
14. **Documento antigo no banco:** apagar na entrega C, ou deixar guardado como na transferência de produtos?
15. **Marco:** de acordo com as tabelas, as rotas e a ordem de publicação (API → transferência → site)?
