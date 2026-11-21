# PG-P-001 — Toda Entrada Automática Tem Alternativa Manual

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-21)

## 1. Princípio

Nenhuma operação da Prime Grill pode parar porque um meio digital falhou ou não existe. Toda captura automática de dados tem uma **alternativa manual**, que:

1. exige **motivo** escolhido de uma lista (com campo livre complementar);
2. registra **quem**, **quando** e **o valor informado** na auditoria;
3. fica **marcada** no registro de origem (ex.: peso "manual", nota "digitada");
4. pode exigir **permissão específica** ou aprovação, conforme a criticidade.

## 2. Mapa de alternativas

| Captura automática | Alternativa 1 | Alternativa manual | Permissão |
|---|---|---|---|
| Balança conectada (PES-001) | — | Digitação do peso | `pesagem.peso.manual` |
| Nota pela SEFAZ (REC-001) | Upload do XML | Upload do PDF → digitação da nota | `recebimento.nota.manual` |
| Link de pagamento | — | Registro manual (Pix, dinheiro, cartão na entrega) com comprovante | `financeiro.pagamento.manual` |
| Envio pelo WhatsApp | — | Baixar a arte ou copiar a mensagem | `whatsapp.envio.manual` |
| Foto do produto | — | Upload manual | `catalogo.midia.upload` |
| Leitura de código de barras | — | Busca por nome ou código | (sem permissão extra) |
| Cálculo de frete por CEP | — | Frete informado manualmente | `logistica.frete.manual` |

## 3. Regras

| ID | Regra |
|---|---|
| PG-P-001-R1 | A alternativa manual nunca dispensa as validações de negócio (ex.: peso manual continua sujeito à tolerância). |
| PG-P-001-R2 | O motivo é obrigatório; sem motivo a operação é recusada. |
| PG-P-001-R3 | Valores digitados são exibidos com indicação visual de "manual" em todas as telas e relatórios em que aparecem. |
| PG-P-001-R4 | O relatório **Uso de alternativas manuais** mostra, por tipo, operador e período, quantas vezes cada alternativa foi usada. |
| PG-P-001-R5 | Uso acima de um limite configurável por período gera alerta ao administrador. |

## 4. Critérios de aceite

- **Dado** que a balança está desconectada, **quando** o operador digita o peso sem motivo, **então** a operação é recusada.
- **Dado** um peso digitado com motivo, **quando** o pedido é consultado, **então** o peso aparece marcado como "manual" com o motivo e o operador.
- **Dado** 10 pesagens manuais no dia e limite configurado em 5, **então** o administrador recebe alerta.
