import { FormConfig, FormEntrega, FormPagamento } from "./forms";
import { configLoja } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  const config = await configLoja();
  return (
    <>
      <div className="topo">
        <h1>Loja, entregas e pagamento</h1>
      </div>
      <div className="cont">
        <FormEntrega entrega={config.entrega} />
        <FormPagamento pagamento={config.pagamento} />
        <FormConfig config={config} />
      </div>
    </>
  );
}
