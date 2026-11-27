import { textosAtuais } from "@/lib/idioma";
import { CadastroOfertas } from "@/components/cadastro-ofertas";
import { FaixaModoAdicionar } from "@/components/modo-adicionar";
import { AjudaFlutuante, MeusPedidos } from "@/components/app-instalavel";
import Link from "next/link";
import { Preco, textoAproximado, textoDisponivel } from "@/components/preco";
import { catalogoPublico, configLoja } from "@/lib/dados";
import { situacaoLoja } from "@/modules/loja/horario";
import { formatarCelular } from "@/modules/pedidos/whatsapp";

export const dynamic = "force-dynamic";

export default async function Cardapio() {
  const [grupos, config, { t }] = await Promise.all([catalogoPublico(), configLoja(), textosAtuais()]);
  const sit = situacaoLoja(config, new Date());
  const textoSit = t.loja.situacao(sit.situacao);
  const nomeCat = (slug: string, nome: string) => t.categorias[slug] ?? nome;
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
                {sit.aberta ? t.loja.aberta : t.loja.fechada}
              </span>
              <span>· {textoSit}</span>
              <span>· {t.loja.entregaRetirada}</span>
            </div>
            <MeusPedidos />
            <FaixaModoAdicionar />
          </div>
        </div>
      </header>

      <nav className="cats" aria-label={t.loja.categoriasAria}>
        <div className="v-wrap">
          {visiveis.map((g) => (
            <a key={g.categoria.slug} href={`#${g.categoria.slug}`}>
              {nomeCat(g.categoria.slug, g.categoria.nome)}
            </a>
          ))}
        </div>
      </nav>

      <main className="v-wrap">
        {!sit.aberta && (
          <p className="aviso" style={{ marginTop: 18 }}>
            {t.loja.avisoFechada(textoSit)}
          </p>
        )}
        {visiveis.map((g) => (
          <section key={g.categoria.slug} aria-labelledby={`t-${g.categoria.slug}`}>
            <div className="sec-t" id={g.categoria.slug}>
              <h2 id={`t-${g.categoria.slug}`}>{nomeCat(g.categoria.slug, g.categoria.nome)}</h2>
              {t.subtitulos[g.categoria.slug] && <p>{t.subtitulos[g.categoria.slug]}</p>}
            </div>
            <div className="grade">
              {g.itens.map((p) => {
                const disp = textoDisponivel(p, t);
                return (
                  <Link key={p.id} href={`/produto/${p.slug}`} className={`card-p${disp ? "" : " indisp"}`}>
                    {p.fotoUrl ? <img src={p.fotoUrl} alt="" loading="lazy" /> : <span className="sem" />}
                    <div className="i">
                      <h3>
                        {p.nome}
                        {p.pesoNominal ? ` ${p.pesoNominal}` : ""}
                      </h3>
                      <Preco p={p} t={t} />
                      <span className="aprox">{textoAproximado(p, t)}</span>
                      <span className={`disp${disp ? "" : " no"}`}>{disp ?? t.produto.indisponivel}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        <CadastroOfertas />
        <footer className="rodape-v">
          <span>
            <b>Prime Grill Paiva</b> · {t.loja.slogan}
          </span>
          <span>
            WhatsApp{" "}
            <a href={`https://wa.me/55${zap.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="link-rodape">
              {formatarCelular(zap)}
            </a>
            {config.whatsapp2 && (
              <>
                {" · "}
                <a href={`https://wa.me/55${config.whatsapp2.replace(/^55/, "").replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="link-rodape">
                  {formatarCelular(config.whatsapp2.replace(/^55/, ""))}
                </a>
              </>
            )}
          </span>
          {config.instagram && (
            <a href={`https://instagram.com/${config.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="link-rodape">
              @{config.instagram.replace(/^@/, "")}
            </a>
          )}
          <a href="/privacidade" style={{ textDecoration: "underline" }}>
            {t.loja.politica}
          </a>
        </footer>
      </main>
      <AjudaFlutuante whatsapp={config.whatsapp} />
    </>
  );
}
