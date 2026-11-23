# LGPD-001 — Dados pessoais de clientes e pedido de exclusão

**Status:** implementado (MVP) · **Relacionados:** ECM-001, USR-001

> Este documento descreve como o sistema trata o pedido do titular. Não substitui orientação jurídica: vale revisar com o contador/advogado da loja, principalmente o prazo de guarda dos registros de venda.

## 1. Que dados pessoais o sistema guarda

| Onde | Dados |
|---|---|
| Pedido | nome, celular, CEP, endereço, número, complemento, bairro, cidade, observação, aceite de avisos |
| Chat do pedido | mensagens, fotos e PDFs enviados |
| Avisos no celular | endereço técnico de notificação do aparelho, ligado ao pedido |
| Aparelho do cliente | carrinho e "Meus pedidos" (ficam só no celular dele, não no servidor) |

Não há cadastro separado de cliente: o cliente é identificado pelo **celular** dos pedidos (loja online, WhatsApp e balcão). A tela **Clientes** (Dono e Gerente) agrupa os pedidos por celular.

## 2. Pedido de exclusão (LGPD art. 18, VI)

Quem pode: **somente o Dono** (acesso principal ou usuário com papel Dono).

Caminho: Painel → **Clientes** → cliente → **Apagar dados deste cliente (LGPD)**.

Regras:
1. Pedido **em andamento** (Novo, Em separação, Aguardando cliente, Confirmado) bloqueia a exclusão: concluir ou cancelar antes.
2. Dupla confirmação: digitar de novo o celular do cliente e informar o **motivo** (ex.: "pedido do titular pelo WhatsApp em 23/11").
3. O que acontece, em uma única transação:
   - **Anonimiza** todos os pedidos daquele celular: nome vira "Cliente removido (LGPD)"; celular, endereço, observação e aceite de avisos são apagados.
   - **Apaga** o chat desses pedidos (mensagens) e os **arquivos** enviados (fotos/PDFs e fotos de QR do Pix), e as inscrições de **avisos no celular**.
   - **Mantém**, sem identificar ninguém: itens, valores, pesagens, pagamentos e movimentações de estoque — o registro da venda precisa ser guardado por obrigação legal/fiscal (LGPD art. 16, I). Dados anonimizados não são mais dados pessoais (art. 12).
   - Grava no histórico de cada pedido "Dados pessoais do cliente apagados a pedido do titular (LGPD)".
4. **Registro da exclusão** (prova de atendimento, sem o dado apagado): data e hora, 4 últimos dígitos do celular, quantidade de pedidos/mensagens/arquivos, motivo e quem fez. Visível só para o Dono, no fim da tela Clientes.
5. Não dá para desfazer.

## 3. Como o cliente pede

Pelo chat do pedido, pelo WhatsApp da loja ou pessoalmente. A loja confirma que o pedido vem do próprio titular (ex.: mensagem do mesmo número) antes de apagar, e responde confirmando a exclusão.

## 4. Política de privacidade

Página pública **/privacidade** (link no rodapé do cardápio, no aceite do checkout, no cadastro de ofertas e no link do pedido). O texto descreve o que o sistema realmente faz (dados, finalidades e bases legais, compartilhamento, retenção, direitos, segurança). Razão social, CNPJ (com conferência dos dígitos), encarregado e e-mail de privacidade são preenchidos pelo Dono em **Loja e entregas → Privacidade (LGPD)**; o que estiver em branco não aparece. Ao mudar o que o sistema coleta ou com quem compartilha, atualizar o texto e a data (`ATUALIZADA_EM`).

## 5. Promoções e folder (marketing)

- Base legal: **consentimento** (art. 7º, I), separado do aceite do pedido.
- Onde o cliente aceita: caixa própria e **desmarcada** no checkout; cadastro "Receba as ofertas da semana" no cardápio (caixa obrigatória); ou registrado pela loja no painel quando o cliente pede no balcão/WhatsApp (fica gravado quem anotou).
- Cadastro: `inscritos_promocoes` — nome, celular, origem, data do aceite, quem registrou, data de saída e um código aleatório para o link de saída.
- Envio: painel → **Promoções** → campanha (mensagem com `{nome}` + folder opcional). Cada mensagem leva o link público do folder (`/ofertas/<id>`), o cardápio e **"Não quer mais receber?" (`/sair/<código>`)**. Hoje o envio é um toque por cliente pelo WhatsApp da loja, com controle de quem já recebeu; com a API oficial do WhatsApp Business pode virar automático.
- Saída: pelo link (um toque de confirmação) ou pela loja ("Tirar da lista" quando o cliente responde SAIR). Quem saiu não aparece mais nas campanhas.
- Exclusão LGPD do cliente também apaga o cadastro de promoções daquele celular.

## 6. Pendências

- Prazo de retenção definido com o contador para pedidos antigos (ex.: anonimizar automaticamente após X anos).
- Exportação dos dados do titular (direito de acesso/portabilidade, art. 18, II e V), se for pedido.
