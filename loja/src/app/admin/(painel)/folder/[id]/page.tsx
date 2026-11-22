import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { exigirPermissao } from "@/lib/admin";
import { configLoja } from "@/lib/dados";
import { comEstoqueReal } from "@/lib/estoque";
import { FolderArte } from "@/components/folder-arte";
import { montarPaginas, mudancasDesde, TAMANHO } from "@/modules/folder/folder";
import { regerarFolder } from "../acoes";
import { Exportar } from "./exportar";

export const dynamic = "force-dynamic";
const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function Folder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fora?: string; erro?: string }> }) {
  await exigirPermissao("folder");
  const { id } = await params;
  const sp = await searchParams;
  const banco = await db();
  const [f] = await banco.select().from(schema.folders).where(eq(schema.folders.id, Number(id)));
  if (!f) notFound();
  const [config, atuais, versoes] = await Promise.all([
    configLoja(),
    banco.select().from(schema.produtos).where(inArray(schema.produtos.id, f.itens.map((i) => i.id))).then((l) => comEstoqueReal(banco, l)),
    banco.select({ id: schema.folders.id, versao: schema.folders.versao, criadoEm: schema.folders.criadoEm }).from(schema.folders).where(eq(schema.folders.grupo, f.grupo ?? f.id)).orderBy(desc(schema.folders.versao)),
  ]);
  const mudancas = mudancasDesde(f.itens, atuais);
  const ultima = versoes[0]?.id === f.id;
  let fora: { nome: string; motivo: string }[] = [];
  try {
    fora = sp.fora ? JSON.parse(sp.fora) : [];
  } catch {}
  const t = TAMANHO[f.formato];
  const nPaginas = montarPaginas(f.itens, f.formato).length;
  const nome = `prime-grill-${f.titulo.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-v${f.versao}`;

  return (
    <>
      <div className="topo">
        <h1>{f.titulo}</h1>
        <span className="rotulo">
          {t.rotulo} · versão {f.versao} · {nPaginas} página(s)
        </span>
        <div className="esp" />
        <Link href="/admin/folder" className="btn btn-pq">
          ‹ Folders
        </Link>
      </div>
      <div className="cont">
        {sp.erro === "vazio" && <p className="msg-erro">Nenhum produto deste folder pode entrar agora (sem preço, estoque ou foto).</p>}
        {fora.length > 0 && (
          <div className="msg-erro">
            Ficaram de fora:
            <ul style={{ paddingLeft: 20 }}>
              {fora.map((x) => (
                <li key={x.nome}>
                  {x.nome}: {x.motivo}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!ultima && (
          <p className="aviso-painel" style={{ maxWidth: "none" }}>
            Esta é uma versão antiga. <Link href={`/admin/folder/${versoes[0].id}`}>Abrir a versão mais nova ›</Link>
          </p>
        )}
        {mudancas.length > 0 ? (
          <div className="cartao passo-atual">
            <div className="passo-corpo">
              <h2>Desatualizado</h2>
              <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                {mudancas.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <form action={regerarFolder}>
                <input type="hidden" name="id" value={f.id} />
                <button className="btn btn-pri btn-grande">Regerar com os dados atuais</button>
              </form>
            </div>
          </div>
        ) : (
          <p className="msg-ok">Em dia: preços, fotos e estoque conferem com o cadastro.</p>
        )}
        <Exportar nome={nome} largura={t.w} altura={t.h} />
        <div className="fo-prev" aria-label="Pré-visualização do folder">
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
        {/* Cópia em tamanho real, fora da tela: é dela que saem as imagens e o PDF. */}
        <div id="arte" className="fo-export" aria-hidden="true">
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
        {versoes.length > 1 && (
          <div className="cartao" style={{ padding: "12px 18px", fontSize: 13.5 }}>
            <b>Histórico de versões:</b>{" "}
            {versoes.map((v, i) => (
              <span key={v.id}>
                {i > 0 && " · "}
                {v.id === f.id ? <b>v{v.versao}</b> : <Link href={`/admin/folder/${v.id}`}>v{v.versao}</Link>} ({hora.format(v.criadoEm)})
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
