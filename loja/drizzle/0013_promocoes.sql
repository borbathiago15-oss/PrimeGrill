CREATE TABLE "campanha_envios" (
	"id" serial PRIMARY KEY NOT NULL,
	"campanha_id" integer NOT NULL,
	"inscrito_id" integer NOT NULL,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"autor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campanhas" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" text NOT NULL,
	"mensagem" text NOT NULL,
	"folder_id" integer,
	"criado_por" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inscritos_promocoes" (
	"id" serial PRIMARY KEY NOT NULL,
	"celular" text NOT NULL,
	"nome" text NOT NULL,
	"origem" text NOT NULL,
	"aceitou_em" timestamp with time zone DEFAULT now() NOT NULL,
	"registrado_por" text,
	"revogado_em" timestamp with time zone,
	"token" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campanha_envios" ADD CONSTRAINT "campanha_envios_campanha_id_campanhas_id_fk" FOREIGN KEY ("campanha_id") REFERENCES "public"."campanhas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanha_envios" ADD CONSTRAINT "campanha_envios_inscrito_id_inscritos_promocoes_id_fk" FOREIGN KEY ("inscrito_id") REFERENCES "public"."inscritos_promocoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campanhas" ADD CONSTRAINT "campanhas_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "campanha_envio_uq" ON "campanha_envios" USING btree ("campanha_id","inscrito_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inscritos_celular_uq" ON "inscritos_promocoes" USING btree ("celular");--> statement-breakpoint
CREATE UNIQUE INDEX "inscritos_token_uq" ON "inscritos_promocoes" USING btree ("token");