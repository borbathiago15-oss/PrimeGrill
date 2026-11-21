# PES-001 — Central de Pesagem e Balança Conectada

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-15)

## 1. Objetivo

Registrar o **peso real** de cada peça na saída, de forma automática, calcular o valor definitivo e dar baixa no estoque com uma confirmação do operador.

## 2. Fluxo da tela de pesagem

```text
Pedido #1042 · 1 Picanha Angus Black (cód. 2) · R$ 159,90/kg
┌────────────────────────────────────────────┐
│  BALANÇA: 1,500 kg  ● estável              │
│  Valor:   1,500 × 159,90 = R$ 239,85       │
│                       [ Confirmar saída ]  │
└────────────────────────────────────────────┘
Saldo: 20,000 kg / 14 peças  →  18,500 kg / 13 peças
```

1. O operador abre o item do pedido (lista, busca ou código de barras).
2. Coloca a peça na balança; o peso aparece ao vivo.
3. O botão só habilita com o sinal de **peso estável**; a tara é descontada.
4. O sistema calcula `peso (g) × preço aprovado (centavos/kg) ÷ 1000`, com arredondamento conforme ADR-004.
5. O operador confirma: grava a pesagem, baixa o estoque (EST-001) e move o pedido para **Aguardando confirmação do cliente**.
6. Opcional: imprime etiqueta com código de barras de peso embutido (EAN-13 com prefixo 2).

Pacotes não passam pela balança: a separação baixa 1 unidade.

## 3. Estados do item de pedido (peça inteira)

`Reservado` → `Aguardando pesagem` (total **estimado**) → `Pesado` → `Aguardando confirmação do cliente` → `Confirmado` · `Recusado pelo cliente` (peça volta ao estoque por estorno).

## 4. Balanças

### Requisito legal

A balança usada para definir o preço cobrado deve ser **comercial, com aprovação de modelo e verificação do Inmetro**. Balanças domésticas (cozinha, banheiro) não podem ser usadas na Central de Pesagem.

### Conexões suportadas

| Conexão | Leitura |
|---|---|
| USB / Serial (RS-232) | Navegador (Web Serial) |
| Bluetooth | Navegador (Web Bluetooth) ou app Android |
| Rede (Ethernet/Wi-Fi) | Servidor consulta o IP da balança |
| Manual | Digitação com motivo (PG-P-001) |

Cada fabricante tem um **decodificador próprio**, como função pura testável. Modelos desconhecidos podem ter o sinal gravado ("Gravar sinal") para posterior suporte.

### Cadastro de balanças (Foundation › Configuração)

Marca, modelo, número de série, conexão, local (Recebimento ou Pesagem), **data da última verificação do Inmetro**, ativo.

## 5. Regras

| ID | Regra |
|---|---|
| PES-001-R1 | Só peso **estável** é aceito da balança. |
| PES-001-R2 | Balança com verificação do Inmetro vencida fica bloqueada para uso; o administrador é avisado antes do vencimento. |
| PES-001-R3 | Cada pesagem grava: gramas, leitura original da balança, número de série, operador, data/hora, automática ou manual. |
| PES-001-R4 | O preço usado é o preço **aprovado e vigente** do produto; o operador não altera preço na pesagem. |
| PES-001-R5 | O valor estimado nunca é cobrado; o cliente recebe peso, R$/kg, valor do item e frete. |
| PES-001-R6 | Tolerância entre peso estimado e real e tratamento acima dela: decisão aberta C6. |
| PES-001-R7 | Peso manual exige `pesagem.peso.manual` e motivo (PG-P-001). |

## 6. Critérios de aceite

- **Dada** a leitura 1.500 g estável e preço R$ 159,90/kg, **então** o valor é R$ 239,85 e o saldo baixa 1.500 g e 1 peça.
- **Dada** uma leitura instável, **então** o botão de confirmação fica desabilitado.
- **Dada** uma balança com verificação vencida, **então** ela não aparece como disponível na Central de Pesagem.
- **Dado** o cliente recusar o valor, **então** a saída é estornada e a peça volta ao saldo.
