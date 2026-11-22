export const metadata = { title: "Sem conexão — Prime Grill Paiva", robots: { index: false } };

/** Mostrada pelo app quando o celular está sem internet e a página não estava guardada. */
export default function SemConexao() {
  return (
    <main className="offline">
      <div className="placa">
        <img src="/marca/logo-preta.png" alt="Prime Grill Paiva" style={{ height: 40 }} />
      </div>
      <h1 style={{ fontFamily: "var(--f-display)", fontSize: 26 }}>Sem conexão</h1>
      <p style={{ maxWidth: 340, color: "#CFC6B8", lineHeight: 1.5 }}>Seu celular está sem internet. Assim que voltar, o cardápio atualiza com os preços e o estoque do momento.</p>
      <a href="/" className="btn-ouro centro" style={{ flex: "none", padding: "0 28px" }}>
        Tentar de novo
      </a>
    </main>
  );
}
