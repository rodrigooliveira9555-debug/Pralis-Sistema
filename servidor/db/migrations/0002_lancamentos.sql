CREATE TABLE "lancamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"data_referencia" date NOT NULL,
	"data_vencimento" date NOT NULL,
	"data_pagamento" date,
	"observacao" text NOT NULL,
	"valor_original" numeric(14, 2) NOT NULL,
	"juros_tipo" text,
	"juros_valor_informado" numeric(14, 4),
	"valor_acrescimo" numeric(14, 2) DEFAULT '0' NOT NULL,
	"desconto_geral_tipo" text,
	"desconto_geral_valor" numeric(14, 4),
	"valor_desconto" numeric(14, 2) DEFAULT '0' NOT NULL,
	"conta_nome" text,
	"grupo_id" text,
	"grupo_nome" text,
	"numero_documento_fiscal" text,
	"data_documento_fiscal" date,
	"recorrencia_id" uuid,
	"recorrencia_ordem" integer,
	"criado_por" text NOT NULL,
	"atualizado_por" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lancamentos_categoria_check" CHECK ("lancamentos"."categoria" in ('despesas', 'mercadorias', 'retiradas')),
	CONSTRAINT "lancamentos_valor_check" CHECK ("lancamentos"."valor_original" >= 0 and "lancamentos"."valor_acrescimo" >= 0 and "lancamentos"."valor_desconto" >= 0),
	CONSTRAINT "lancamentos_juros_tipo_check" CHECK ("lancamentos"."juros_tipo" is null or "lancamentos"."juros_tipo" in ('percentual', 'valor')),
	CONSTRAINT "lancamentos_desconto_tipo_check" CHECK ("lancamentos"."desconto_geral_tipo" is null or "lancamentos"."desconto_geral_tipo" in ('percentual', 'valor')),
	CONSTRAINT "lancamentos_retirada_sem_desconto_check" CHECK ("lancamentos"."categoria" <> 'retiradas' or "lancamentos"."valor_desconto" = 0),
	CONSTRAINT "lancamentos_serie_check" CHECK (("lancamentos"."recorrencia_id" is null) = ("lancamentos"."recorrencia_ordem" is null))
);
--> statement-breakpoint
CREATE TABLE "lancamentos_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lancamento_id" uuid NOT NULL,
	"posicao" integer NOT NULL,
	"descricao" text NOT NULL,
	"quantidade" numeric(14, 3),
	"valor_unitario" numeric(14, 4) NOT NULL,
	"desconto_tipo" text,
	"desconto_valor" numeric(14, 4),
	"desconto_total_tipo" text,
	"desconto_total_valor" numeric(14, 4),
	"valor_total" numeric(14, 2) NOT NULL,
	"valor_total_com_desconto" numeric(14, 2) NOT NULL,
	"valor_unitario_com_desconto" numeric(14, 4) NOT NULL,
	"grupo_id" text,
	"grupo_nome" text,
	CONSTRAINT "lancamentos_itens_valores_check" CHECK ("lancamentos_itens"."valor_unitario" >= 0 and "lancamentos_itens"."valor_total" >= 0 and "lancamentos_itens"."valor_total_com_desconto" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lancamentos_recorrencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"categoria" text NOT NULL,
	"frequencia" text NOT NULL,
	"repeticoes" integer NOT NULL,
	"dias_semana" integer[],
	"criado_por" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lancamentos_recorrencias_categoria_check" CHECK ("lancamentos_recorrencias"."categoria" in ('despesas', 'mercadorias', 'retiradas')),
	CONSTRAINT "lancamentos_recorrencias_frequencia_check" CHECK ("lancamentos_recorrencias"."frequencia" in ('dia', 'semana', 'quinzena', 'mes', 'trimestre', 'ano')),
	CONSTRAINT "lancamentos_recorrencias_repeticoes_check" CHECK ("lancamentos_recorrencias"."repeticoes" between 1 and 366)
);
--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_recorrencia_id_lancamentos_recorrencias_id_fk" FOREIGN KEY ("recorrencia_id") REFERENCES "public"."lancamentos_recorrencias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_atualizado_por_user_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos_itens" ADD CONSTRAINT "lancamentos_itens_lancamento_id_lancamentos_id_fk" FOREIGN KEY ("lancamento_id") REFERENCES "public"."lancamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos_recorrencias" ADD CONSTRAINT "lancamentos_recorrencias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos_recorrencias" ADD CONSTRAINT "lancamentos_recorrencias_criado_por_user_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lancamentos_empresa_categoria_vencimento_idx" ON "lancamentos" USING btree ("empresa_id","categoria","data_vencimento");--> statement-breakpoint
CREATE INDEX "lancamentos_recorrencia_idx" ON "lancamentos" USING btree ("recorrencia_id");--> statement-breakpoint
CREATE INDEX "lancamentos_itens_lancamento_idx" ON "lancamentos_itens" USING btree ("lancamento_id","posicao");