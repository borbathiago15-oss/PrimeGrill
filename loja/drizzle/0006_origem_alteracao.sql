ALTER TABLE "pedidos" ADD COLUMN "origem" text DEFAULT 'LOJA_ONLINE' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "alteracao_cliente" text;