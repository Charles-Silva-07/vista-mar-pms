# Backlog conhecido — Vista-Mar PMS

**Status da migração para backend (Django + DRF + Postgres/Supabase):**
Room e Reservation já persistem via API real (`../backend/pousada_backend/`).
Guest, Product, SupplyItem, ConsumptionItem, Transaction, Staff e
SalaryPayment já têm `models.py` no Django, mas ainda sem endpoint/API —
continuam em memória local no front até serem migrados um a um. Sem
autenticação real ligando front/back ainda (views em `AllowAny`).

Itens discutidos e conscientemente deixados de fora do escopo atual. Ler
antes de propor essas features — algumas foram descartadas de propósito,
não esquecidas por falta de tempo.

- Módulo de checklist de limpeza
- Log de manutenção + terceiro perfil de acesso "Manutenção" em `auth.ts`
- Campo "Status" no quarto (ex.: em manutenção, bloqueado)
- Separar Financeiro em Contas a Pagar / Contas a Receber
- Tarifário por período/temporada
- Check-in/checkout com timestamp real + "documento conferido"
- Comparativo de ADR/RevPAR mês a mês / ano a ano
- **Exclusão de categoria de insumo com realocação de itens** — fora de
  escopo por decisão explícita do usuário (só criar/renomear categoria foi
  implementado). Não implementar sem confirmar antes, mesmo que pareça um
  gap óbvio.
