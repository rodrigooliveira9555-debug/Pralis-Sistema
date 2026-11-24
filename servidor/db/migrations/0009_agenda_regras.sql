CREATE TABLE "sessoes_atividade" (
	"sessao_id" text PRIMARY KEY NOT NULL,
	"ultima_interacao_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedientes_colaboradores" (
	"empresa_id" uuid NOT NULL,
	"colaborador_id" text NOT NULL,
	"dia" date NOT NULL,
	"trabalha" boolean NOT NULL,
	"inicio" text,
	"fim" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text NOT NULL,
	CONSTRAINT "expedientes_colaboradores_pk" PRIMARY KEY("empresa_id","colaborador_id","dia"),
	CONSTRAINT "expedientes_colaboradores_colaborador_check" CHECK ("expedientes_colaboradores"."colaborador_id" ~ '^[A-Za-z0-9_.:-]{1,100}$'),
	CONSTRAINT "expedientes_colaboradores_horario_check" CHECK (("expedientes_colaboradores"."trabalha" and "expedientes_colaboradores"."inicio" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "expedientes_colaboradores"."fim" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' and "expedientes_colaboradores"."fim" <> "expedientes_colaboradores"."inicio") or (not "expedientes_colaboradores"."trabalha" and "expedientes_colaboradores"."inicio" is null and "expedientes_colaboradores"."fim" is null))
);
--> statement-breakpoint
ALTER TABLE "agenda_grupo_membros" DROP CONSTRAINT "agenda_grupo_membros_origem_check";--> statement-breakpoint
ALTER TABLE "agenda_horas_fora" DROP CONSTRAINT "agenda_horas_fora_tipo_check";--> statement-breakpoint
ALTER TABLE "agenda_horas_fora" ALTER COLUMN "tipo" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD COLUMN "area" text;--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD COLUMN "colaborador_id" text;--> statement-breakpoint
ALTER TABLE "sessoes_atividade" ADD CONSTRAINT "sessoes_atividade_sessao_id_session_id_fk" FOREIGN KEY ("sessao_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes_colaboradores" ADD CONSTRAINT "expedientes_colaboradores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes_colaboradores" ADD CONSTRAINT "expedientes_colaboradores_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "perfis_usuarios_colaborador_uq" ON "perfis_usuarios" USING btree ("empresa_id","colaborador_id") WHERE "perfis_usuarios"."colaborador_id" is not null;--> statement-breakpoint
ALTER TABLE "agenda_grupo_membros" ADD CONSTRAINT "agenda_grupo_membros_origem_check" CHECK ("agenda_grupo_membros"."origem" in ('manual', 'transferencia', 'area'));--> statement-breakpoint
ALTER TABLE "agenda_grupos" ADD CONSTRAINT "agenda_grupos_area_check" CHECK ("agenda_grupos"."area" is null or "agenda_grupos"."area" in ('lancamentos', 'caixa', 'transferencias', 'compras', 'producao', 'pessoas', 'relatorios', 'configuracoes'));--> statement-breakpoint
ALTER TABLE "agenda_horas_fora" ADD CONSTRAINT "agenda_horas_fora_tipo_check" CHECK ("agenda_horas_fora"."tipo" is null or "agenda_horas_fora"."tipo" in ('comum', 'extra'));--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD CONSTRAINT "perfis_usuarios_colaborador_check" CHECK ("perfis_usuarios"."colaborador_id" is null or "perfis_usuarios"."colaborador_id" ~ '^[A-Za-z0-9_.:-]{1,100}$');