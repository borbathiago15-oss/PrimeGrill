import type { FormatoFolder, ItemFolder } from "@/db/schema";
import { dataBr, montarPaginas, partesTitulo, precoFolder, TAMANHO, type Linha } from "@/modules/folder/folder";
import { formatarCelular } from "@/modules/pedidos/whatsapp";

export type DadosArte = {
  formato: FormatoFolder;
  titulo: string;
  destaque: number;
  subtitulo: string;
  secao: string;
  frase: string;
  validadeDe: string | null;
  validadeAte: string | null;
  itens: ItemFolder[];
  whatsapp: string;
  whatsapp2: string;
  instagram: string;
};

/** Foto servida pelo próprio site (mesma origem), para a exportação em imagem não esbarrar em CORS. */
const foto = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=640&q=85`;

function Preco({ i, grande }: { i: ItemFolder; grande?: boolean }) {
  const p = precoFolder(i);
  return (
    <div className={`fo-preco ${grande ? "g" : ""}`}>
      <span className="rs">R$</span>
      <span className="v">{p.valor}</span>
      <span className={`u ${i.tipoVenda === "PACOTE" ? "pac" : ""}`}>{p.unidade}</span>
    </div>
  );
}

function nomeCard(i: ItemFolder) {
  return i.pesoNominal && !i.nome.includes(i.pesoNominal) ? `${i.nome} ${i.pesoNominal}` : i.nome;
}

function LinhaCards({ l }: { l: Linha }) {
  return (
    <div className={`fo-linha ${l.tipo}`} data-n={l.itens.length}>
      {l.itens.map((i) => (
        <div key={i.id} className={`fo-card ${l.tipo}`}>
          <div className="fo-foto">
            <img src={foto(i.fotoUrl)} alt="" crossOrigin="anonymous" />
          </div>
          <div className="fo-info">
            <div className="fo-nome">{nomeCard(i)}</div>
            <Preco i={i} grande={l.tipo === "grande"} />
          </div>
        </div>
      ))}
    </div>
  );
}

const IconeZap = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 19z" />
    <path fill="currentColor" d="M9.2 8.3c.2-.4.4-.4.6-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.5.9 1.3 1.6 2.2 2.1.2.1.4.1.5 0l.6-.7c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4 0 .5-.1 1.1-.6 1.5-.5.4-1.2.6-2 .4-2.6-.7-4.6-2.8-5.3-5.2-.2-.8 0-1.5.4-1.9z" />
  </svg>
);
const IconeInsta = () => (
  <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/** Arte do folder no tamanho real (1080 px de largura). Cada `.fo-pagina` vira uma imagem/página do PDF. */
export function FolderArte({ d }: { d: DadosArte }) {
  const t = TAMANHO[d.formato];
  const paginas = montarPaginas(d.itens, d.formato);
  const zap = `https://wa.me/${d.whatsapp}`;
  const validade = d.validadeDe && d.validadeAte ? `Preços válidos de ${dataBr(d.validadeDe)} a ${dataBr(d.validadeAte)} ou enquanto durarem os estoques.` : d.validadeAte ? `Preços válidos até ${dataBr(d.validadeAte)} ou enquanto durarem os estoques.` : "";
  return (
    <>
      {paginas.map((pg, n) => (
        <div key={n} className={`fo-pagina f-${d.formato.toLowerCase()} ${n > 0 ? "cont" : ""}`} style={{ width: t.w, height: t.h }} data-pagina={n + 1}>
          <header className="fo-topo">
            <img className="fo-atm" src="/marca/hero.webp" alt="" />
            <div className="fo-topo-c">
              <div className="fo-logo">
                <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" />
              </div>
              <h1 className="fo-titulo" style={{ fontSize: Math.min(d.formato === "ENCARTE" && n === 0 ? 132 : 100, Math.floor(1850 / Math.max(8, d.titulo.length))) }}>
                {partesTitulo(d.titulo, d.destaque).map((p, i) => (
                  <span key={i} className={p.ouro ? "ouro" : ""}>
                    {p.texto}{" "}
                  </span>
                ))}
              </h1>
              <div className="fo-sub">
                <i />
                {d.subtitulo.split("/").map((parte, i) => (
                  <span key={i}>{parte.trim()}</span>
                ))}
                <i />
              </div>
            </div>
          </header>
          <div className="fo-filete" />
          <section className="fo-secao">
            <h2>{d.secao}</h2>
            <p>{d.frase}</p>
          </section>
          <div className="fo-grade">
            {pg.linhas.map((l, i) => (
              <LinhaCards key={i} l={l} />
            ))}
          </div>
          <div className="fo-cta-area">
            <a className="fo-cta" href={zap} data-link={zap}>
              <IconeZap /> ENVIAR PEDIDO PELO WHATSAPP
            </a>
            {validade && <p className="fo-validade">{validade}</p>}
          </div>
          <footer className="fo-rodape">
            <div>
              <h3>
                SEU CHURRASCO <span className="ouro">COMEÇA AQUI.</span>
              </h3>
              <b>FAÇA SEU PEDIDO</b>
              <p>Escolha seus cortes favoritos e fale diretamente com a Prime Grill Paiva pelo WhatsApp.</p>
            </div>
            <ul>
              <li>
                <a href={zap} data-link={zap}>
                  <IconeZap /> {formatarCelular(d.whatsapp.replace(/^55/, ""))}
                </a>
              </li>
              {d.whatsapp2 && (
                <li>
                  <a href={`https://wa.me/${d.whatsapp2}`} data-link={`https://wa.me/${d.whatsapp2}`}>
                    <IconeZap /> {formatarCelular(d.whatsapp2.replace(/^55/, ""))}
                  </a>
                </li>
              )}
              {d.instagram && (
                <li>
                  <a href={`https://instagram.com/${d.instagram}`} data-link={`https://instagram.com/${d.instagram}`}>
                    <IconeInsta /> @{d.instagram}
                  </a>
                </li>
              )}
            </ul>
          </footer>
        </div>
      ))}
    </>
  );
}
