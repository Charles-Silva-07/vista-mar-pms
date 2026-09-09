---
paths:
  - "src/lib/pms-store.tsx"
  - "src/components/pms/**"
---

# Rationale das entidades do domínio

Carrega só quando o Claude mexe no store ou nas telas de PMS. O
`CLAUDE.md` na raiz tem só os nomes das entidades; aqui está o *porquê* de
cada decisão.

- **Room / Reservation** — quartos e reservas. **Migrados para o backend
  Django** (`../backend/pousada_backend/rooms/models.py`) — o store busca
  e grava via `src/lib/api.ts`, não mais em memória pura. `id` chega da
  API como número (PK do Postgres) e é normalizado para string na borda
  (`lib/api.ts`), porque o resto do front trata `Room.id`/`roomId` como
  string. `ReservationStatus`: `confirmada | andamento | finalizada |
  cancelada`. `origin`: de onde veio a reserva (Direto, Booking, Airbnb,
  Outro). O saldo devedor nunca é campo solto — é sempre calculado a
  partir de `amountPaid` vs. o total (`reservationTotal`,
  `paymentSituation`), tanto no front quanto — implicitamente — no
  modelo Django (não há campo de saldo persistido lá também).
- **Guest** — cadastro de hóspedes (histórico, documento, quantidade de
  estadias).
- **ConsumptionItem** — item extra lançado no extrato de uma reserva
  (frigobar, serviço avulso). Guarda um *snapshot* do vínculo de estoque
  (`supplyId`/`supplyQty`) no momento da venda, para poder estornar
  corretamente mesmo se o catálogo mudar depois.
- **Product** (catálogo de venda ao hóspede) × **SupplyItem** (estoque
  físico de insumos) — conceitos separados, conectados por
  `Product.supplyId` + `Product.qtyPerSale`: vender um produto vinculado
  dá baixa automática no estoque. Produtos sem vínculo (ex.: "Serviços")
  não controlam estoque.
- **SupplyCategory** — `string` livre (não union fixo): pode ser
  criada/renomeada em runtime pela própria tela de Estoque
  (`addSupplyCategory` / `renameSupplyCategory`). Renomear atualiza em
  cascata todos os insumos daquele grupo. **Não existe exclusão de
  categoria** — fora de escopo por decisão do usuário (ver `BACKLOG.md`).
- **SupplyMovement** — histórico de entrada/saída manual de estoque
  (compra, perda, ajuste), independente da baixa automática por venda.
- **Transaction** — lançamento financeiro (entrada/saída, Pago/Pendente).
  Checkout só lança o saldo que falta receber naquele momento — o que já
  tinha sido pago antes (sinal) já virou receita quando foi registrado,
  para não contar a mesma receita duas vezes.
- **SalaryPayment** — pagamento de salário/benefício a colaborador, gera
  `Transaction` vinculada.
