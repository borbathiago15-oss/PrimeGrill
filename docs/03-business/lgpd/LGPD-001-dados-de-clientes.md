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

## 4. Pendências

- Política de privacidade publicada na loja (texto para o cliente) com o canal de contato do encarregado.
- Prazo de retenção definido com o contador para pedidos antigos (ex.: anonimizar automaticamente após X anos).
- Exportação dos dados do titular (direito de acesso/portabilidade, art. 18, II e V), se for pedido.
