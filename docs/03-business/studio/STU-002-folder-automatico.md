# STU-002 — Folder Automático (encarte)

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-21)
**Origem:** encartes "Nossas Carnes Premium" e "Os Essenciais do Churrasco" (setembro/2026)

## 1. Objetivo

Gerar o encarte da Prime Grill **automaticamente a partir dos dados do ERP**, mantendo o visual já publicado. Saídas: **PDF e imagens** (PNG/JPEG).

## 2. Lições do projeto de setembro

| Como era | Problema | Como fica |
|---|---|---|
| Nome, preço e foto digitados no HTML de cada card | Erro humano (ex.: "Picanha Naciona PUL", herdado do nome do arquivo) | Dados do cadastro do produto |
| Preço copiado da planilha | Divergência com o preço vigente | Preço aprovado do ERP, reconferido |
| Logo branca obtida invertendo a preta por CSS | Proibido pelo Centro de Conhecimento | Arquivo oficial da logo branca no Brand Kit |
| PPTX "editável" para corrigir | Retrabalho manual | Correção pelos campos e regeração |

## 3. Template oficial "Encarte Nossa Seleção"

Baseado no encarte v3 (1080×1620):

- **Cabeçalho:** foto de atmosfera à direita, logo à esquerda, título em Bebas Neue ("NOSSAS **CARNES** PREMIUM", palavra central em degradê dourado) e linha "CORTES PREMIUM PARA **MOMENTOS ESPECIAIS**" entre filetes dourados.
- **Seção:** filete dourado de 2 px, título da seção + frase em Playfair Display dourada.
- **Cards:** fundo `#141210`, borda `#A9843A` de 1,5 px, raio 16 px, foto 4:3, nome em Playfair caixa alta, preço em Playfair Bold dourado.
- **CTA:** "ENVIAR PEDIDO PELO WHATSAPP" em botão dourado.
- **Rodapé:** "SEU CHURRASCO **COMEÇA AQUI.**", "FAÇA SEU PEDIDO" e os contatos obrigatórios.

Campos editáveis: título (texto, 3 palavras com destaque em uma), frase da seção, lista de produtos, validade, CTA (lista fechada).

## 4. Fluxo de geração

1. **Selecionar produtos:** manual ou por filtro (categoria, em promoção, etiqueta como "Seleção da semana").
2. **Validar:** o sistema exclui e lista com motivo os produtos sem preço aprovado, sem estoque disponível ou sem foto.
3. **Preencher cards:** nome do cadastro, foto principal, preço conforme tipo de venda:
   - `PECA` → `R$ 119,40 KG`
   - `PACOTE` → `R$ 89,90 · PACOTE` (valor em Playfair Bold dourado; "PACOTE" em sans-serif pequena, creme, espaçada; nunca em selo, nunca com "KG")
4. **Montar a grade automaticamente:**

| Nº de produtos | Layout |
|---|---|
| 4 a 8 | Linhas de 4 cards verticais |
| 9 a 12 | Linhas de 4 + última linha com 1 a 3 cards horizontais (como o encarte de 11 produtos) |
| > 12 | Pagina: nova página com o mesmo cabeçalho reduzido e rodapé |
| < 4 | Sugere o template "Produto em Destaque" |

5. **Pré-visualizar** e passar pelo checklist de marca (STU-BR-016).
6. **Aprovar** (STU-BR-014) e **gerar** as saídas.

## 5. Saídas

| Saída | Especificação |
|---|---|
| **PDF digital** | 1080×1620 por página; CTA e contatos como **links clicáveis** (`wa.me` e Instagram) |
| **PDF impressão** | A4 300 dpi, sangria de 3 mm, marcas de corte opcionais |
| **PNG** | 2160×3240 (2×) para nitidez em celular |
| **JPEG** | 2160×3240, qualidade 90, para envio por WhatsApp |
| Derivados | Stories (1080×1920) e Feed 4:5 com até 4 produtos em destaque |

PPTX não faz parte das saídas.

## 6. Regras

| ID | Regra |
|---|---|
| STU-002-R1 | Nenhum valor é digitado no encarte; todos vêm do ERP. |
| STU-002-R2 | Mudança de preço, estoque ou validade de qualquer produto do encarte o torna **Desatualizado**, com ação "Regerar". |
| STU-002-R3 | Regerar cria nova versão; versões anteriores ficam no histórico com seus arquivos. |
| STU-002-R4 | Nomes longos quebram em no máximo 2 linhas; se não couber, o sistema recusa e pede o **nome comercial curto** do produto (campo do cadastro). |
| STU-002-R5 | Fotos sem resolução mínima (800 px no menor lado) bloqueiam a geração final. |
| STU-002-R6 | Validade do encarte aparece no rodapé quando houver preço promocional: "Preços válidos de __ a __ ou enquanto durarem os estoques". |

## 7. Critérios de aceite

- **Dados** 11 produtos válidos, **então** o encarte sai com 2 linhas de 4 e 1 linha de 3 cards horizontais.
- **Dado** um produto sem preço aprovado na seleção, **então** ele é excluído e listado com o motivo.
- **Dado** um produto `PACOTE`, **então** o preço aparece "R$ 89,90 · PACOTE", sem "KG".
- **Dado** o PDF digital gerado, **então** o botão do WhatsApp abre `wa.me` com o número oficial.
- **Dada** a alteração do preço de um item após a publicação, **então** o encarte fica Desatualizado.
