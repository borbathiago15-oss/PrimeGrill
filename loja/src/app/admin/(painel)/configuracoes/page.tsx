import { FormConfig, FormEntrega } from "./forms";
import { configLoja } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  const config = await configLoja();
  return (
    <>
      <div className="topo">
        <h1>Loja e entregas</h1>
      </div>
      <div className="cont">
        <FormEntrega entrega={config.entrega} />
        <FormConfig config={config} />
      </div>
    </>
  );
}
