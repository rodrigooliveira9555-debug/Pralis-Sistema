-- btree_gist: necessário para o EXCLUDE de vigências sobrepostas (igualdade de texto/uuid + intervalo).
CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
CREATE TABLE "fin_bandeiras" (
	"empresa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	"tipo_venda_id" text,
	CONSTRAINT "fin_bandeiras_empresa_id_item_id_pk" PRIMARY KEY("empresa_id","item_id"),
	CONSTRAINT "fin_bandeiras_modo_check" CHECK ("fin_bandeiras"."modo_identidade" is null or "fin_bandeiras"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_bandeiras_cor_check" CHECK ("fin_bandeiras"."cor" is null or "fin_bandeiras"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_bandeiras_documento_check" CHECK ("fin_bandeiras"."documento" is null or "fin_bandeiras"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_grupos" (
	"empresa_id" uuid NOT NULL,
	"colecao" text NOT NULL,
	"item_id" text NOT NULL,
	"pai_id" text,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	"finalidade" text,
	"lancamento_direto" boolean DEFAULT false NOT NULL,
	CONSTRAINT "fin_grupos_empresa_id_colecao_item_id_pk" PRIMARY KEY("empresa_id","colecao","item_id"),
	CONSTRAINT "fin_grupos_colecao_check" CHECK ("fin_grupos"."colecao" in ('mercadorias', 'despesas', 'vendas', 'retiradas')),
	CONSTRAINT "fin_grupos_finalidade_check" CHECK ("fin_grupos"."finalidade" is null or ("fin_grupos"."colecao" = 'mercadorias' and "fin_grupos"."finalidade" in ('VENDA', 'TRANSFORMAÇÃO'))),
	CONSTRAINT "fin_grupos_lancamento_direto_check" CHECK (not "fin_grupos"."lancamento_direto" or "fin_grupos"."colecao" = 'despesas'),
	CONSTRAINT "fin_grupos_modo_check" CHECK ("fin_grupos"."modo_identidade" is null or "fin_grupos"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_grupos_cor_check" CHECK ("fin_grupos"."cor" is null or "fin_grupos"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_grupos_documento_check" CHECK ("fin_grupos"."documento" is null or "fin_grupos"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_operadoras" (
	"empresa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	"custos_fixos" text,
	CONSTRAINT "fin_operadoras_empresa_id_item_id_pk" PRIMARY KEY("empresa_id","item_id"),
	CONSTRAINT "fin_operadoras_modo_check" CHECK ("fin_operadoras"."modo_identidade" is null or "fin_operadoras"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_operadoras_cor_check" CHECK ("fin_operadoras"."cor" is null or "fin_operadoras"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_operadoras_documento_check" CHECK ("fin_operadoras"."documento" is null or "fin_operadoras"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_taxas" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"operadora_id" text NOT NULL,
	"bandeira_id" text NOT NULL,
	"ordem" integer NOT NULL,
	"inicio" date NOT NULL,
	"fim" date,
	"modalidade" text NOT NULL,
	"parcela_de" integer,
	"parcela_ate" integer,
	"mdr_percentual" numeric(7, 4),
	"tarifa_centavos" integer,
	"antecipacao_modo" text,
	"antecipacao_percentual" numeric(7, 4),
	"antecipacao_periodo" text,
	"prazo_dias" integer,
	"tipo_dia" text,
	"observacoes" text,
	"despesa_id" text NOT NULL,
	"conta_nome" text,
	CONSTRAINT "fin_taxas_vigencia_check" CHECK ("fin_taxas"."fim" is null or "fin_taxas"."fim" >= "fin_taxas"."inicio"),
	CONSTRAINT "fin_taxas_parcelas_check" CHECK (("fin_taxas"."parcela_de" is null and "fin_taxas"."parcela_ate" is null) or ("fin_taxas"."parcela_de" >= 1 and "fin_taxas"."parcela_ate" >= "fin_taxas"."parcela_de")),
	CONSTRAINT "fin_taxas_mdr_check" CHECK ("fin_taxas"."mdr_percentual" is null or "fin_taxas"."mdr_percentual" between 0 and 100),
	CONSTRAINT "fin_taxas_antecipacao_check" CHECK ("fin_taxas"."antecipacao_percentual" is null or "fin_taxas"."antecipacao_percentual" between 0 and 100),
	CONSTRAINT "fin_taxas_tarifa_check" CHECK ("fin_taxas"."tarifa_centavos" is null or "fin_taxas"."tarifa_centavos" >= 0),
	CONSTRAINT "fin_taxas_prazo_check" CHECK ("fin_taxas"."prazo_dias" is null or "fin_taxas"."prazo_dias" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fin_tipos_venda" (
	"empresa_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean NOT NULL,
	"ordem" integer NOT NULL,
	"icone" text NOT NULL,
	"modo_identidade" text,
	"sigla" text,
	"cor" text,
	"documento" text,
	CONSTRAINT "fin_tipos_venda_empresa_id_item_id_pk" PRIMARY KEY("empresa_id","item_id"),
	CONSTRAINT "fin_tipos_venda_modo_check" CHECK ("fin_tipos_venda"."modo_identidade" is null or "fin_tipos_venda"."modo_identidade" in ('icon', 'text')),
	CONSTRAINT "fin_tipos_venda_cor_check" CHECK ("fin_tipos_venda"."cor" is null or "fin_tipos_venda"."cor" ~* '^#[0-9a-f]{6}$'),
	CONSTRAINT "fin_tipos_venda_documento_check" CHECK ("fin_tipos_venda"."documento" is null or "fin_tipos_venda"."documento" in ('DOC/F', 'DOC/NF', 'DOC/F/NF'))
);
--> statement-breakpoint
CREATE TABLE "fin_transferencias" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"empresa_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"colecao" text NOT NULL,
	"pai_id" text,
	"data" timestamp with time zone,
	"origem_id" text NOT NULL,
	"origem_nome" text NOT NULL,
	"destino_id" text,
	"destino_nome" text,
	"copia_origem" jsonb
);
--> statement-breakpoint
CREATE TABLE "projecoes" (
	"empresa_id" uuid NOT NULL,
	"assunto" text NOT NULL,
	"situacao" text NOT NULL,
	"versao_documento" integer NOT NULL,
	"mensagem" text,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projecoes_empresa_id_assunto_pk" PRIMARY KEY("empresa_id","assunto"),
	CONSTRAINT "projecoes_situacao_check" CHECK ("projecoes"."situacao" in ('ok', 'falha'))
);
--> statement-breakpoint
ALTER TABLE "fin_bandeiras" ADD CONSTRAINT "fin_bandeiras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_bandeiras" ADD CONSTRAINT "fin_bandeiras_tipo_venda_fk" FOREIGN KEY ("empresa_id","tipo_venda_id") REFERENCES "public"."fin_tipos_venda"("empresa_id","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_grupos" ADD CONSTRAINT "fin_grupos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_grupos" ADD CONSTRAINT "fin_grupos_pai_fk" FOREIGN KEY ("empresa_id","colecao","pai_id") REFERENCES "public"."fin_grupos"("empresa_id","colecao","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_operadoras" ADD CONSTRAINT "fin_operadoras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_operadora_fk" FOREIGN KEY ("empresa_id","operadora_id") REFERENCES "public"."fin_operadoras"("empresa_id","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_bandeira_fk" FOREIGN KEY ("empresa_id","bandeira_id") REFERENCES "public"."fin_bandeiras"("empresa_id","item_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_tipos_venda" ADD CONSTRAINT "fin_tipos_venda_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_transferencias" ADD CONSTRAINT "fin_transferencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projecoes" ADD CONSTRAINT "projecoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fin_taxas_operadora_idx" ON "fin_taxas" USING btree ("empresa_id","operadora_id","bandeira_id");--> statement-breakpoint
-- Regra da tela (groups.js, readOperatorFees): na mesma operadora, bandeira e modalidade, faixas de
-- parcelas (vazio = 1) e vigências (fim vazio = sem fim) não podem se cruzar.
ALTER TABLE "fin_taxas" ADD CONSTRAINT "fin_taxas_sem_sobreposicao" EXCLUDE USING gist (
	"empresa_id" WITH =,
	"operadora_id" WITH =,
	"bandeira_id" WITH =,
	"modalidade" WITH =,
	int4range(coalesce("parcela_de", 1), coalesce("parcela_ate", 1), '[]') WITH &&,
	daterange("inicio", coalesce("fim", '9999-12-31'::date), '[]') WITH &&
);
