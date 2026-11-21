CREATE TABLE "geo_cache" (
	"cep" text PRIMARY KEY NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"logradouro" text DEFAULT '' NOT NULL,
	"bairro" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"uf" text DEFAULT '' NOT NULL,
	"fonte" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "distancia_metros" integer;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "frete_a_combinar" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pedidos" ADD COLUMN "cidade" text;