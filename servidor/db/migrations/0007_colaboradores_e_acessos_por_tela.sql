CREATE TABLE "acessos_por_tela" (
	"empresa_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"config" jsonb NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_por" text,
	CONSTRAINT "acessos_por_tela_empresa_id_chave_pk" PRIMARY KEY("empresa_id","chave")
);
--> statement-breakpoint
CREATE TABLE "colaboradores_acesso" (
	"id" text PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cargo_id" text,
	"area_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"ativo" boolean DEFAULT false NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD COLUMN "colaborador_id" text;--> statement-breakpoint
ALTER TABLE "acessos_por_tela" ADD CONSTRAINT "acessos_por_tela_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "colaboradores_acesso" ADD CONSTRAINT "colaboradores_acesso_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colaboradores_acesso_empresa_idx" ON "colaboradores_acesso" USING btree ("empresa_id");--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD CONSTRAINT "perfis_usuarios_colaborador_id_colaboradores_acesso_id_fk" FOREIGN KEY ("colaborador_id") REFERENCES "public"."colaboradores_acesso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "perfis_usuarios_colaborador_uq" ON "perfis_usuarios" USING btree ("colaborador_id") WHERE "perfis_usuarios"."colaborador_id" is not null;