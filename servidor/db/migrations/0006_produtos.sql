CREATE TABLE "produtos" (
	"empresa_id" uuid NOT NULL,
	"id" text NOT NULL,
	"codigo_interno" text NOT NULL,
	"codigo_barras" text,
	"nome" text NOT NULL,
	"descricao" text NOT NULL,
	"marca" text,
	"tipo" text NOT NULL,
	"status" text NOT NULL,
	"liberado_compra" boolean DEFAULT true NOT NULL,
	"grupo_id" text,
	"subgrupo_id" text,
	"local_id" text,
	"custo" numeric(14, 2),
	"margem" numeric(9, 6),
	"preco_venda" numeric(14, 2),
	"calculo_automatico" boolean DEFAULT false NOT NULL,
	"dados" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"app_id" text,
	"app_loja_id" text,
	"versao" integer DEFAULT 1 NOT NULL,
	"criado_por" text,
	"atualizado_por" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "produtos_empresa_id_id_pk" PRIMARY KEY("empresa_id","id"),
	CONSTRAINT "produtos_tipo_check" CHECK ("produtos"."tipo" in ('revenda', 'transformacao')),
	CONSTRAINT "produtos_status_check" CHECK ("produtos"."status" in ('ativo', 'inativo')),
	CONSTRAINT "produtos_valores_check" CHECK (coalesce("produtos"."custo", 0) >= 0 and coalesce("produtos"."preco_venda", 0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "produtos_codigo" (
	"empresa_id" uuid PRIMARY KEY NOT NULL,
	"ultimo" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "produtos_codigo" ADD CONSTRAINT "produtos_codigo_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "produtos_codigo_interno_uq" ON "produtos" USING btree ("empresa_id","codigo_interno");--> statement-breakpoint
CREATE UNIQUE INDEX "produtos_app_id_uq" ON "produtos" USING btree ("empresa_id","app_id") WHERE "produtos"."app_id" is not null;--> statement-breakpoint
CREATE INDEX "produtos_busca_idx" ON "produtos" USING btree ("empresa_id","status","nome");--> statement-breakpoint
CREATE INDEX "produtos_barras_idx" ON "produtos" USING btree ("empresa_id","codigo_barras");--> statement-breakpoint
CREATE INDEX "produtos_grupo_idx" ON "produtos" USING btree ("empresa_id","grupo_id","subgrupo_id");