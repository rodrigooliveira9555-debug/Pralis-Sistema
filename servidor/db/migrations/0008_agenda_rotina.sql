CREATE TABLE "agenda_config_pessoas" (
	"empresa_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"expediente_dias" smallint[] DEFAULT '{}'::smallint[] NOT NULL,
	"expediente_inicio" text,
	"expediente_fim" text,
	"fora_expediente" text DEFAULT 'permitir' NOT NULL,
	"hora_fora" text DEFAULT 'nao-registrar' NOT NULL,
	"inatividade_minutos" smallint,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "agenda_config_pessoas_pk" PRIMARY KEY("empresa_id","usuario_id"),
	CONSTRAINT "agenda_config_pessoas_expediente_check" CHECK ("agenda_config_pessoas"."expediente_dias" <@ '{0,1,2,3,4,5,6}'::smallint[] and ("agenda_config_pessoas"."expediente_inicio" is null) = ("agenda_config_pessoas"."expediente_fim" is null) and ("agenda_config_pessoas"."expediente_inicio" is null or ("agenda_config_pessoas"."expediente_inicio" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "agenda_config_pessoas"."expediente_fim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "agenda_config_pessoas"."expediente_fim" > "agenda_config_pessoas"."expediente_inicio"))),
	CONSTRAINT "agenda_config_pessoas_fora_check" CHECK ("agenda_config_pessoas"."fora_expediente" in ('permitir', 'bloquear')),
	CONSTRAINT "agenda_config_pessoas_hora_fora_check" CHECK ("agenda_config_pessoas"."hora_fora" in ('nao-registrar', 'comum', 'extra')),
	CONSTRAINT "agenda_config_pessoas_inatividade_check" CHECK ("agenda_config_pessoas"."inatividade_minutos" is null or "agenda_config_pessoas"."inatividade_minutos" between 1 and 480)
);
--> statement-breakpoint
CREATE TABLE "agenda_grupo_leituras" (
	"empresa_id" uuid NOT NULL,
	"grupo_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"lido_ate" timestamp with time zone NOT NULL,
	CONSTRAINT "agenda_grupo_leituras_pk" PRIMARY KEY("empresa_id","grupo_id","usuario_id")
);
--> statement-breakpoint
CREATE TABLE "agenda_grupo_mensagens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"grupo_id" text NOT NULL,
	"autor_id" text NOT NULL,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_grupo_mensagens_texto_check" CHECK (char_length("agenda_grupo_mensagens"."texto") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "agenda_horas_fora" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"compromisso_id" text NOT NULL,
	"dia" date NOT NULL,
	"concluida_em" timestamp with time zone NOT NULL,
	"minutos" integer,
	"tipo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_horas_fora_tipo_check" CHECK ("agenda_horas_fora"."tipo" in ('comum', 'extra')),
	CONSTRAINT "agenda_horas_fora_minutos_check" CHECK ("agenda_horas_fora"."minutos" is null or "agenda_horas_fora"."minutos" between 0 and 1440)
);
--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD COLUMN "vinculo_tela" text;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD COLUMN "vinculo_titulo" text;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD COLUMN "vinculo_ref" text;--> statement-breakpoint
ALTER TABLE "agenda_config_pessoas" ADD CONSTRAINT "agenda_config_pessoas_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_config_pessoas" ADD CONSTRAINT "agenda_config_pessoas_usuario_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_leituras" ADD CONSTRAINT "agenda_grupo_leituras_grupo_fk" FOREIGN KEY ("empresa_id","grupo_id") REFERENCES "public"."agenda_grupos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_leituras" ADD CONSTRAINT "agenda_grupo_leituras_usuario_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_mensagens" ADD CONSTRAINT "agenda_grupo_mensagens_autor_id_user_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_grupo_mensagens" ADD CONSTRAINT "agenda_grupo_mensagens_grupo_fk" FOREIGN KEY ("empresa_id","grupo_id") REFERENCES "public"."agenda_grupos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_horas_fora" ADD CONSTRAINT "agenda_horas_fora_usuario_fk" FOREIGN KEY ("empresa_id","usuario_id") REFERENCES "public"."perfis_usuarios"("empresa_id","usuario_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_horas_fora" ADD CONSTRAINT "agenda_horas_fora_compromisso_fk" FOREIGN KEY ("empresa_id","compromisso_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agenda_grupo_mensagens_grupo_idx" ON "agenda_grupo_mensagens" USING btree ("empresa_id","grupo_id","criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_horas_fora_uq" ON "agenda_horas_fora" USING btree ("empresa_id","compromisso_id","usuario_id");--> statement-breakpoint
CREATE INDEX "agenda_horas_fora_pessoa_idx" ON "agenda_horas_fora" USING btree ("empresa_id","usuario_id","dia");--> statement-breakpoint
CREATE UNIQUE INDEX "agenda_compromissos_vinculo_uq" ON "agenda_compromissos" USING btree ("empresa_id","vinculo_ref") WHERE "agenda_compromissos"."vinculo_ref" is not null and "agenda_compromissos"."origem_id" is null;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_vinculo_check" CHECK (("agenda_compromissos"."vinculo_tela" is null or ("agenda_compromissos"."vinculo_tela" ~ '^#/[A-Za-z0-9%/_.-]+$' and char_length("agenda_compromissos"."vinculo_tela") <= 302)) and ("agenda_compromissos"."vinculo_titulo" is null or char_length("agenda_compromissos"."vinculo_titulo") between 1 and 120) and ("agenda_compromissos"."vinculo_ref" is null or "agenda_compromissos"."vinculo_ref" ~ '^[A-Za-z0-9:_.-]{1,200}$') and ("agenda_compromissos"."vinculo_titulo" is null or "agenda_compromissos"."vinculo_tela" is not null));