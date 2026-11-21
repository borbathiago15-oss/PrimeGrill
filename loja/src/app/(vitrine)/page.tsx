import Link from "next/link";
import { Preco, textoAproximado, textoDisponivel } from "@/components/preco";
import { catalogoPublico, configLoja } from "@/lib/dados";
import { situacaoLoja } from "@/modules/loja/horario";
import { formatarCelular } from "@/modules/pedidos/whatsapp";

export const dynamic = "force-dynamic";

const SUBTITULOS: Record<string, string> = {
  bovinos: "Cortes premium",
  suinos: "Para a brasa",
  aves: "Temperados e prontos",
  cordeiro: "Sabor marcante",
};

export default async function Cardapio() {
  const [grupos, config] = await Promise.all([catalogoPublico(), configLoja()]);
  const sit = situacaoLoja(config, new Date());
  const visiveis = grupos.filter((g) => g.itens.length > 0);
  const zap = config.whatsapp.replace(/^55/, "");

  return (
    <>
      <header className="hero">
        <img src="/marca/hero.webp" alt="" />
        <div className="hero-c">
          <div className="v-wrap">
            <div className="placa">
              <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" />
            </div>
            <div className="status">
              <span className={sit.aberta ? "on" : "off"}>
                <i />
                {sit.aberta ? "Aberta" : "Fechada"}
              </span>
              <span>· {sit.texto}</span>
              <span>· Entrega e retirada</span>
            </div>
          </div>
        </div>
      </header>

      <nav className="cats" aria-label="Categorias">
        <div className="v-wrap">
          {visiveis.map((g) => (
            <a key={g.categoria.slug} href={`#${g.categoria.slug}`}>
              {g.categoria.nome}
            </a>
          ))}
        </div>
      </nav>

      <main className="v-wrap">
        {!sit.aberta && (
          <p className="aviso" style={{ marginTop: 18 }}>
            Estamos fechados agora ({sit.texto.toLowerCase()}). Você pode montar o pedido e enviar; ele será atendido no próximo horário.
          </p>
        )}
        {visiveis.map((g) => (
          <section key={g.categoria.slug} aria-labelledby={`t-${g.categoria.slug}`}>
            <div className="sec-t" id={g.categoria.slug}>
              <h2 id={`t-${g.categoria.slug}`}>{g.categoria.nome}</h2>
              {SUBTITULOS[g.categoria.slug] && <p>{SUBTITULOS[g.categoria.slug]}</p>}
            </div>
            <div className="grade">
              {g.itens.map((p) => {
                const disp = textoDisponivel(p);
                return (
                  <Link key={p.id} href={`/produto/${p.slug}`} className={`card-p${disp ? "" : " indisp"}`}>
                    {p.fotoUrl ? <img src={p.fotoUrl} alt="" loading="lazy" /> : <span className="sem" />}
                    <div className="i">
                      <h3>
                        {p.nome}
                        {p.pesoNominal ? ` ${p.pesoNominal}` : ""}
                      </h3>
                      <Preco p={p} />
                      <span className="aprox">{textoAproximado(p)}</span>
                      <span className={`disp${disp ? "" : " no"}`}>{disp ?? "Indisponível no momento"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        <footer className="rodape-v">
          <span>
            <b>Prime Grill Paiva</b> · Cortes premium para momentos especiais
          </span>
          <span>WhatsApp {formatarCelular(zap)} · (81) 98206-1289</span>
          <span>@primegrill_paiva</span>
        </footer>
      </main>
    </>
  );
}
