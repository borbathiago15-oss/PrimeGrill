# ECM-001 — Vitrine Pública (cardápio online)

**Versão:** 1.0.0
**Status:** 🟡 In Review
**Referência:** modelo de cardápio online (Goomer), analisado em 2026-11-15

## 1. Objetivo

Ser a **entrada pública** do sistema: um cardápio online rápido, pensado para celular, sem login para navegar. Por trás, o ERP executa todo o fluxo (reserva, pesagem, pagamento, entrega).

## 2. O que adotamos do modelo de referência

- Abre direto no cardápio; cabeçalho com logo, status **Aberta/Fechada** e endereço de entrega.
- Categorias fixas no topo, rolagem contínua e seção de promoções.
- Detalhe do produto com foto, descrição, quantidade e observação curta.
- Carrinho fixo no rodapé ("Revisar pedido").
- Checkout curto: **Entrega ou Retirada no local**, endereço, nome e celular, sem cadastro obrigatório.
- Página "Sobre": endereço, horários por dia e formas de pagamento.

## 3. O que fazemos diferente

| No modelo de referência | Na Prime Grill |
|---|---|
| "Valor aproximado da peça" cobrado como preço | Aproximado só como referência; cobrança pelo peso real (PES-001) |
| R$/kg digitado no texto da descrição | R$/kg vem do preço aprovado, formatado pelo sistema |
| Mesmo produto com preços diferentes em seções diferentes | Um preço por produto; promoção é regra de preço |
| Sem controle de estoque | Só aparece o que está disponível, em tempo real |
| Pagamento só na entrega | Link de pagamento após a pesagem confirmada (C11) |

## 4. Cards por tipo de venda (CAT-001)

- **Peça inteira:** `Picanha Angus Black · R$ 159,90 KG · aprox. R$ 228 a peça · 13 disponíveis` — aviso fixo "valor final após pesagem".
- **Pacote:** `Frango Barbecue 900 g · R$ 24,90 · PACOTE · 19 disponíveis`.

## 5. Checkout

1. Entrega ou retirada.
2. Entrega: CEP → zona de entrega → frete, prazo e pedido mínimo da zona; CEP fora da cobertura é recusado com mensagem.
3. Nome e celular; **consentimento LGPD** e **opt-in do WhatsApp** explícitos.
4. Observação (até 180 caracteres), sem pedidos que gerem cobrança extra.
5. Envio → pedido provisório com reserva; o cliente acompanha o status por uma página própria e pelo WhatsApp.

## 6. Configurações da loja

Horário por dia da semana, **pausa temporária** da loja, zonas de entrega (faixa de CEP, lista de bairros ou polígono) com taxa, prazo e pedido mínimo, formas de pagamento exibidas.

## 7. Visual

Tema **Carvão** do DS-001 (fundo escuro valoriza as fotos de churrasqueira), dourado para preço e ação principal.

## 8. MVP aprovado (2026-11-21)

Primeira versão em produção, antes do ERP completo:

- Cardápio, detalhe do produto, carrinho e checkout conforme §2–§5.
- **Pedido salvo no sistema e enviado pronto para o WhatsApp da loja** (sem pagamento online).
- Disponibilidade controlada manualmente no painel (disponível/indisponível e quantidade opcional), até o módulo de estoque existir.
- **Frete por distância** (decisão de 2026-11-21, substitui as zonas por bairro): ver §8.1.
- Painel administrativo: login, produtos (com tipo de venda CAT-001), pedidos com status manual, horários, pausa, endereço da loja e faixas de frete.
- Página de acompanhamento do pedido para o cliente (status e horários, sem anotações internas).
- Fora do MVP: reserva automática, pesagem pelo sistema, link de pagamento, integração com estoque e nota fiscal.

### 8.1 Frete por distância

1. O administrador informa o **endereço da loja**; o sistema localiza o ponto no mapa (OpenStreetMap/Nominatim) ou aceita latitude e longitude digitadas.
2. O administrador cadastra **faixas**: "até X km → taxa, prazo, pedido mínimo". A menor faixa que cobre a distância é a cobrada; acima da maior, o endereço está **fora da área**.
3. O cliente digita o **CEP**: o sistema obtém o endereço (ViaCEP) e as coordenadas (BrasilAPI ou Nominatim), calcula a distância em linha reta × **fator de rota** (padrão 1,3) e mostra o frete antes do pedido.
4. O pedido **recalcula o frete no servidor**; o valor do navegador nunca é usado.
5. CEP sem coordenadas: o pedido segue com **frete a confirmar** pelo WhatsApp (PG-P-001); o painel permite digitar o frete na calculadora de pesagem.
6. Localizações de CEP ficam em cache no banco (`geo_cache`).

Limitações conhecidas: a distância é estimada (linha reta × fator), não a rota real; o ponto usado é o do CEP, não o do número da casa.

## 9. Pendências

C9 (validade da reserva), C11 (pagamento), decisão sobre cadastro opcional de cliente e sobre observações de corte/porcionamento.
