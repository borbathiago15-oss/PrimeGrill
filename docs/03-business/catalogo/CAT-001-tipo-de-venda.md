# CAT-001 — Tipo de Venda (cadastro)

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-15)

## 1. Objetivo

Definir, por produto, **como ele é vendido**: isso decide a entrada, o estoque, o preço, a vitrine e a saída. O tipo de venda é um **cadastro próprio**, mantido pelo administrador, para permitir novos tipos no futuro.

## 2. Tipos iniciais

| Campo | Peça inteira | Pacote |
|---|---|---|
| Código | `PECA` | `PACOTE` |
| Exemplo | Picanha Angus Black (cód. 2) | Frango Barbecue 900 g |
| Unidade de estoque | `KG_PECAS` (kg + nº de peças) | `UNIDADE` |
| Base do preço | `POR_KG` | `FIXO_UNIDADE` |
| Exige balança na saída | Sim | Não |
| Pergunta na entrada | Nº de peças | Unidades por caixa |
| Valor aproximado na vitrine | Sim (peso médio) | Não |
| Gera quebra ao zerar | Sim | Não |
| Texto de preço | `R$ 159,90 KG` | `R$ 89,90 · PACOTE` |

Hoje existem **apenas** esses dois tipos. Venda a granel (fracionada por kg) não existe.

## 3. Modelo

`TipoVenda`: `id`, `codigo` (único, imutável), `nome`, `unidade_estoque` (enum), `base_preco` (enum), `exige_balanca` (bool), `pergunta_entrada` (enum: `NUM_PECAS` · `UNIDADES_POR_CAIXA`), `mostra_aproximado` (bool), `gera_quebra` (bool), `rotulo_preco` (enum), `ativo`, auditoria.

Os campos de comportamento são **listas fechadas** (enums). Um tipo novo que combine comportamentos existentes é criado só por cadastro; um comportamento novo (ex.: granel) exige desenvolvimento e ADR.

## 4. Regras

| ID | Regra |
|---|---|
| CAT-001-R1 | Todo produto tem exatamente um tipo de venda (obrigatório). |
| CAT-001-R2 | O tipo de venda do produto **não muda** depois da primeira movimentação de estoque. Para mudar, inativa-se o produto e cria-se outro. |
| CAT-001-R3 | Tipo com produtos ativos não pode ser inativado. |
| CAT-001-R4 | Só o administrador mantém o cadastro (`catalogo.tipovenda.manage`); toda alteração é auditada. |
| CAT-001-R5 | Combinações incoerentes são recusadas (ex.: `exige_balanca = sim` com `unidade_estoque = UNIDADE`). |
| CAT-001-R6 | Produto `PACOTE` informa o peso nominal (ex.: 900 g) apenas como descrição; não é usado no estoque. |

## 5. Efeito nos módulos

| Módulo | Comportamento decidido pelo tipo |
|---|---|
| Cadastro do produto | Campos de preço (R$/kg ou fixo) e peso nominal |
| Recebimento (REC-001) | Pergunta nº de peças ou unidades por caixa |
| Estoque (EST-001) | Saldo em kg + peças ou em unidades; quebra |
| Vitrine (ECM-001) | Aproximado + quantidade disponível ou preço fixo |
| Pesagem (PES-001) | Abre a balança ou só baixa a unidade |
| Studio (STU-002) | Rótulo do preço no folder |
