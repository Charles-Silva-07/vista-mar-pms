# Vista-Mar PMS — Alameda Pousada

Sistema de gestão de pousada (PMS) para a "Alameda Pousada". Front-end React
+ backend Django/DRF em migração progressiva: `Room` e `Reservation` já
persistem de verdade via API (`../backend/pousada_backend/`); o restante das
entidades (Guest, Product, SupplyItem, etc.) ainda vive só em memória via
React Context e reseta a cada F5 até serem migradas uma a uma.

## Stack

- React 19 + Vite 7 + TypeScript, gerenciado com Bun (`bun.lock`, `bunfig.toml`)
- Tailwind CSS + shadcn/ui (componentes Radix em `src/components/ui/`)
- Projeto conectado ao [Lovable](https://lovable.dev): commits na branch
  conectada sincronizam de volta ao editor. **Evite `git push --force`** ou
  reescrever histórico já publicado (ver `AGENTS.md`).
- Deploy via GitHub Pages (`.github/workflows/deploy.yml`)

## Como rodar local

Ver `COMO-RODAR-LOCAL.md`. Resumo do front: `bun install && bun run dev`
(ou `npm i && npm run dev`). Sobe em `http://localhost:8080/vista-mar-pms/`.

Backend Django (necessário para Rooms e Reservations funcionarem — sem ele
o front cai no fallback local): ver "Backend Django" abaixo.

## Arquitetura de estado

A lógica e os dados moram em
[`src/lib/pms-store.tsx`](src/lib/pms-store.tsx): um Context Provider
(`PmsProvider` / hook `usePms()`) com `useState` interno.

- **Room e Reservation**: buscados do backend Django via
  [`src/lib/api.ts`](src/lib/api.ts) (`fetchRooms`/`createRoom`,
  `fetchReservations`/`createReservation`/`patchReservation`) num
  `useEffect` no boot do provider. Se a API falhar, cai num seed local
  (`seedRooms`/`seedReservations`) só para não travar a tela — reporta o
  erro em `roomsError`/`reservationsError`, expostos pelo `usePms()`.
  Mutações (`addRoom`, `addReservation`, `updateReservationStatus`,
  `updateReservationPayment`) agora são **assíncronas** e chamam a API;
  as duas últimas fazem update otimista com rollback se a chamada falhar.
- **Todo o resto** (Guest, Product, SupplyItem, ConsumptionItem, etc.):
  ainda em memória local, seed fixo no código, sem backend — recarregar a
  página apaga.

Padrão para adicionar um novo pedaço de estado (`usePmsState()`):
1. Declarar via `useState`.
2. Incluir no objeto retornado dentro do `useMemo(() => ({...}), [deps])`.
3. Adicionar a variável ao array de dependências desse mesmo `useMemo`.
4. Se a entidade já tiver sido migrada para o Django (ver lista acima),
   as mutações devem chamar `src/lib/api.ts`, não só `setState` local.

`PmsContextValue` é `ReturnType<typeof usePmsState>` — automático, não
precisa editar um type separado.

### Entidades principais

Room/Reservation (**migrados para Django** — ver acima), Guest, Product ×
SupplyItem (venda × estoque), ConsumptionItem, SupplyCategory,
SupplyMovement, Transaction, SalaryPayment (**ainda em memória local**).
**Rationale detalhado de cada campo/decisão em
[`.claude/rules/pms-store.md`](.claude/rules/pms-store.md)** — carrega só
quando o Claude mexe no store ou nas telas de PMS, não em toda sessão.

## Backend Django (`../backend/pousada_backend/`)

API REST em Django + DRF, banco Postgres (Supabase em produção, SQLite em
dev local por padrão). Pasta irmã de `vista-mar-pms-main/`, fora deste
repo do front — ver `.env.example` lá para as variáveis esperadas
(`DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, etc.).

- `rooms/models.py` — todas as entidades do domínio já traduzidas para
  Django (mesmo as que o front ainda não consome via API), para não
  travar o desenho do schema enquanto a migração avança entidade por
  entidade.
- Só `Room` e `Reservation` têm endpoint hoje: `GET/POST /api/rooms/`,
  `GET/POST /api/reservations/`, `GET/PATCH /api/reservations/<id>/`.
- `permission_classes = [AllowAny]` em todas as views **de propósito**,
  nesta fase — ainda não há autenticação real ligando front e back (o
  `auth.ts` do front continua sendo só a fonte de login/telas). Antes de
  produção, trocar por `IsAuthenticated` + DRF SimpleJWT.
- CORS liberado por padrão para `localhost:8080`/`127.0.0.1:8080` (a
  porta configurada no `vite.config.ts` deste projeto, **não** a 5173
  padrão do Vite) — ajustar `CORS_ALLOWED_ORIGINS` se a porta mudar.
- Connection string do Supabase em produção deve usar a porta de
  **pooling** (`6543`, pgbouncer), não a direta (`5432`) — Render/Railway
  reciclam workers com frequência e estouram o limite de conexões do
  Supabase na direta.

## Autenticação (`src/lib/auth.ts`)

Demonstração, sem backend — contas fixas em `SEED_ACCOUNTS`, senha em texto
puro só para a apresentação.

- `AccessLevel`: `funcionario` (operacional) | `gerencia` (acesso total).
- `MANAGER_ONLY_SCREENS` restringe `financeiro`/`colaboradores` a
  `gerencia` — checado por `canAccessScreen`.
- Colaborador `active: false` não loga mais, mas o histórico continua
  (jeito certo de desligar sem apagar rastro contábil).
- Sessão em `sessionStorage` (`loadSavedUser`/`saveUser`/`clearSavedUser`),
  não em cookie/JWT.

## Telas (`src/components/pms/`)

| Arquivo | Tela |
|---|---|
| `LoginScreen.tsx` | Login (contas demo) |
| `DashboardScreen.tsx` | Métricas: ocupação, ADR, RevPAR |
| `MapScreen.tsx` | Mapa de quartos / reservas |
| `ReservationModal.tsx` | Criar/editar reserva |
| `AccountModal.tsx` | Extrato do hóspede: consumo extra + check-out |
| `GuestsScreen.tsx` | Cadastro de hóspedes |
| `ProductsScreen.tsx` | Catálogo de produtos (vínculo opcional com estoque) |
| `SupplyScreen.tsx` | Estoque de insumos: CRUD, categorias, entrada/saída |
| `FinanceScreen.tsx` | Financeiro (transações) |
| `StaffScreen.tsx` | Colaboradores (accessLevel gerência) |
| `AppSidebar.tsx` | Navegação lateral, define `ScreenKey` |

## Convenções

- Comentários e UI em pt-BR; nomes de tipos/funções em inglês.
- Datas como string `yyyy-mm-dd` (`iso`, `day(offset)`); moeda com `brl()`;
  data de exibição com `formatDate()`.
- Novo módulo de dados: tipo + seed array + funções de mutação no store,
  tela dedicada em `components/pms/`, navegação registrada em
  `AppSidebar.tsx` (`ScreenKey`).
- Checar `tsc --noEmit` após mudanças de tipos no store (sem testes
  automatizados no projeto).

## Backlog / decisões de escopo

⚠️ **Exclusão de categoria de insumo está fora de escopo por decisão do
usuário** — não implementar sem perguntar antes, mesmo que pareça um gap
óbvio ao ler o código do CRUD de categorias.

Lista completa de itens conscientemente não implementados:
[`BACKLOG.md`](BACKLOG.md) (não carrega automaticamente — abra sob demanda
quando for relevante para a tarefa).

<!-- Nota para humanos: comentários HTML como este são removidos antes de
entrar no contexto do Claude, então não custam tokens. Use-os para recados
que só interessam a quem lê o arquivo no editor. -->

## Mantendo este arquivo enxuto

Antes de adicionar algo aqui, pergunte: o Claude precisa disso em **toda**
sessão, ou só ao mexer em um arquivo/tela específico? No segundo caso, use
`.claude/rules/*.md` com `paths:` no front-matter — só carrega quando um
arquivo correspondente é aberto, não no início de toda sessão. Evite
reescrever o que dá para descobrir lendo o código (layout de pastas,
dependências) — isso o `/doctor` do Claude Code já corta automaticamente.
`@imports` ajudam a organizar arquivos grandes, mas **não** reduzem tokens:
o conteúdo importado carrega igual no início da sessão. Meta: manter este
arquivo abaixo de ~150 linhas (o teto recomendado pela Anthropic é 200 —
acima disso a adesão às instruções cai).
