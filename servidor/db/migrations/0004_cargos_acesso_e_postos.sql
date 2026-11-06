CREATE TABLE "cargos_acesso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cargos_acesso_auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ator_id" text NOT NULL,
	"cargo_id" uuid NOT NULL,
	"acao" text NOT NULL,
	"detalhe" jsonb,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cargos_acesso_auditoria_acao_check" CHECK ("cargos_acesso_auditoria"."acao" in ('criou', 'alterou'))
);
--> statement-breakpoint
CREATE TABLE "cargos_acesso_permissoes" (
	"cargo_id" uuid NOT NULL,
	"permissao" text NOT NULL,
	CONSTRAINT "cargos_acesso_permissoes_cargo_id_permissao_pk" PRIMARY KEY("cargo_id","permissao")
);
--> statement-breakpoint
CREATE TABLE "usuarios_cargos_acesso" (
	"usuario_id" text NOT NULL,
	"cargo_id" uuid NOT NULL,
	CONSTRAINT "usuarios_cargos_acesso_usuario_id_cargo_id_pk" PRIMARY KEY("usuario_id","cargo_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios_permissoes" (
	"usuario_id" text NOT NULL,
	"permissao" text NOT NULL,
	"permitido" boolean NOT NULL,
	CONSTRAINT "usuarios_permissoes_usuario_id_permissao_pk" PRIMARY KEY("usuario_id","permissao")
);
--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" DROP CONSTRAINT "usuarios_auditoria_acao_check";--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD COLUMN "posto_pdv" integer;--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD COLUMN "posto_turno" text;--> statement-breakpoint
ALTER TABLE "cargos_acesso" ADD CONSTRAINT "cargos_acesso_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos_acesso_auditoria" ADD CONSTRAINT "cargos_acesso_auditoria_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos_acesso_auditoria" ADD CONSTRAINT "cargos_acesso_auditoria_ator_id_user_id_fk" FOREIGN KEY ("ator_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos_acesso_auditoria" ADD CONSTRAINT "cargos_acesso_auditoria_cargo_id_cargos_acesso_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos_acesso"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cargos_acesso_permissoes" ADD CONSTRAINT "cargos_acesso_permissoes_cargo_id_cargos_acesso_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos_acesso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_cargos_acesso" ADD CONSTRAINT "usuarios_cargos_acesso_usuario_id_perfis_usuarios_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfis_usuarios"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_cargos_acesso" ADD CONSTRAINT "usuarios_cargos_acesso_cargo_id_cargos_acesso_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos_acesso"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_permissoes" ADD CONSTRAINT "usuarios_permissoes_usuario_id_perfis_usuarios_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."perfis_usuarios"("usuario_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cargos_acesso_empresa_nome_uq" ON "cargos_acesso" USING btree ("empresa_id",lower("nome"));--> statement-breakpoint
CREATE INDEX "cargos_acesso_auditoria_empresa_idx" ON "cargos_acesso_auditoria" USING btree ("empresa_id","em");--> statement-breakpoint
CREATE INDEX "usuarios_cargos_acesso_cargo_idx" ON "usuarios_cargos_acesso" USING btree ("cargo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "perfis_usuarios_posto_uq" ON "perfis_usuarios" USING btree ("empresa_id","posto_pdv","posto_turno") WHERE "perfis_usuarios"."posto_pdv" is not null;--> statement-breakpoint
ALTER TABLE "perfis_usuarios" ADD CONSTRAINT "perfis_usuarios_posto_check" CHECK (("perfis_usuarios"."posto_pdv" is null and "perfis_usuarios"."posto_turno" is null) or ("perfis_usuarios"."posto_pdv" between 1 and 4 and "perfis_usuarios"."posto_turno" in ('manha', 'tarde')));--> statement-breakpoint
ALTER TABLE "usuarios_auditoria" ADD CONSTRAINT "usuarios_auditoria_acao_check" CHECK ("usuarios_auditoria"."acao" in ('criou', 'alterou', 'definiu_senha', 'alterou_acessos'));