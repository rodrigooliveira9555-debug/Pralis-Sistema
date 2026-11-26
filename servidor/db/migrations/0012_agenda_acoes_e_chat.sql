CREATE TABLE "agenda_acoes_progresso" (
	"empresa_id" uuid NOT NULL,
	"compromisso_id" text NOT NULL,
	"ocorrencia" date NOT NULL,
	"feitas" integer DEFAULT 0 NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_acoes_progresso_pk" PRIMARY KEY("empresa_id","compromisso_id","ocorrencia"),
	CONSTRAINT "agenda_acoes_progresso_feitas_check" CHECK ("agenda_acoes_progresso"."feitas" >= 0)
);
--> statement-breakpoint
CREATE TABLE "agenda_telas_icone" (
	"empresa_id" uuid NOT NULL,
	"tela" text NOT NULL,
	"mostrar" boolean NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "agenda_telas_icone_pk" PRIMARY KEY("empresa_id","tela"),
	CONSTRAINT "agenda_telas_icone_tela_check" CHECK ("agenda_telas_icone"."tela" ~ '^#/[A-Za-z0-9%/_.-]+$' and char_length("agenda_telas_icone"."tela") <= 302)
);
--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD COLUMN "acao_tela" text;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD COLUMN "acao_quantidade" smallint;--> statement-breakpoint
ALTER TABLE "agenda_mensagens" ADD COLUMN "arquivo_id" uuid;--> statement-breakpoint
ALTER TABLE "agenda_acoes_progresso" ADD CONSTRAINT "agenda_acoes_progresso_compromisso_fk" FOREIGN KEY ("empresa_id","compromisso_id") REFERENCES "public"."agenda_compromissos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_telas_icone" ADD CONSTRAINT "agenda_telas_icone_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_telas_icone" ADD CONSTRAINT "agenda_telas_icone_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_mensagens" ADD CONSTRAINT "agenda_mensagens_arquivo_id_agenda_arquivos_id_fk" FOREIGN KEY ("arquivo_id") REFERENCES "public"."agenda_arquivos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_acao_check" CHECK (("agenda_compromissos"."acao_tela" is null) = ("agenda_compromissos"."acao_quantidade" is null) and ("agenda_compromissos"."acao_tela" is null or ("agenda_compromissos"."acao_tela" ~ '^[a-z]{1,30}:[a-z-]{1,30}$' and "agenda_compromissos"."acao_quantidade" between 1 and 365 and "agenda_compromissos"."vinculo_tela" is not null)));