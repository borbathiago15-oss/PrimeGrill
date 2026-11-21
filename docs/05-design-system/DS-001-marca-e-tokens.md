# DS-001 — Marca, Cores, Tipografia e Tokens

**Versão:** 1.0.0
**Status:** 🟢 Approved (2026-11-21) — padronizado pelo encarte publicado
**Tokens:** [`tokens.css`](tokens.css)

## 1. Origem

- **Logo oficial:** monocromática (preto e branco), serifada, cabeça de touro sob arco, filetes e "— PAIVA —". Não pode ser redesenhada, recolorida, invertida por filtro ou receber efeitos (Centro de Conhecimento §02).
- **Cor da marca:** como a logo é monocromática, a cor vem do material já publicado: **dourado sobre preto carvão** do encarte "Nossas Carnes Premium".
- **Substituído:** o protótipo de cardápio `prime-grill-paiva.html` (Bodoni Moda, Archivo, laranja brasa como acento) não é referência visual.

## 2. Cores da marca

| Token | Hex | Uso |
|---|---|---|
| `--pg-carvao` | `#0C0B0A` | Fundo da marca e da vitrine |
| `--pg-carvao-2` | `#141210` | Cards no escuro |
| `--pg-carvao-3` | `#1C1916` | Superfície elevada no escuro |
| `--pg-osso` | `#F4ECDC` | Texto sobre o escuro (16,7:1) |
| `--pg-dourado` | `#D4A94E` | Destaque: preço, ação principal, foco |
| `--pg-dourado-escuro` | `#A9843A` | Bordas e filetes |
| `--pg-dourado-claro` | `#E9C878` | Brilho e degradê de títulos (somente marketing) |
| `--pg-dourado-texto` | `#7A5C1E` | Texto/links dourados sobre fundo claro (5,8:1) |
| `--pg-brasa` | `#C3681F` | Somente atmosfera de fogo em marketing; nunca na interface |

**Regra:** dourado `#D4A94E` sobre branco tem contraste 2,2:1. No tema claro ele é usado só em bordas, ícones e detalhes; texto dourado usa `--pg-dourado-texto`.

## 3. Temas

| Papel | Tema **Papel** (ERP, padrão) | Tema **Carvão** (vitrine, Studio, opcional no ERP) |
|---|---|---|
| Fundo | `#FAF7F2` | `#0C0B0A` |
| Superfície | `#FFFFFF` | `#141210` |
| Superfície elevada | `#F3EEE6` | `#1C1916` |
| Borda | `#E7DFD2` | `#2E2925` |
| Texto | `#1A1714` | `#F4ECDC` |
| Texto secundário | `#6E655C` (5,7:1) | `#A89F92` (7,2:1) |
| Ação principal | fundo `#1A1714`, texto `#F4ECDC` | fundo `#D4A94E`, texto `#0C0B0A` (9:1) |
| Destaque / foco | `#A9843A` | `#D4A94E` |

Motivo: o ERP é usado o dia todo, com tabelas e impressão (claro cansa menos e imprime bem); a vitrine e o Studio exibem fotos com fundo escuro de churrasqueira (no claro viram recortes soltos).

## 4. Cores de status

| Status | Tema Papel | Tema Carvão |
|---|---|---|
| Sucesso | `#3F7F57` (4,8:1) | `#6FBF8E` (8,5:1) |
| Atenção | `#A8661C` (4,6:1) | `#E3A14A` (8,4:1) |
| Erro | `#C8463D` (4,8:1) | `#E07A70` (6,4:1) |
| Informação | `#3F6E99` (5,4:1) | `#7FAFD9` (8,0:1) |

Status nunca usam o dourado, para não confundir aviso com marca.

## 5. Tipografia (Google Fonts, uso comercial livre)

| Papel | Fonte | Onde |
|---|---|---|
| Títulos institucionais e preços | **Playfair Display** 600–800 | Vitrine, encartes, cabeçalhos do ERP |
| Chamadas de impacto | **Bebas Neue** | Somente marketing (encartes, artes) |
| Interface e textos | **Figtree** 500–800 | Vitrine e Studio |
| Interface de dados do ERP | **Inter** com `font-variant-numeric: tabular-nums` | Tabelas, kg, R$, pesagem |

## 6. Linguagem visual

- Filetes finos dourados como separador (eco da linha e do "— PAIVA —" da logo).
- Raio: **6 px** no ERP; **16 px** na vitrine e no marketing (cards do encarte); botões de CTA em pílula no marketing.
- Ícones: Lucide, traço 1,75.
- Fotos: fundo escuro, iluminação quente; nunca lavadas ou dessaturadas.
- Pesagem: peso e valor em **≥ 48 px**, legíveis a 1 m.
- Foco de teclado: contorno de 2 px na cor de destaque do tema, deslocado 2 px.

## 7. Formato de preço

| Tipo | Formato | Estilo |
|---|---|---|
| Peça inteira | `R$ 119,40 KG` | "R$" e "KG" menores; valor em Playfair Bold dourado |
| Pacote | `R$ 89,90 · PACOTE` | Valor em Playfair Bold dourado; "PACOTE" em sans-serif pequena, creme, espaçada, sem selo |

## 8. Pendência

Arquivo oficial da **logo branca**, de preferência em vetor (SVG ou PDF). Até lá, peças em fundo escuro usam uma placa clara com a logo preta, nunca a logo invertida por filtro.
