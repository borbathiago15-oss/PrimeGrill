# ADR-004 — Dinheiro em centavos e peso em gramas inteiras

**Status:** 🟢 Accepted
**Data:** 2026-11-21

## Contexto

O PG-000 determina carnes controladas em gramas inteiras. Cálculos de valor (peso × R$/kg), custo médio e resultado não podem sofrer erro de ponto flutuante.

## Decisão

1. **Dinheiro** é armazenado e calculado em **centavos inteiros** (`bigint`). R$ 159,90 = `15990`.
2. **Peso** é armazenado em **gramas inteiras** (`integer`/`bigint`). 1,500 kg = `1500`.
3. **Preço por kg** é armazenado em centavos por kg. Valor de um item: `round_half_even(gramas × centavos_por_kg ÷ 1000)`.
4. **Custo médio** é mantido em centavos por kg com 4 casas decimais internas (`numeric(18,4)`) e arredondado só na apresentação e na baixa.
5. Unidades de pacote são inteiros.
6. Nenhum tipo de ponto flutuante (`float`/`double`) é usado para dinheiro ou peso.

## Testes obrigatórios

- 1.500 g × 15.990 centavos/kg = **23.985 centavos (R$ 239,85)**.
- Custo médio: 20.000 g a 130.000 centavos + 20.000 g a 140.000 centavos = 40.000 g a 270.000 centavos → **6.750 centavos/kg (R$ 67,50)**.
- Arredondamento meio-par em valores com fração de centavo.

## Consequências

Formatação para exibição (R$ 1.234,56 e 1,500 kg) acontece apenas na camada de apresentação.
