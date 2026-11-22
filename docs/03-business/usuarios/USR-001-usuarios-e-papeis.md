# USR-001 — Usuários do painel e papéis

**Status:** implementado (MVP) · **Relacionados:** PG-P-001, ECM-001, EST-001, REC-001

## 1. Acessos
- **Acesso principal (dono):** e-mail e senha nas variáveis da Vercel (`ADMIN_EMAIL`, `ADMIN_PASSWORD`). Continua valendo sempre, como acesso de recuperação.
- **Usuários cadastrados:** o dono cadastra em *Usuários* (nome, e-mail, papel, senha provisória). No primeiro acesso o sistema obriga a pessoa a criar a própria senha.
- Senha guardada só como hash bcrypt (custo 12). Regra: 10+ caracteres, letras e números, sem o e-mail.
- Desativar, trocar papel ou redefinir senha derruba na hora as sessões abertas da pessoa (versão de sessão conferida no banco a cada requisição).
- Login com 5 tentativas erradas bloqueia o e-mail por 15 minutos.

## 2. Papéis
| Ação | Dono | Gerente | Atendente |
|---|---|---|---|
| Pedidos: aceitar, pesar, enviar link, cobrar, concluir, lançar pedido do WhatsApp | ✓ | ✓ | ✓ |
| Ajuste manual de status / cancelar pedido | ✓ | ✓ | — |
| Marcar produto esgotado/disponível | ✓ | ✓ | ✓ |
| Editar produto e preço | ✓ | ✓ | — |
| Ver estoque | ✓ | ✓ | ✓ |
| Ajustar estoque / fechar quebra | ✓ | ✓ | — |
| Notas de entrada | ✓ | ✓ | — |
| Loja, horários e entregas | ✓ | ✓ | — |
| Chave Pix e formas de pagamento | ✓ | — | — |
| Usuários | ✓ | — | — |

## 3. Auditoria
Toda ação do painel grava o e-mail de quem fez (histórico do pedido, movimentações de estoque, conferência de notas).
