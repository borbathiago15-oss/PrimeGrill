import Link from "next/link";
import { configLoja } from "@/lib/dados";
import { formatarCnpj } from "@/modules/loja/cnpj";
import { formatarCelular } from "@/modules/pedidos/whatsapp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Política de privacidade — Prime Grill Paiva" };

/** Data da última revisão do texto. Atualize ao mudar o que o sistema coleta ou com quem compartilha. */
const ATUALIZADA_EM = "23 de novembro de 2026";

/**
 * Política de privacidade (LGPD). O texto descreve o que o sistema realmente faz (ver LGPD-001);
 * a identificação da empresa vem do painel (Loja e entregas → Privacidade) e só aparece se estiver preenchida.
 */
export default async function Privacidade() {
  const config = await configLoja();
  const pv = config.privacidade;
  const zap = formatarCelular(config.whatsapp.replace(/^55/, ""));
  const linkZap = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Olá! Quero falar sobre os meus dados pessoais (LGPD).")}`;

  return (
    <main className="politica">
      <Link href="/" className="voltar">
        ‹ Voltar ao cardápio
      </Link>
      <h1>Política de privacidade</h1>
      <p className="atualizada">Atualizada em {ATUALIZADA_EM}</p>

      <section>
        <h2>1. Quem cuida dos seus dados</h2>
        <p>
          <b>Prime Grill Paiva</b>
          {pv.razaoSocial && <> ({pv.razaoSocial})</>}
          {pv.cnpj && <>, CNPJ {formatarCnpj(pv.cnpj)}</>} é a responsável (controladora) pelos dados pessoais tratados nesta loja online, no atendimento pelo WhatsApp e no balcão.
        </p>
        <p>
          Contato para assuntos de privacidade: WhatsApp <a href={linkZap}>{zap}</a>
          {pv.email && (
            <>
              {" "}
              ou e-mail <a href={`mailto:${pv.email}`}>{pv.email}</a>
            </>
          )}
          {pv.encarregado && <>. Encarregado(a) pelo tratamento de dados: {pv.encarregado}</>}.
        </p>
      </section>

      <section>
        <h2>2. Que dados usamos</h2>
        <ul>
          <li>
            <b>Para o pedido:</b> nome, celular, e — se for entrega — CEP, endereço, número, complemento e bairro; os itens, o peso real das peças, os valores e a forma de pagamento.
          </li>
          <li>
            <b>Conversa do pedido:</b> as mensagens, fotos e PDFs trocados no chat do pedido.
          </li>
          <li>
            <b>Avisos no celular:</b> se você ativar, um endereço técnico fornecido pelo seu navegador para enviarmos notificações (não inclui seu número nem sua localização).
          </li>
          <li>
            <b>Promoções:</b> só se você marcar que quer receber — nome, celular e a data em que aceitou.
          </li>
          <li>
            <b>No seu aparelho:</b> o carrinho e a lista “Meus pedidos” ficam guardados apenas no seu celular/navegador. Não usamos cookies de propaganda nem ferramentas de rastreamento.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Para que usamos e com qual base legal</h2>
        <ul>
          <li>
            <b>Preparar, cobrar e entregar o seu pedido</b>, falar com você sobre ele e responder dúvidas — execução do contrato de compra (LGPD, art. 7º, V).
          </li>
          <li>
            <b>Guardar o registro das vendas</b> (itens, valores, pagamentos) pelo prazo exigido pela legislação fiscal e contábil — cumprimento de obrigação legal (art. 7º, II).
          </li>
          <li>
            <b>Avisos no celular e envio de promoções e do folder da semana</b> — somente com o seu consentimento (art. 7º, I), que você pode retirar quando quiser.
          </li>
        </ul>
        <p>Não vendemos nem alugamos seus dados.</p>
      </section>

      <section>
        <h2>4. Com quem compartilhamos</h2>
        <p>Só com os serviços necessários para a loja funcionar:</p>
        <ul>
          <li>Hospedagem do site, banco de dados e arquivos (Vercel e Neon), com acesso protegido.</li>
          <li>Consulta do CEP para calcular a distância e o frete (ViaCEP, BrasilAPI e OpenStreetMap): enviamos apenas o CEP ou o endereço de entrega.</li>
          <li>Serviços de notificação do seu navegador ou celular (Google, Apple ou Mozilla), se você ativar os avisos.</li>
          <li>WhatsApp, quando você ou nós usamos o WhatsApp para falar sobre o pedido.</li>
          <li>Seu banco ou a empresa da maquininha, quando você paga com Pix ou cartão (a loja não recebe nem guarda dados do seu cartão).</li>
          <li>Autoridades, quando a lei exigir.</li>
        </ul>
      </section>

      <section>
        <h2>5. Por quanto tempo guardamos</h2>
        <p>
          Os dados do pedido ficam enquanto forem necessários para atender você e cumprir a lei. Se você pedir a exclusão, apagamos seu nome, celular, endereço, as conversas e os arquivos; o registro da venda continua guardado <b>sem identificar você</b>, porque a lei exige.
        </p>
      </section>

      <section>
        <h2>6. Seus direitos</h2>
        <p>Você pode, a qualquer momento e sem custo (LGPD, art. 18):</p>
        <ul>
          <li>confirmar se tratamos seus dados e ter acesso a eles;</li>
          <li>corrigir dados incompletos ou errados;</li>
          <li>pedir a exclusão dos seus dados pessoais;</li>
          <li>retirar o consentimento para promoções e avisos (inclusive pelo link “não quero mais receber” das mensagens);</li>
          <li>saber com quem compartilhamos e pedir informações sobre o tratamento.</li>
        </ul>
        <p>
          Para pedir, fale conosco pelo WhatsApp <a href={linkZap}>{zap}</a>
          {pv.email && (
            <>
              {" "}
              ou pelo e-mail <a href={`mailto:${pv.email}`}>{pv.email}</a>
            </>
          )}
          . Para sua segurança, confirmamos que o pedido vem do próprio titular (por exemplo, pelo mesmo número de celular) e respondemos em até 15 dias. Você também pode procurar a Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </section>

      <section>
        <h2>7. Segurança</h2>
        <p>
          O site usa conexão segura (HTTPS). O acesso ao painel da loja é pessoal, com senha, e cada pessoa da equipe vê só o que precisa para o trabalho; as ações ficam registradas com o nome de quem fez.
        </p>
      </section>

      <section>
        <h2>8. Mudanças nesta política</h2>
        <p>Se mudarmos o jeito de tratar seus dados, atualizamos esta página e a data no topo.</p>
      </section>
    </main>
  );
}
