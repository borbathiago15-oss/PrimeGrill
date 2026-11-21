# ADR-003 — Renderização de artes (Studio)

**Status:** 🟡 Proposed
**Data:** 2026-11-21

## Contexto

O Studio precisa que a pré-visualização seja idêntica ao arquivo exportado, gerar PNG/JPEG para redes sociais e WhatsApp e PDF para impressão e envio digital com links clicáveis (STU-002). O encarte de setembro já foi construído em HTML/CSS.

## Decisão proposta

- Templates em **HTML/CSS versionado** com camadas fixas e campos declarados (`fields_schema`).
- A tela de pré-visualização renderiza o mesmo HTML.
- **PDF** (digital e impressão) e **PNG/JPEG** do encarte: Chromium sem interface (Playwright), garantindo fidelidade ao HTML e links clicáveis no PDF.
- Avaliar **Satori** (MPL-2.0) para artes simples de redes sociais, por ser mais leve que o Chromium.
- Leitura de imagens enviadas: SkiaSharp (MIT).

## Consequências

- Uma única fonte de layout para tela e arquivo.
- O contêiner do serviço de renderização carrega o Chromium (imagem maior).
- Fontes do DS-001 embarcadas no serviço, sem depender da internet na geração.
