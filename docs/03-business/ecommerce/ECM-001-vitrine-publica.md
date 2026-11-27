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

## 8.2 Fluxo do pedido com link do cliente (pagamento até a entrega)

1. **Novo** — o pedido chega na fila do painel (alerta "pedido novo", lista atualiza sozinha). O atendente abre e clica **Aceitar**.
2. **Em separação** — o atendente pesa cada peça; o sistema calcula o valor final e dá baixa no estoque.
3. **Aguardando cliente** — o atendente envia pelo WhatsApp o valor final **com o link do pedido** (`/pedido/<código>`). No link o cliente vê o peso real de cada peça e escolhe: Pix, cartão de crédito por link, ou na entrega/retirada.
4. **Confirmado · pagamento** — Pix: o link mostra QR Code e Pix copia-e-cola (BR Code estático) já com o valor e o código do pedido. Cartão: o atendente cola no painel o link gerado na maquininha/banco, que aparece para o cliente. O cliente pode tocar "Já paguei"; a loja confere e clica **Confirmar que o pagamento caiu**.
5. **Concluído** — entregue/retirado. Pagamento na entrega é registrado como recebido neste passo.

Alternativa manual (PG-P-001): se o cliente responder direto no WhatsApp, o atendente registra a forma de pagamento no painel. Chave Pix, nome, cidade e formas aceitas ficam em "Loja e entregas". Sem provedor de pagamento integrado (C11 continua em aberto): a conferência do Pix/cartão é feita pela loja.

## 8.3 Pix pela maquininha, pedido do WhatsApp e alteração pelo cliente

- **Pix sem chave cadastrada:** o Pix aparece para o cliente mesmo sem chave. Quando ele escolhe Pix, o atendente gera na maquininha/banco um Pix com o valor exato e cola o *copia e cola* no pedido (ou envia a foto do QR). O sistema confere o código (CRC) e **recusa se o valor for diferente do total**. Com chave cadastrada, o Pix automático continua disponível e o da maquininha pode substituí-lo.
- **Baixa do pagamento:** botão *Pagamento recebido — dar baixa* (Pix, cartão por link). Pagamento na entrega é baixado ao concluir.
- **Pedido do WhatsApp/balcão:** *Pedidos → + Novo pedido*. Mesma regra de preço, frete e estoque da loja online; endereço fora da área não bloqueia (frete digitado ou a combinar). Pode já entrar em separação.
- **Cliente altera depois de ver o valor:** no link, enquanto aguarda confirmação, o cliente pode tirar peças pesadas ou diminuir pacotes. O que sai volta ao estoque na hora (estorno pelo custo da saída), o total é recalculado e o pedido volta para *Em separação* com o aviso "Cliente alterou o pedido". A loja devolve as peças à câmara e clica *Conferido — enviar novo total*. Erros desfazem tudo (transação). O cancelamento posterior devolve só o saldo líquido que ainda está com o pedido.

## 8.4 Chat do pedido e app no celular

- **Chat do pedido:** no link do pedido o cliente tira dúvidas por escrito; o atendente responde no card "Chat com o cliente" da tela do pedido. A lista de pedidos mostra "💬 Mensagem nova do cliente" até alguém abrir o pedido. Atualiza sozinho a cada 6 s com a tela aberta. Freio: até 15 mensagens do cliente a cada 10 min por pedido; 500 caracteres. Resposta da loja fica registrada com o e-mail de quem respondeu. O código do pedido é a chave de acesso (mesma regra do link).
- **App instalável (PWA):** a loja pode ser instalada na tela inicial (Android: botão "Instalar"; iPhone: Compartilhar → Adicionar à Tela de Início). Abre em tela cheia, com ícone da marca e atalho "Fazer pedido". Sem internet, mostra a última versão do cardápio ou a página "Sem conexão"; preços e estoque sempre vêm da rede quando há conexão. O painel não passa pelo cache.
- **Meus pedidos:** o aparelho guarda os últimos 5 pedidos e mostra atalhos no topo do cardápio.
- Próximo passo possível: notificação no celular (push) quando a loja responder ou o valor final ficar pronto.

## 8.5 Acrescentar itens, anexos no chat e avisos no celular

- **Acrescentar itens a um pedido aberto** (até o pagamento ser conferido):
  - *Cliente:* no link do pedido, "+ Adicionar mais itens" abre o cardápio no modo "acrescentar ao pedido PG-…"; o carrinho envia os itens direto para o pedido.
  - *Loja:* na tela do pedido, "+ Adicionar itens a este pedido" (ex.: o cliente pediu mais pelo chat).
  - Se o pedido já tinha sido pesado, ele volta para *Em separação*: as peças já pesadas ficam travadas e só o que é novo é pesado/baixado (`pedido_itens.separados`). O total final soma tudo; o Pix/link de pagamento antigo é descartado. Estoque reservado = unidades ainda não separadas de pedidos abertos.
  - Pedido já pago não aceita acréscimo (faz-se um pedido novo).
