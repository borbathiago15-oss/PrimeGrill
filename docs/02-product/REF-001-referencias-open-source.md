# REF-001 — Referências Open Source e Ideias Incorporáveis

**Versão:** 1.0.0
**Status:** 🟡 In Review
**Data da pesquisa:** 2026-11-15 (licenças e atividade conferidas na API do GitHub)

> Nenhum código foi copiado. Repositórios com licença GPL/AGPL ou não comercial servem **somente** como referência de ideias e fluxos.

## 1. Conclusão principal

Não existe projeto open source relevante de açougue ou e-commerce com pesagem antes da cobrança. Esse fluxo é diferencial da Prime Grill e é desenhado internamente (EST-001, PES-001).

## 2. Repositórios por módulo

| Módulo | Repositório | Licença | O que aproveitar |
|---|---|---|---|
| Arquitetura | kgrzybek/modular-monolith-with-ddd | MIT | Monólito modular .NET, um projeto por módulo, outbox/inbox, testes de arquitetura |
| Fiscal + PDV | JoaoHenriqueBarbosa/FinOpenPOS | MIT | Dinheiro em centavos; motor de impostos separado do XML; `invoices`/`invoice_items`/`invoice_events`; contingência NFC-e; CEP via ViaCEP/BrasilAPI |
| Fiscal (.NET) | ZeusAutomacao/DFe.NET | LGPL-2.1 | Biblioteca NF-e/NFC-e usável como dependência NuGet (caso C12 = emissão direta) |
| Vitrine / delivery | tastyigniter/TastyIgniter | MIT | Áreas de entrega por polígono, raio ou endereço; taxa por área e valor; horários e pausas |
| Vitrine (BR) | eusougabrielgadelha/delivery-free | PolyForm Noncommercial | **Só ideias**: zonas por CEP/bairro com taxa, prazo e mínimo; Kanban de pedidos com cronômetro; acompanhamento com "confirmar recebimento"; loja com pausa |
| Vitrine | mighty840/kitchenasty | MIT | Entrega/retirada, cupons, avaliações |
| E-commerce headless | saleor/saleor, medusajs/medusa | BSD-3 / MIT | Referência de carrinho, checkout, promoções e pagamentos |
| WhatsApp | gokapso/whatsapp-cloud-inbox | MIT | Caixa de atendimento sobre a API oficial; templates; janela de 24 h |
| Studio | vercel/satori | MPL-2.0 | HTML/CSS → SVG sem navegador, para artes de rede social |
| Studio | pdfme/pdfme | MIT | Template com parte fixa + campos; alternativa para o encarte A4 |
| Evitar como código | frappe/erpnext (GPL-3), LivreOS (AGPL-3), stoq (GPL-2) | — | Apenas estudo de fluxo |

Fluxo externo de referência: plugin "CookiePrime Sold by Weight" (total **estimado** + estado **Aguardando pesagem**) e módulos de catch weight do Odoo (duas unidades por item e tolerância por produto).

## 3. Ideias propostas para incorporação

| # | Ideia | Destino | Situação |
|---|---|---|---|
| 1 | Dinheiro em centavos inteiros, peso em gramas inteiras | ADR-004 | Incorporada |
| 2 | Motor de impostos separado do XML + eventos fiscais | Fiscal | Proposta |
| 3 | Duas unidades (kg + peças) e tolerância por produto | EST-001, PES-001 | Incorporada (tolerância: C6) |
| 4 | Estado "Aguardando pesagem" com total estimado | PES-001 | Incorporada |
| 5 | Zonas de entrega por CEP, bairro ou polígono | ECM-001 | Proposta |
| 6 | Loja com pausa e horário por dia | ECM-001 | Proposta |
| 7 | Kanban de pedidos com cronômetro por etapa | Pedidos | Proposta |
| 8 | Página de acompanhamento com "confirmar recebimento" | ECM-001 | Proposta |
| 9 | Contingência fiscal NFC-e | Fiscal | Proposta (depende de C12) |
| 10 | Testes de arquitetura entre módulos | ADR-001 | Proposta |
| 11 | Caixa de atendimento WhatsApp com janela de 24 h | WhatsApp | Proposta |
| 12 | Satori para redes sociais, Chromium para PDF | ADR-003 | Proposta |
