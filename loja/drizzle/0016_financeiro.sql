CREATE TABLE "caixa_movimentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"caixa_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"motivo" text DEFAULT '' NOT NULL,
	"autor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caixas" (
	"id" serial PRIMARY KEY NOT NULL,
	"aberto_em" timestamp with time zone DEFAULT now() NOT NULL,
	"aberto_por" text NOT NULL,
	"troco_centavos" integer NOT NULL,
	"fechado_em" timestamp with time zone,
	"fechado_por" text,
	"esperado_centavos" integer,
	"contado_centavos" integer,
	"observacao" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lancamentos" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"categoria" text NOT NULL,
	"descricao" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"taxa_centavos" integer DEFAULT 0 NOT NULL,
	"forma" text,
	"status" text DEFAULT 'ABERTO' NOT NULL,
	"vencimento" text,
	"quitado_em" text,
	"previsto_em" text,
	"conciliado_em" timestamp with time zone,
	"conciliado_por" text,
	"pedido_id" integer,
	"nota_id" integer,
	"fornecedor_id" integer,
	"caixa_id" integer,
	"observacao" text DEFAULT '' NOT NULL,
	"autor" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caixa_movimentos" ADD CONSTRAINT "caixa_movimentos_caixa_id_caixas_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_nota_id_notas_entrada_id_fk" FOREIGN KEY ("nota_id") REFERENCES "public"."notas_entrada"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_caixa_id_caixas_id_fk" FOREIGN KEY ("caixa_id") REFERENCES "public"."caixas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lanc_quitado_idx" ON "lancamentos" USING btree ("quitado_em");--> statement-breakpoint
CREATE INDEX "lanc_vencimento_idx" ON "lancamentos" USING btree ("status","vencimento");--> statement-breakpoint
CREATE UNIQUE INDEX "lanc_pedido_uq" ON "lancamentos" USING btree ("pedido_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lanc_nota_uq" ON "lancamentos" USING btree ("nota_id");--> statement-breakpoint
INSERT INTO "lancamentos" ("tipo", "categoria", "descricao", "valor_centavos", "forma", "status", "vencimento", "quitado_em", "previsto_em", "pedido_id", "autor", "observacao")
SELECT 'RECEITA', 'VENDA', 'Pedido ' || p."codigo", COALESCE(p."total_final_centavos", p."total_estimado_centavos"),
  CASE p."forma_pagamento" WHEN 'PIX' THEN 'PIX' WHEN 'CARTAO_LINK' THEN 'CARTAO_LINK' ELSE 'NAO_INFORMADO' END,
  CASE WHEN p."status" = 'CANCELADO' THEN 'CANCELADO' ELSE 'QUITADO' END,
  to_char(COALESCE(p."pago_em", p."atualizado_em") AT TIME ZONE 'America/Recife', 'YYYY-MM-DD'),
  to_char(COALESCE(p."pago_em", p."atualizado_em") AT TIME ZONE 'America/Recife', 'YYYY-MM-DD'),
  to_char(COALESCE(p."pago_em", p."atualizado_em") AT TIME ZONE 'America/Recife', 'YYYY-MM-DD'),
  p."id", 'sistema', 'Recebimento anterior ao financeiro (importado)'
FROM "pedidos" p WHERE p."pagamento_status" = 'PAGO';
