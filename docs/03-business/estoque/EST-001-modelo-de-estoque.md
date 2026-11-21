# EST-001 — Modelo de Estoque

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-15)
**Substitui:** PG-000 §6 original (estoque individual por peça com peso e foto desde a entrada)

## 1. Princípio

Estoque simples, de entradas e saídas, controlado **por produto** (código), conforme o tipo de venda (CAT-001). Nenhum saldo muda sem uma movimentação registrada.

## 2. Saldo por tipo de venda

| Tipo | Saldo | Exemplo |
|---|---|---|
| `PECA` | gramas + nº de peças | Picanha Angus Black cód. 2: **20.000 g / 14 peças** |
| `PACOTE` | unidades | Frango Barbecue 900 g: **20 un** |

Unidades internas conforme ADR-004 (gramas e centavos inteiros).

## 3. Movimentações

| Tipo | Origem | Efeito |
|---|---|---|
| Entrada por compra | Confirmação do recebimento (REC-001) | + gramas e peças, ou + unidades |
| Saída por venda | Confirmação da pesagem (PES-001) ou baixa do pacote | − peso real da peça e 1 peça, ou − 1 unidade |
| Quebra | Fechamento do saldo | − gramas restantes (ou + diferença negativa) |
| Ajuste | Inventário ou correção | ± com motivo e aprovação |
| Estorno | Cancelamento de saída confirmada | Reverte a movimentação original |

Toda movimentação tem: produto, tipo, quantidade (g, peças ou un), custo unitário, documento de origem, operador, data/hora e se foi automática ou manual (PG-P-001).

### Exemplo de saída

```text
Picanha Angus Black (cód. 2)  saldo 20.000 g / 14 peças
Saída: 1 peça pesada na balança = 1.500 g
Novo saldo: 18.500 g / 13 peças
```

## 4. Quebra (fechamento do saldo)

Quando a **última peça** sai e ainda resta peso no saldo (exsudato, aparas, diferenças de pesagem), o sistema exige o fechamento:

```text
Saldo antes da última saída: 1.900 g / 1 peça
Última peça pesada:           1.480 g
Restante:                       420 g  →  Quebra (motivo obrigatório)
```

| ID | Regra |
|---|---|
| EST-001-R1 | Com 0 peças e gramas > 0, o produto fica com **pendência de fechamento** e não aceita nova entrada até o fechamento. |
| EST-001-R2 | Se a peça pesada for maior que o saldo em gramas, a saída é aceita e a diferença é registrada como **diferença de pesagem**. |
| EST-001-R3 | Quebra acima do percentual configurado por produto gera alerta. |
| EST-001-R4 | O relatório de **rendimento** mostra quebra por produto, fornecedor e período. |

## 5. Disponibilidade e reserva

- Disponível (peças ou unidades) = físico − reservado − estoque de segurança.
- O pedido reserva **quantidade** (peças ou unidades), não peso.
- Validade da reserva por estado do pedido: decisão aberta C9.

## 6. Peso médio (para a vitrine)

`peso médio = gramas em saldo ÷ peças em saldo`. Quando houver histórico suficiente de pesagens do produto, o sistema pode usar a média das últimas pesagens reais (parâmetro configurável). É usado **somente** para o valor aproximado; nunca para cobrança.

## 7. Custo médio ponderado

Recalculado a cada entrada confirmada, por produto:

`novo custo médio = (valor do saldo anterior + valor da entrada) ÷ (quantidade anterior + quantidade da entrada)`

Teste obrigatório: 20 kg a R$ 1.300,00 + 20 kg a R$ 1.400,00 = 40 kg a R$ 2.700,00 → **R$ 67,50/kg**.

Saída e quebra baixam pelo custo médio vigente. O uso do custo médio no CMV é a proposta inicial; a validação contábil está em aberto (C7, C13).

## 8. Critérios de aceite

- **Dado** saldo 20.000 g / 14 peças, **quando** sai uma peça de 1.500 g, **então** o saldo fica 18.500 g / 13 peças.
- **Dado** saldo 20 un de pacote, **quando** sai 1 pacote, **então** o saldo fica 19 un, sem pesagem.
- **Dado** 0 peças e 420 g restantes, **quando** se tenta nova entrada, **então** o sistema exige o fechamento como quebra.
- **Dada** qualquer alteração de saldo, **então** existe uma movimentação correspondente.
