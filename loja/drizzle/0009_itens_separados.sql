ALTER TABLE "pedido_itens" ADD COLUMN "separados" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE "pedido_itens" SET "separados" = "pedido_itens"."quantidade" FROM "pedidos" WHERE "pedidos"."id" = "pedido_itens"."pedido_id" AND "pedidos"."baixa_estoque" = true;
