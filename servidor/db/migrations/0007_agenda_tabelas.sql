-- Agenda no servidor (plano docs/AGENDA_NO_SERVIDOR_PLANO.md, seção 2). SQL aprovado pelo Zé em 23/11/2026.
-- Gerado pelo drizzle-kit, com duas mudanças à mão:
--  (1) o índice de perfis_usuarios vem PRIMEIRO: as ligações "pessoa = conta da mesma empresa" dependem dele;
--  (2) o trigger que deixa a avaliação imutável, no fim.
-- Só acrescenta: não mexe em documentos nem nas tabelas da 0003. Desfazer antes do uso = apagar as tabelas novas.
CREATE UNIQUE INDEX "perfis_usuarios_empresa_usuario_uq" ON "perfis_usuarios" USING btree ("empresa_id","usuario_id");--> statement-breakpoint
CREATE TABLE "agenda_adiamentos" (
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"ate" timestamp with time zone NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_adiamentos_pk" PRIMARY KEY("empresa_id","compromisso_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "agenda_avaliacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"avaliado_id" text NOT NULL,
	"por_id" text NOT NULL,
	"papel" text NOT NULL,
	"tipo" text NOT NULL,
	"valor" smallint NOT NULL,
	"comentario" text DEFAULT '' NOT NULL,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_avaliacoes_papel_check" CHECK ("agenda_avaliacoes"."papel" in ('gestor', 'auto') and ("agenda_avaliacoes"."papel" <> 'auto' or "agenda_avaliacoes"."avaliado_id" = "agenda_avaliacoes"."por_id")),
	CONSTRAINT "agenda_avaliacoes_valor_check" CHECK (("agenda_avaliacoes"."tipo" in ('estrelas', 'niveis') and "agenda_avaliacoes"."valor" between 1 and 5) or ("agenda_avaliacoes"."tipo" = 'nps' and "agenda_avaliacoes"."valor" between 0 and 10) or ("agenda_avaliacoes"."tipo" = 'feito' and "agenda_avaliacoes"."valor" in (0, 1))),
	CONSTRAINT "agenda_avaliacoes_comentario_check" CHECK (char_length("agenda_avaliacoes"."comentario") <= 500)
);
--> statement-breakpoint
CREATE TABLE "agenda_colunas" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "agenda_colunas_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "agenda_colunas_id_check" CHECK ("agenda_colunas"."id" ~ '^[A-Za-z0-9_-]{1,100}$' and "agenda_colunas"."id" <> 'concluido'),
	CONSTRAINT "agenda_colunas_nome_check" CHECK (char_length(btrim("agenda_colunas"."nome")) between 1 and 30 and lower(btrim("agenda_colunas"."nome")) <> 'concluído')
);
--> statement-breakpoint
CREATE TABLE "agenda_compromissos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"grupo_id" text NOT NULL,
	"gestor_id" text NOT NULL,
	"sem_criador_original" boolean DEFAULT false NOT NULL,
	"titulo" text NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"local" text DEFAULT '' NOT NULL,
	"local_lat" numeric(9, 6),
	"local_lng" numeric(9, 6),
	"local_aviso" text DEFAULT '' NOT NULL,
	"local_raio" integer,
	"data" date,
	"hora" text,
	"hora_fim" text,
	"repeticao_tipo" text,
	"repeticao_intervalo" smallint DEFAULT 1 NOT NULL,
	"repeticao_unidade" text DEFAULT 'semana' NOT NULL,
	"repeticao_dias_semana" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"repeticao_fim_tipo" text DEFAULT 'nunca' NOT NULL,
	"repeticao_fim_data" date,
	"repeticao_fim_vezes" smallint,
	"repeticao_feitas" integer DEFAULT 0 NOT NULL,
	"repeticao_ancora" date,
	"alerta_minutos" integer,
	"prioridade" text DEFAULT 'normal' NOT NULL,
	"sinalizado" boolean DEFAULT false NOT NULL,
	"etiquetas" text[] DEFAULT '{}'::text[] NOT NULL,
	"subtarefas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avaliacao_tipo" text DEFAULT '' NOT NULL,
	"coluna_id" text,
	"ordem" numeric DEFAULT '0' NOT NULL,
	"concluida" boolean DEFAULT false NOT NULL,
	"concluida_em" timestamp with time zone,
	"concluida_por" text,
	"origem_id" text,
	"ocorrencia" date,
	"legado" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"excluido_em" timestamp with time zone,
	"excluido_por" text,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "agenda_compromissos_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "agenda_compromissos_id_check" CHECK ("agenda_compromissos"."id" ~ '^[A-Za-z0-9_-]{1,100}$'),
	CONSTRAINT "agenda_compromissos_titulo_check" CHECK (char_length(btrim("agenda_compromissos"."titulo")) between 1 and 200),
	CONSTRAINT "agenda_compromissos_url_check" CHECK ("agenda_compromissos"."url" = '' or "agenda_compromissos"."url" ~* '^https?://\S+\.\S+'),
	CONSTRAINT "agenda_compromissos_hora_check" CHECK (("agenda_compromissos"."hora" is null or "agenda_compromissos"."hora" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') and ("agenda_compromissos"."hora_fim" is null or "agenda_compromissos"."hora_fim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') and ("agenda_compromissos"."hora" is null or "agenda_compromissos"."data" is not null) and ("agenda_compromissos"."hora_fim" is null or ("agenda_compromissos"."hora" is not null and "agenda_compromissos"."hora_fim" > "agenda_compromissos"."hora"))),
	CONSTRAINT "agenda_compromissos_local_check" CHECK (("agenda_compromissos"."local_lat" is null or "agenda_compromissos"."local_lat" between -90 and 90) and ("agenda_compromissos"."local_lng" is null or "agenda_compromissos"."local_lng" between -180 and 180) and "agenda_compromissos"."local_aviso" in ('', 'entrar', 'sair') and ("agenda_compromissos"."local_aviso" = '' or ("agenda_compromissos"."local_lat" is not null and "agenda_compromissos"."local_lng" is not null and "agenda_compromissos"."local_raio" between 50 and 50000))),
	CONSTRAINT "agenda_compromissos_repeticao_check" CHECK (("agenda_compromissos"."repeticao_tipo" is null or "agenda_compromissos"."repeticao_tipo" in ('hora', 'dia', 'dias-uteis', 'fins-de-semana', 'semana', 'quinzena', 'mes', 'trimestre', 'semestre', 'ano', 'personalizada')) and ("agenda_compromissos"."repeticao_tipo" is null or "agenda_compromissos"."data" is not null) and ("agenda_compromissos"."repeticao_tipo" is distinct from 'hora' or "agenda_compromissos"."hora" is not null) and "agenda_compromissos"."repeticao_intervalo" between 1 and 99 and "agenda_compromissos"."repeticao_unidade" in ('dia', 'semana', 'mes', 'ano') and "agenda_compromissos"."repeticao_dias_semana" <@ '{0,1,2,3,4,5,6}'::smallint[] and "agenda_compromissos"."repeticao_fim_tipo" in ('nunca', 'data', 'vezes') and ("agenda_compromissos"."repeticao_fim_tipo" <> 'data' or "agenda_compromissos"."repeticao_fim_data" is not null) and ("agenda_compromissos"."repeticao_fim_tipo" <> 'vezes' or "agenda_compromissos"."repeticao_fim_vezes" between 1 and 999) and "agenda_compromissos"."repeticao_feitas" >= 0),
	CONSTRAINT "agenda_compromissos_alerta_check" CHECK ("agenda_compromissos"."alerta_minutos" is null or ("agenda_compromissos"."alerta_minutos" between 0 and 40320 and "agenda_compromissos"."data" is not null)),
	CONSTRAINT "agenda_compromissos_prioridade_check" CHECK ("agenda_compromissos"."prioridade" in ('muito-baixa', 'baixa', 'normal', 'alta', 'muito-alta')),
	CONSTRAINT "agenda_compromissos_subtarefas_check" CHECK (jsonb_typeof("agenda_compromissos"."subtarefas") = 'array'),
	CONSTRAINT "agenda_compromissos_legado_check" CHECK (jsonb_typeof("agenda_compromissos"."legado") = 'object'),
	CONSTRAINT "agenda_compromissos_avaliacao_check" CHECK ("agenda_compromissos"."avaliacao_tipo" in ('', 'estrelas', 'niveis', 'nps', 'feito')),
	CONSTRAINT "agenda_compromissos_concluida_check" CHECK ("agenda_compromissos"."concluida" = ("agenda_compromissos"."concluida_em" is not null)),
	CONSTRAINT "agenda_compromissos_copia_check" CHECK ("agenda_compromissos"."origem_id" is null or "agenda_compromissos"."repeticao_tipo" is null),
	CONSTRAINT "agenda_compromissos_excluido_check" CHECK (("agenda_compromissos"."excluido_em" is null) = ("agenda_compromissos"."excluido_por" is null)),
	CONSTRAINT "agenda_compromissos_versao_check" CHECK ("agenda_compromissos"."versao" >= 1)
);
--> statement-breakpoint
CREATE TABLE "agenda_estado" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"versao" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "agenda_estado_versao_check" CHECK ("agenda_estado"."versao" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agenda_grupo_membros" (
	"empresa_id" uuid NOT NULL,
	"grupo_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"origem" text DEFAULT 'manual' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por" text NOT NULL,
	CONSTRAINT "agenda_grupo_membros_pk" PRIMARY KEY("empresa_id","grupo_id","usuario_id"),
	CONSTRAINT "agenda_grupo_membros_origem_check" CHECK ("agenda_grupo_membros"."origem" in ('manual', 'transferencia'))
);
--> statement-breakpoint
CREATE TABLE "agenda_grupos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"nome" text NOT NULL,
	"cor" text NOT NULL,
	"icone" text DEFAULT 'lista' NOT NULL,
	"ordenacao" text DEFAULT 'manual' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"dono_id" text NOT NULL,
	"excluido_em" timestamp with time zone,
	"excluido_por" text,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "agenda_grupos_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "agenda_grupos_id_check" CHECK ("agenda_grupos"."id" ~ '^[A-Za-z0-9_-]{1,100}$'),
	CONSTRAINT "agenda_grupos_nome_check" CHECK (char_length(btrim("agenda_grupos"."nome")) between 1 and 40),
	CONSTRAINT "agenda_grupos_cor_check" CHECK ("agenda_grupos"."cor" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "agenda_grupos_icone_check" CHECK ("agenda_grupos"."icone" ~ '^[a-z0-9-]{1,30}$'),
	CONSTRAINT "agenda_grupos_ordenacao_check" CHECK ("agenda_grupos"."ordenacao" in ('manual', 'data', 'criacao', 'prioridade', 'titulo')),
	CONSTRAINT "agenda_grupos_versao_check" CHECK ("agenda_grupos"."versao" >= 1),
	CONSTRAINT "agenda_grupos_excluido_check" CHECK (("agenda_grupos"."excluido_em" is null) = ("agenda_grupos"."excluido_por" is null))
);
--> statement-breakpoint
CREATE TABLE "agenda_participantes" (
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"responsavel" boolean DEFAULT false NOT NULL,
	"ver" boolean DEFAULT true NOT NULL,
	"editar" boolean DEFAULT false NOT NULL,
	"concluir" boolean DEFAULT false NOT NULL,
	"excluir" boolean DEFAULT false NOT NULL,
	"ordem" smallint DEFAULT 0 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por" text NOT NULL,
	CONSTRAINT "agenda_participantes_pk" PRIMARY KEY("empresa_id","compromisso_id","usuario_id"),
	CONSTRAINT "agenda_participantes_ver_check" CHECK ("agenda_participantes"."ver" or not ("agenda_participantes"."responsavel" or "agenda_participantes"."editar" or "agenda_participantes"."concluir" or "agenda_participantes"."excluir"))
);
--> statement-breakpoint
CREATE TABLE "agenda_relacoes" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"de_id" text NOT NULL,
	"para_id" text NOT NULL,
	"rotulo" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"criado_por" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "agenda_relacoes_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "agenda_relacoes_id_check" CHECK ("agenda_relacoes"."id" ~ '^[A-Za-z0-9_-]{1,100}$'),
	CONSTRAINT "agenda_relacoes_pontas_check" CHECK ("agenda_relacoes"."de_id" <> "agenda_relacoes"."para_id"),
	CONSTRAINT "agenda_relacoes_rotulo_check" CHECK (char_length("agenda_relacoes"."rotulo") <= 40)
);
--> statement-breakpoint
CREATE TABLE "agenda_transferencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"origem" text NOT NULL,
	"documento_versao" integer,
	"contagem_antes" jsonb NOT NULL,
	"contagem_depois" jsonb NOT NULL,
	"pendencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"situacao" text NOT NULL,
	"feita_em" timestamp with time zone DEFAULT now() NOT NULL,
	"feita_por" text NOT NULL,
	CONSTRAINT "agenda_transferencias_origem_check" CHECK ("agenda_transferencias"."origem" in ('servidor', 'aparelho', 'retransferencia')),
	CONSTRAINT "agenda_transferencias_situacao_check" CHECK ("agenda_transferencias"."situacao" in ('concluida', 'recusada'))
);
--> statement-breakpoint
ALTER TABLE "agenda_adiamentos" ADD CONSTRAINT "agenda_adiamentos_compromisso_fk" FOREIGN KEY ("empresa_id","compromisso_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_adiamentos" ADD CONSTRAINT "agenda_adiamentos_usuario_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_avaliacoes" ADD CONSTRAINT "agenda_avaliacoes_compromisso_fk" FOREIGN KEY ("empresa_id","compromisso_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_avaliacoes" ADD CONSTRAINT "agenda_avaliacoes_avaliado_fk" FOREIGN KEY ("empresa_id","avaliado_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_avaliacoes" ADD CONSTRAINT "agenda_avaliacoes_por_fk" FOREIGN KEY ("empresa_id","por_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_colunas" ADD CONSTRAINT "agenda_colunas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_colunas" ADD CONSTRAINT "agenda_colunas_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_colunas" ADD CONSTRAINT "agenda_colunas_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_concluida_por_user_id_fk" FOREIGN KEY ("concluida_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_excluido_por_user_id_fk" FOREIGN KEY ("excluido_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_grupo_fk" FOREIGN KEY ("empresa_id","grupo_id") REFERENCES "public"."agenda_grupos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_gestor_fk" FOREIGN KEY ("empresa_id","gestor_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_coluna_fk" FOREIGN KEY ("empresa_id","coluna_id") REFERENCES "public"."agenda_colunas"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_origem_fk" FOREIGN KEY ("empresa_id","origem_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_estado" ADD CONSTRAINT "agenda_estado_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_membros" ADD CONSTRAINT "agenda_grupo_membros_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_membros" ADD CONSTRAINT "agenda_grupo_membros_grupo_fk" FOREIGN KEY ("empresa_id","grupo_id") REFERENCES "public"."agenda_grupos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_membros" ADD CONSTRAINT "agenda_grupo_membros_usuario_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD CONSTRAINT "agenda_grupos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD CONSTRAINT "agenda_grupos_excluido_por_user_id_fk" FOREIGN KEY ("excluido_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD CONSTRAINT "agenda_grupos_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD CONSTRAINT "agenda_grupos_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD CONSTRAINT "agenda_grupos_dono_fk" FOREIGN KEY ("empresa_id","dono_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_participantes" ADD CONSTRAINT "agenda_participantes_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_participantes" ADD CONSTRAINT "agenda_participantes_compromisso_fk" FOREIGN KEY ("empresa_id","compromisso_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_participantes" ADD CONSTRAINT "agenda_participantes_usuario_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_relacoes" ADD CONSTRAINT "agenda_relacoes_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_relacoes" ADD CONSTRAINT "agenda_relacoes_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_relacoes" ADD CONSTRAINT "agenda_relacoes_de_fk" FOREIGN KEY ("empresa_id","de_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_relacoes" ADD CONSTRAINT "agenda_relacoes_para_fk" FOREIGN KEY ("empresa_id","para_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_transferencias" ADD CONSTRAINT "agenda_transferencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_transferencias" ADD CONSTRAINT "agenda_transferencias_feita_por_user_id_fk" FOREIGN KEY ("feita_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_avaliacoes_uq" ON "agenda_avaliacoes" USING btree ("empresa_id","compromisso_id","avaliado_id","papel");--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_colunas_nome_uq" ON "agenda_colunas" USING btree ("empresa_id",lower(btrim("nome")));--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_compromissos_ocorrencia_uq" ON "agenda_compromissos" USING btree ("empresa_id","origem_id","ocorrencia") WHERE "agenda_compromissos"."origem_id" is not null and "agenda_compromissos"."ocorrencia" is not null;--> statement-breakpoint
CREATE INDEX "agenda_compromissos_grupo_idx" ON "agenda_compromissos" USING btree ("empresa_id","grupo_id") WHERE "agenda_compromissos"."excluido_em" is null;--> statement-breakpoint
CREATE INDEX "agenda_compromissos_gestor_idx" ON "agenda_compromissos" USING btree ("empresa_id","gestor_id") WHERE "agenda_compromissos"."excluido_em" is null;--> statement-breakpoint
CREATE INDEX "agenda_compromissos_data_idx" ON "agenda_compromissos" USING btree ("empresa_id","data") WHERE "agenda_compromissos"."excluido_em" is null;--> statement-breakpoint
CREATE INDEX "agenda_grupo_membros_usuario_idx" ON "agenda_grupo_membros" USING btree ("empresa_id","usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_grupos_nome_uq" ON "agenda_grupos" USING btree ("empresa_id",lower(btrim("nome"))) WHERE "agenda_grupos"."excluido_em" is null;--> statement-breakpoint
CREATE INDEX "agenda_participantes_usuario_idx" ON "agenda_participantes" USING btree ("empresa_id","usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_relacoes_par_uq" ON "agenda_relacoes" USING btree ("empresa_id",least("de_id", "para_id"),greatest("de_id", "para_id"));--> statement-breakpoint
CREATE INDEX "agenda_transferencias_empresa_idx" ON "agenda_transferencias" USING btree ("empresa_id","feita_em");--> statement-breakpoint
CREATE FUNCTION "agenda_avaliacoes_imutavel"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Avaliação registrada não muda nem é apagada (agenda_avaliacoes)';
END $$;--> statement-breakpoint
CREATE TRIGGER "agenda_avaliacoes_sem_alterar" BEFORE UPDATE OR DELETE ON "agenda_avaliacoes"
  FOR EACH ROW EXECUTE FUNCTION "agenda_avaliacoes_imutavel"();
