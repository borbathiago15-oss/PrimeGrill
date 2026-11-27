# FIN-001 — Financeiro: caixa, contas a receber, contas a pagar e conciliação

Status: implementado (fase 1) · 2026-11-27 · PG-000 §12

## 1. O que entra no financeiro

| Origem | Quando | Como |
|---|---|---|
| Pedido pago por Pix ou cartão (link) | "Pagamento recebido — dar baixa" | Receita `VENDA`, forma do pedido |
| Pedido pago na entrega/retirada | "Entregue/Retirado e recebido em: Dinheiro · Pix · Débito · Crédito" | Receita `VENDA` com a forma real; dinheiro entra no caixa aberto |
| Despesa / conta a pagar | Lançada em Financeiro → Contas a pagar | `DESPESA` com categoria, vencimento e fornecedor opcional |
| Nota de entrada recebida | Botão "Criar conta a pagar" com o vencimento do boleto | `DESPESA` `FORNECEDOR`, uma por nota |

- Um lançamento por pedido (índice único). Pedido pago cancelado no ajuste manual → a receita fica `CANCELADO` (o estorno ao cliente é feito fora do sistema).
- Pedidos pagos antes desta versão foram importados pela migração 0016 (forma "Não informado" quando era na entrega).
- Datas em `AAAA-MM-DD` no fuso de Recife; valores em centavos (ADR-004).

## 2. Taxas e prazos

Em Recebimentos → "Taxas da maquininha/banco": % do Pix, débito, crédito e link, e em quantos dias cada um cai. A taxa é calculada no recebimento; o líquido = bruto − taxa. Padrão: taxas 0%, débito D+1, crédito e link D+30 — **o dono deve informar as taxas do contrato**.

## 3. Conciliação

Pix e cartão ficam "para conferir" até alguém marcar que caiu no extrato. "Já deviam ter caído" = data prevista ≤ hoje. Se caiu valor diferente, "Caiu outro valor?" ajusta a taxa e concilia. Dinheiro é conferido no fechamento do caixa.

## 4. Caixa (gaveta)

Abrir com troco → vendas em dinheiro entram sozinhas → retirada (sangria) e reforço (suprimento) com motivo → fechar informando o contado. Esperado = troco + vendas em dinheiro + reforços − retiradas − despesas pagas em dinheiro. Diferença exige observação e fica no histórico. Um caixa aberto por vez. Atendente pode operar o caixa; o restante do financeiro é do dono e do gerente.

## 5. Resumo (regime de caixa)

Por período (mês atual por padrão): recebido bruto, taxas, líquido, pedidos e ticket médio, CMV (saídas de estoque para pedidos menos estornos, a custo médio), despesas pagas por categoria e resultado = líquido − CMV − despesas. Também: a receber de clientes (pedidos confirmados não pagos), cartão a cair, itens a conferir e contas a pagar (vencidas e próximos 7 dias). Planilha CSV (`;`, abre no Excel) para o contador.

## 6. Ainda não feito (próximas fases)

Resultado por pedido e por produto, despesa de entrega por pedido (motoboy), parcelamento no crédito, contas recorrentes, importação de extrato (OFX), DRE por competência e documentos fiscais.
