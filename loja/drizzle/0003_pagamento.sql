ALTER TABLE "pedidos" ADD COLUMN "forma_pagamento" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pagamento_status" text DEFAULT 'PENDENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "link_cartao" text;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "pago_em" timestamp with time zone;