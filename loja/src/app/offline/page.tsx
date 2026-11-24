import { TEXTOS } from "@/modules/i18n/textos";

export const metadata = { title: "Sem conexão — Prime Grill Paiva", robots: { index: false } };

/** Mostrada pelo app quando o celular está sem internet. Fica guardada no aparelho, por isso traz os três idiomas. */
export default function SemConexao() {
  return (
    <main className="offline">
      <div className="placa">
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 40 }} />
      </div>
      {(["pt", "en", "es"] as const).map((l) => (
        <section key={l} lang={l} style={{ maxWidth: 360 }}>
          <h1 style={{ fontFamily: "var(--f-display)", fontSize: l === "pt" ? 26 : 18 }}>{TEXTOS[l].offline.titulo}</h1>
          <p style={{ color: "#CFC6B8", lineHeight: 1.5, fontSize: l === "pt" ? 15 : 13.5 }}>{TEXTOS[l].offline.texto}</p>
        </section>
      ))}
      <a href="/" className="btn-ouro centro" style={{ flex: "none", padding: "0 28px" }}>
        {TEXTOS.pt.offline.tentar} · {TEXTOS.en.offline.tentar} · {TEXTOS.es.offline.tentar}
      </a>
    </main>
  );
}
