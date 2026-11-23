import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { FolderArte } from "@/components/folder-arte";
import { configLoja } from "@/lib/dados";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ofertas — Prime Grill Paiva" };

/** Página pública do folder: é o link que vai nas mensagens de promoção. */
export default async function Ofertas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [f] = await (await db()).select().from(schema.folders).where(eq(schema.folders.id, Number(id)));
  if (!f) notFound();
  const config = await configLoja();
  return (
    <div className="ofertas-pub">
      <div className="fo-prev pub">
        <FolderArte
          d={{
            formato: f.formato,
            titulo: f.titulo,
            destaque: f.destaque,
            subtitulo: f.subtitulo,
            secao: f.secao,
            frase: f.frase,
            validadeDe: f.validadeDe,
            validadeAte: f.validadeAte,
            itens: f.itens,
            whatsapp: config.whatsapp,
            whatsapp2: config.whatsapp2 ?? "",
            instagram: config.instagram ?? "",
          }}
        />
      </div>
      <Link href="/" className="btn-ouro centro" style={{ flex: "none", maxWidth: 420, width: "100%" }}>
        Fazer meu pedido
      </Link>
      <p style={{ fontSize: 12.5, color: "#A99E90", textAlign: "center" }}>Preços e disponibilidade atualizados no cardápio da loja.</p>
    </div>
  );
}