- **Chat com anexos:** cliente e loja podem enviar foto (JPG/PNG/WebP) ou PDF de até 5 MB — ex.: folder, foto do corte, comprovante. Tipo conferido pelos bytes do arquivo; nome aleatório no armazenamento.
- **Avisos no celular (Web Push):**
  - *Cliente* ativa "Receber avisos deste pedido" no link: pedido aceito, valor final pronto, itens acrescentados pela loja, Pix/link de pagamento pronto, pagamento confirmado, entregue/retirado, cancelado e respostas da loja no chat.
  - *Equipe* ativa "Ativar avisos neste aparelho" no menu do painel: novo pedido, mensagem do cliente, cliente confirmou/escolheu pagamento, avisou que pagou, tirou ou acrescentou itens.
  - Android e computador: funciona no navegador ou no app instalado. iPhone (iOS 16.4+): só com o app instalado na Tela de Início.
  - Chaves VAPID: variáveis `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` se existirem; senão o sistema gera uma vez e guarda no banco (`chaves_sistema`).
  - Com o app aberto em segundo plano, o título da aba mostra "💬 Nova mensagem".

## 8.6 Idiomas (PT / EN / ES), turistas e mais controle no painel

- **Seletor PT · EN · ES** no topo da loja. Na primeira visita vale o idioma do celular (pt, en, es; outro idioma → inglês); a escolha fica salva por 1 ano.
- Traduzido: cardápio (categorias e subtítulos), produto, carrinho, checkout, link do pedido, formas de pagamento, alteração/acréscimo de itens, chat, avisos no celular, cadastro de ofertas e descadastro, página sem conexão (nos três idiomas). Política de privacidade: resumo em EN/ES no topo; o texto legal continua em português.
- Nomes de produtos e marcas não são traduzidos. Valores seguem em reais no formato brasileiro.
- Erros do servidor (CEP, estoque, pagamento…) são traduzidos na tela do cliente (`modules/i18n/erros.ts`).
- **Celular estrangeiro:** aceita número com código do país (+1, +54…); links de WhatsApp e cadastro funcionam para os dois tipos.
- **Idioma no pedido** (`pedidos.idioma`): avisos no celular, mensagens prontas de WhatsApp do painel (valor final, Pix, cartão, saiu/pronto, cancelamento) e o motivo de cancelamento saem no idioma do cliente. O painel mostra "🇺🇸 inglês"/"🇪🇸 espanhol" no pedido e na lista.
- Textos ficam em `src/modules/i18n/` (`textos.ts`, `avisos.ts`, `mensagens-loja.ts`); um teste garante que os três idiomas têm as mesmas chaves.
- **Recusar/cancelar no painel:** botão em todas as etapas até o pagamento, com motivos prontos (esgotado, fora da área, sem horário, duplicado, a pedido do cliente, sem pagamento) ou texto livre. O estoque volta sozinho, o cliente vê o motivo no link e recebe aviso. Pedido já pago continua só no ajuste manual do gerente.
- **Loja define a forma de pagamento:** no passo "Cliente confirma", botões Pix / Cartão / Na entrega–retirada para definir sem esperar o cliente; também dá para trocar a forma depois. O cliente recebe o aviso e o link mostra como pagar.

## 8.7 Aviso de peso variável e forma de pagamento no checkout

- **Banner no checkout** (quando há peça vendida por kg): os produtos por kg variam de peso, peça a peça; a loja separa e pesa o pedido e o cliente recebe o peso real e o valor final ao fim da separação, e só então confirma e paga. Em PT/EN/ES.
- **Forma de pagamento escolhida no pedido:** o checkout pede Pix, cartão (link) ou na entrega/retirada, entre as formas ativas em Loja e entregas. Fica gravada em `pedidos.forma_pagamento` desde o pedido NOVO.
- **Painel:** a lista mostra "💳 Pix/Cartão/Na entrega"; o aviso de pedido novo no celular também. Nos passos Aceitar e Separar aparece "O cliente quer pagar com …". Depois da pesagem o passo vira "o cliente escolheu …: cobre agora", com um botão (ex.: "Cobrar com Pix agora") que confirma e já mostra o Pix/link do cartão para enviar. Ainda dá para só mandar o valor para o cliente conferir ou usar outra forma.
- No link do pedido, a forma escolhida já vem marcada quando o cliente confere o valor final.

## 8.8 Link do pedido se atualiza sozinho

O link do pedido confere a cada 8 s (só com a tela visível), quando o cliente volta para a página e quando chega um aviso no celular se algo mudou (`/pedido/{código}/versao`, impressão digital de status, valor, Pix, link do cartão e itens). Mudou → a página se atualiza sem recarregar. Antes era um recarregamento a cada 25 s que não rodava com a aba em segundo plano.
