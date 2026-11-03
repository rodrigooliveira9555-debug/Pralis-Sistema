CREATE TABLE "cargos" (
	"empresa_id" uuid NOT NULL,
	"chave" text NOT NULL,
	"origem" text NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"nome_reduzido" text,
	"categoria" text,
	"cbo" text,
	"titulo" text,
	"valor_ficha_centavos" bigint,
	"ano" text,
	"sinonimos" text,
	"descricao" text,
	"icone" text,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	CONSTRAINT "cargos_empresa_id_chave_pk" PRIMARY KEY("empresa_id","chave"),
	CONSTRAINT "cargos_origem_check" CHECK ("cargos"."origem" in ('referencia', 'local')),
	CONSTRAINT "cargos_valor_check" CHECK ("cargos"."valor_ficha_centavos" is null or "cargos"."valor_ficha_centavos" >= 0)
);
--> statement-breakpoint
CREATE TABLE "contas" (
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer NOT NULL,
	"situacao" text NOT NULL,
	"documento" text,
	"icone" text NOT NULL,
	CONSTRAINT "contas_empresa_id_nome_pk" PRIMARY KEY("empresa_id","nome"),
	CONSTRAINT "contas_situacao_check" CHECK ("contas"."situacao" in ('ATIVA', 'INATIVA')),
	CONSTRAINT "contas_documento_check" CHECK ("contas"."documento" is null or "contas"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "cores_personalizadas" (
	"empresa_id" uuid NOT NULL,
	"cor" text NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "cores_personalizadas_empresa_id_cor_pk" PRIMARY KEY("empresa_id","cor"),
	CONSTRAINT "cores_personalizadas_formato_check" CHECK ("cores_personalizadas"."cor" ~ '^#[0-9a-f]{6}$')
);
--> statement-breakpoint
CREATE TABLE "icones_personalizados" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"rotulo" text,
	"desenho" text NOT NULL,
	"oculto" boolean NOT NULL,
	"excluido" boolean NOT NULL,
	CONSTRAINT "icones_personalizados_empresa_id_id_pk" PRIMARY KEY("empresa_id","id")
);
--> statement-breakpoint
CREATE TABLE "locais" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"pai_id" text,
	"nivel" integer NOT NULL,
	"ordem" integer NOT NULL,
	"nome" text NOT NULL,
	"icone" text,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	CONSTRAINT "locais_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "locais_nivel_check" CHECK ("locais"."nivel" between 1 and 4),
	CONSTRAINT "locais_raiz_check" CHECK (("locais"."nivel" = 1) = ("locais"."pai_id" is null))
);
--> statement-breakpoint
CREATE TABLE "locais_transferencias" (
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"nivel" integer,
	"data" timestamp with time zone,
	"origem_id" text NOT NULL,
	"origem_nome" text NOT NULL,
	"destino_id" text,
	"destino_nome" text,
	"copia_origem" jsonb,
	CONSTRAINT "locais_transferencias_empresa_id_ordem_pk" PRIMARY KEY("empresa_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "organograma_posicoes" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"pai_id" text,
	"ordem" integer NOT NULL,
	"cargo_chave" text,
	"cargo_nome" text NOT NULL,
	"cbo" text,
	"quantidade" integer NOT NULL,
	"rotulo" text,
	CONSTRAINT "organograma_posicoes_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "organograma_quantidade_check" CHECK ("organograma_posicoes"."quantidade" >= 1)
);
--> statement-breakpoint
CREATE TABLE "organograma_versoes" (
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"data" timestamp with time zone,
	"posicoes" jsonb NOT NULL,
	CONSTRAINT "organograma_versoes_empresa_id_ordem_pk" PRIMARY KEY("empresa_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "perfis_areas" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"nome" text NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "perfis_areas_empresa_id_id_pk" PRIMARY KEY("empresa_id","id")
);
--> statement-breakpoint
CREATE TABLE "perfis_cargos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"area_id" text NOT NULL,
	"area_nome" text,
	"origem_cargo" text,
	"cargo_nome" text NOT NULL,
	"cbo" text,
	"missao" text,
	"autonomia" text,
	"ordem" integer NOT NULL,
	CONSTRAINT "perfis_cargos_empresa_id_id_pk" PRIMARY KEY("empresa_id","id")
);
--> statement-breakpoint
CREATE TABLE "perfis_cargos_requisitos" (
	"empresa_id" uuid NOT NULL,
	"perfil_cargo_id" text NOT NULL,
	"requisito_id" text NOT NULL,
	CONSTRAINT "perfis_cargos_requisitos_empresa_id_perfil_cargo_id_requisito_id_pk" PRIMARY KEY("empresa_id","perfil_cargo_id","requisito_id")
);
--> statement-breakpoint
CREATE TABLE "perfis_requisitos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"area_id" text NOT NULL,
	"grupo" text NOT NULL,
	"texto" text NOT NULL,
	"ordem" integer NOT NULL,
	CONSTRAINT "perfis_requisitos_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "perfis_requisitos_grupo_check" CHECK ("perfis_requisitos"."grupo" in ('education', 'experience', 'certificates', 'technical', 'behavior', 'individual', 'group', 'collective'))
);
--> statement-breakpoint
CREATE TABLE "salarios_valores" (
	"empresa_id" uuid NOT NULL,
	"vigencia_ordem" integer NOT NULL,
	"posicao" integer NOT NULL,
	"cargo_chave" text NOT NULL,
	"cargo_nome" text NOT NULL,
	"valor_centavos" bigint NOT NULL,
	CONSTRAINT "salarios_valores_empresa_id_vigencia_ordem_posicao_pk" PRIMARY KEY("empresa_id","vigencia_ordem","posicao"),
	CONSTRAINT "salarios_valores_positivo_check" CHECK ("salarios_valores"."valor_centavos" > 0)
);
--> statement-breakpoint
CREATE TABLE "salarios_vigencias" (
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"inicio" date NOT NULL,
	"observacao" text,
	CONSTRAINT "salarios_vigencias_empresa_id_ordem_pk" PRIMARY KEY("empresa_id","ordem")
);
--> statement-breakpoint
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contas" ADD CONSTRAINT "contas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cores_personalizadas" ADD CONSTRAINT "cores_personalizadas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icones_personalizados" ADD CONSTRAINT "icones_personalizados_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais" ADD CONSTRAINT "locais_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais" ADD CONSTRAINT "locais_pai_fk" FOREIGN KEY ("empresa_id","pai_id") REFERENCES "public"."locais"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locais_transferencias" ADD CONSTRAINT "locais_transferencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organograma_posicoes" ADD CONSTRAINT "organograma_posicoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organograma_posicoes" ADD CONSTRAINT "organograma_pai_fk" FOREIGN KEY ("empresa_id","pai_id") REFERENCES "public"."organograma_posicoes"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organograma_versoes" ADD CONSTRAINT "organograma_versoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_areas" ADD CONSTRAINT "perfis_areas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos" ADD CONSTRAINT "perfis_cargos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos_requisitos" ADD CONSTRAINT "perfis_cargos_requisitos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos_requisitos" ADD CONSTRAINT "perfis_cargos_requisitos_cargo_fk" FOREIGN KEY ("empresa_id","perfil_cargo_id") REFERENCES "public"."perfis_cargos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_cargos_requisitos" ADD CONSTRAINT "perfis_cargos_requisitos_requisito_fk" FOREIGN KEY ("empresa_id","requisito_id") REFERENCES "public"."perfis_requisitos"("empresa_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perfis_requisitos" ADD CONSTRAINT "perfis_requisitos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salarios_valores" ADD CONSTRAINT "salarios_valores_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salarios_valores" ADD CONSTRAINT "salarios_valores_vigencia_fk" FOREIGN KEY ("empresa_id","vigencia_ordem") REFERENCES "public"."salarios_vigencias"("empresa_id","ordem") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salarios_vigencias" ADD CONSTRAINT "salarios_vigencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contas_nome_sem_caixa_idx" ON "contas" USING btree ("empresa_id",lower("nome"));