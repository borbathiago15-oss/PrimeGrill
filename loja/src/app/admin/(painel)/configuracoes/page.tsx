import { exigirPermissao, usuarioAtual } from "@/lib/admin";
import { pode } from "@/modules/usuarios/permissoes";
import { FormConfig, FormEntrega, FormPagamento, FormPrivacidade } from "./forms";
import { configLoja } from "@/lib/dados";

export const dynamic = "force-dynamic";

export default async function Configuracoes() {
  await exigirPermissao("lojaEntregas");
  const config = await configLoja();
  const eu = await usuarioAtual();
  return (
    <>
      <div className="topo">
        <h1>Loja, entregas e pagamento</h1>
      </div>
      <div className="cont">
        <FormEntrega entrega={config.entrega} />
        {eu && pode(eu.papel, "pagamento") && <FormPagamento pagamento={config.pagamento} />}
        {eu && pode(eu.papel, "pagamento") && <FormPrivacidade privacidade={config.privacidade} />}
        <FormConfig config={config} />
      </div>
    </>
  );
}
