# REC-001 — Entrada de Notas Fiscais

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-15)

## 1. Canais de entrada (em ordem de prioridade)

| Prioridade | Canal | Descrição |
|---|---|---|
| 1 | **SEFAZ automático** | Distribuição DF-e: o sistema busca todas as NF-e emitidas contra o CNPJ da Prime Grill, usando o certificado A1 |
| 2 | **XML do fornecedor** | Upload do arquivo XML recebido por e-mail |
| 3 | **PDF (DANFE)** | Contingência: leitura da chave de acesso e dos itens, com conferência obrigatória |
| Manual | **Digitação** | Alternativa manual conforme PG-P-001 |

## 2. Fluxo

```text
Nota recebida (qualquer canal)
  → PENDENTE DE RECEBIMENTO
  → vínculo item da nota ↔ produto do cadastro
  → conferência física: esperado × recebido, divergências, rejeições
  → confirmação: pergunta nº de peças (PECA) ou unidades por caixa (PACOTE)
  → RECEBIDA (estoque atualizado só com o aceito; custo médio recalculado; obrigação financeira registrada)
```

Estados: `Pendente` → `Em conferência` → `Recebida` · `Recebida com divergência` · `Recusada` · `Cancelada`.

## 3. Regras

| ID | Regra |
|---|---|
| REC-001-R1 | Importar uma nota **nunca** altera o estoque. Só a confirmação do recebimento altera. |
| REC-001-R2 | A chave de acesso (44 dígitos) é única: a mesma nota não entra duas vezes, por nenhum canal. |
| REC-001-R3 | O XML original é armazenado de forma imutável (ADR-002). |
| REC-001-R4 | O estoque recebe apenas a quantidade física **aceita**; faltas, sobras, avarias e rejeições ficam registradas com destino. |
| REC-001-R5 | Para `PECA`, a confirmação exige o nº de peças (inteiro ≥ 1) e o peso aceito em gramas. |
| REC-001-R6 | Para `PACOTE`, a confirmação exige a quantidade de unidades. O sistema memoriza o fator "1 caixa = N unidades" por fornecedor e produto, e o sugere nas próximas entradas. |
| REC-001-R7 | Vínculos item do fornecedor ↔ produto são memorizados por fornecedor e reaplicados automaticamente. |
| REC-001-R8 | Nota vinda de PDF ou digitada fica marcada como tal e exige conferência de todos os itens antes da confirmação. |
| REC-001-R9 | Variação de custo unitário acima do limite configurado em relação à última compra gera alerta na conferência. |

## 4. SEFAZ automático

- **Certificado A1 (e-CNPJ):** arquivo e senha armazenados criptografados, fora do código e fora do banco em texto aberto. Alertas de vencimento em 30, 15 e 5 dias. Certificado A3 (cartão/token) não atende a busca automática.
- **Ciência da Operação:** a primeira consulta devolve o resumo da nota; o sistema envia automaticamente o evento de Ciência da Operação para obter o XML completo. Confirmação da operação ou desconhecimento são decisões do usuário, feitas na tela.
- **Controle de consultas:** o sistema guarda o último NSU recebido e respeita o intervalo da SEFAZ (em geral uma hora quando não há documentos novos), evitando bloqueio por consumo indevido. O botão "buscar agora" respeita esse limite.
- **Falha:** sem certificado válido ou com a SEFAZ indisponível, o sistema avisa e os canais 2, 3 e manual continuam disponíveis.

## 5. Permissões

`recebimento.nota.view`, `recebimento.nota.import`, `recebimento.conferencia.execute`, `recebimento.nota.confirm`, `recebimento.nota.manual`, `recebimento.certificado.manage` (administrador).

## 6. Critérios de aceite

- **Dada** uma nota já recebida pela SEFAZ, **quando** o mesmo XML é enviado, **então** é recusado por chave duplicada.
- **Dada** uma nota pendente, **quando** é importada, **então** o saldo de estoque não muda.
- **Dada** a confirmação de 20,000 kg de picanha com 14 peças, **então** o saldo aumenta 20.000 g e 14 peças e o custo médio é recalculado.
- **Dado** o certificado vencendo em 15 dias, **então** o administrador recebe alerta.
