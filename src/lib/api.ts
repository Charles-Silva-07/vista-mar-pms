// Client de API para o backend Django. Rooms, Reservations e Staff/login
// já migrados — as demais entidades (Guest, Product, etc.) continuam em
// memória até serem migradas uma a uma, para não quebrar o resto do app
// de uma vez.
//
// Defina VITE_API_URL no .env do front (Vercel: variável de ambiente do
// projeto). Sem isso, cai em localhost:8000 para dev local.

import type { StaffInput, StaffUser } from "./auth";
import type {
  ConsumptionItem,
  Guest,
  Product,
  Reservation,
  ReservationStatus,
  Room,
  SalaryPayment,
  SupplyCategory,
  SupplyItem,
  SupplyMovement,
  Transaction,
} from "./pms-store";

const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

// --- Tokens JWT ---------------------------------------------------------
// Vivem em sessionStorage (mesmo lugar do StaffUser em auth.ts): fecha a
// aba, precisa logar de novo. Nunca em localStorage, pra não sobreviver
// entre sessões em máquina compartilhada da recepção.
const ACCESS_KEY = "alameda-pms:access-token";
const REFRESH_KEY = "alameda-pms:refresh-token";

export function saveTokens(access: string, refresh: string) {
  try {
    sessionStorage.setItem(ACCESS_KEY, access);
    sessionStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // ignore
  }
}

export function clearTokens() {
  try {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

function getAccessToken() {
  try {
    return sessionStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

function getRefreshToken() {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data: { access: string } = await res.json();
  try {
    sessionStorage.setItem(ACCESS_KEY, data.access);
  } catch {
    // ignore
  }
  return data.access;
}

// Fetch autenticado: anexa o access token e, se a API responder 401 (token
// expirado), tenta renovar com o refresh token uma única vez antes de
// desistir. Se o refresh também falhar, quem chama recebe o 401 original
// e cabe ao App.tsx tratar como sessão expirada (deslogar).
async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

  let res = await doFetch(getAccessToken());
  if (res.status === 401) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      res = await doFetch(newAccess);
    }
  }
  return res;
}

export class SessionExpiredError extends Error {
  constructor() {
    super("Sessão expirada — faça login novamente.");
  }
}

async function authFetchOrThrow(path: string, init?: RequestInit): Promise<Response> {
  const res = await authFetch(path, init);
  if (res.status === 401) throw new SessionExpiredError();
  return res;
}

// --- Autenticação ---------------------------------------------------------

type LoginResponse = { access: string; refresh: string; user: ApiStaffUser };

// Erro de credencial (401/400 do backend: e-mail ou senha errados) — o
// único caso em que a tela deve dizer "e-mail ou senha incorretos". Qualquer
// outra falha (servidor fora do ar, URL errada, CORS bloqueado) precisa de
// uma mensagem diferente, senão o usuário fica tentando adivinhar a senha
// quando o problema real é o backend não estar rodando.
export class InvalidCredentialsError extends Error {
  constructor() {
    super("E-mail ou senha incorretos.");
  }
}

export async function login(email: string, password: string): Promise<StaffUser> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // fetch rejeitou antes de qualquer resposta: backend fora do ar, URL
    // errada ou CORS bloqueando no navegador — não é senha errada.
    throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
  }
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) {
      throw new InvalidCredentialsError();
    }
    throw new Error(`Erro do servidor (${res.status}). Tente novamente em alguns instantes.`);
  }
  const data: LoginResponse = await res.json();
  saveTokens(data.access, data.refresh);
  return normalizeStaff(data.user);
}

// --- Rooms ------------------------------------------------------------------

// A API do Django devolve `id`/FKs como número (PK do Postgres); o resto do
// front trata esses ids como string (ex.: comparado com `reservation.roomId`).
// Normaliza aqui, na borda, para não espalhar esse detalhe pelo app todo.
type ApiRoom = { id: number | string; number: string; category: string; rate: string | number };

const normalizeRoom = (r: ApiRoom): Room => ({
  id: String(r.id),
  number: r.number,
  category: r.category,
  rate: Number(r.rate),
});

export async function fetchRooms(): Promise<Room[]> {
  const res = await authFetchOrThrow("/rooms/");
  if (!res.ok) {
    throw new Error(`Falha ao buscar quartos (${res.status})`);
  }
  const data: ApiRoom[] = await res.json();
  return data.map(normalizeRoom);
}

export async function createRoom(room: Omit<Room, "id">): Promise<Room> {
  const res = await authFetchOrThrow("/rooms/", {
    method: "POST",
    body: JSON.stringify(room),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.number?.[0] ?? `Falha ao criar quarto (${res.status})`);
  }
  const data: ApiRoom = await res.json();
  return normalizeRoom(data);
}

export async function updateRoom(id: string, room: Omit<Room, "id">): Promise<Room> {
  const res = await authFetchOrThrow(`/rooms/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(room),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.number?.[0] ?? `Falha ao atualizar quarto (${res.status})`);
  }
  const data: ApiRoom = await res.json();
  return normalizeRoom(data);
}

export async function deleteRoom(id: string): Promise<void> {
  const res = await authFetchOrThrow(`/rooms/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      (Array.isArray(body) ? body[0] : body?.detail) ?? `Falha ao excluir quarto (${res.status})`,
    );
  }
}

// --- Reservations -------------------------------------------------------

type ApiReservation = {
  id: number | string;
  room: number | string;
  guest: number | string | null;
  guest_name: string;
  start: string;
  end: string;
  status: ReservationStatus;
  amount_paid: string | number;
  eta: string;
  nights: number;
  rate: string | number;
  origin: Reservation["origin"];
};

const normalizeReservation = (r: ApiReservation): Reservation => ({
  id: String(r.id),
  roomId: String(r.room),
  guestName: r.guest_name,
  guestId: r.guest != null ? String(r.guest) : undefined,
  start: r.start,
  end: r.end,
  status: r.status,
  amountPaid: Number(r.amount_paid),
  eta: r.eta,
  nights: r.nights,
  rate: Number(r.rate),
  origin: r.origin,
});

// Traduz Reservation (shape do front) pro shape que o DRF espera no
// corpo do POST/PATCH (nomes em snake_case, FKs como número).
const toApiPayload = (r: Partial<Omit<Reservation, "id">>) => ({
  ...(r.roomId !== undefined && { room: Number(r.roomId) }),
  ...(r.guestId !== undefined && { guest: r.guestId ? Number(r.guestId) : null }),
  ...(r.guestName !== undefined && { guest_name: r.guestName }),
  ...(r.start !== undefined && { start: r.start }),
  ...(r.end !== undefined && { end: r.end }),
  ...(r.status !== undefined && { status: r.status }),
  ...(r.amountPaid !== undefined && { amount_paid: r.amountPaid }),
  ...(r.eta !== undefined && { eta: r.eta }),
  ...(r.nights !== undefined && { nights: r.nights }),
  ...(r.rate !== undefined && { rate: r.rate }),
  ...(r.origin !== undefined && { origin: r.origin }),
});

export async function fetchReservations(): Promise<Reservation[]> {
  const res = await authFetchOrThrow("/reservations/");
  if (!res.ok) {
    throw new Error(`Falha ao buscar reservas (${res.status})`);
  }
  const data: ApiReservation[] = await res.json();
  return data.map(normalizeReservation);
}

export async function createReservation(
  reservation: Omit<Reservation, "id">,
): Promise<Reservation> {
  const res = await authFetchOrThrow("/reservations/", {
    method: "POST",
    body: JSON.stringify(toApiPayload(reservation)),
  });
  if (!res.ok) {
    throw new Error(`Falha ao criar reserva (${res.status})`);
  }
  const data: ApiReservation = await res.json();
  return normalizeReservation(data);
}

export async function patchReservation(
  id: string,
  changes: Partial<Omit<Reservation, "id">>,
): Promise<Reservation> {
  const res = await authFetchOrThrow(`/reservations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(toApiPayload(changes)),
  });
  if (!res.ok) {
    throw new Error(`Falha ao atualizar reserva (${res.status})`);
  }
  const data: ApiReservation = await res.json();
  return normalizeReservation(data);
}

// --- Staff (Colaboradores) -----------------------------------------------

type ApiStaffUser = {
  id: number | string;
  name: string;
  document: string;
  phone: string;
  photoUrl: string;
  role: string;
  shift: string;
  shiftPeriod: StaffUser["shiftPeriod"];
  admissionDate: string;
  email: string;
  accessLevel: StaffUser["accessLevel"];
  active: boolean;
  salary: string | number;
  transportBenefit: boolean;
  transportBenefitAmount: string | number;
  mealBenefit: boolean;
  mealBenefitAmount: string | number;
};

const normalizeStaff = (s: ApiStaffUser): StaffUser => ({
  ...s,
  id: String(s.id),
  salary: Number(s.salary),
  transportBenefitAmount: Number(s.transportBenefitAmount),
  mealBenefitAmount: Number(s.mealBenefitAmount),
});

export async function fetchStaff(): Promise<StaffUser[]> {
  const res = await authFetchOrThrow("/staff/");
  if (!res.ok) {
    throw new Error(`Falha ao buscar colaboradores (${res.status})`);
  }
  const data: ApiStaffUser[] = await res.json();
  return data.map(normalizeStaff);
}

export async function createStaff(staff: StaffInput): Promise<StaffUser> {
  const res = await authFetchOrThrow("/staff/", {
    method: "POST",
    body: JSON.stringify(staff),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.email?.[0] ?? body?.password?.[0] ?? `Falha ao cadastrar colaborador (${res.status})`);
  }
  return normalizeStaff(await res.json());
}

export async function updateStaff(id: string, staff: StaffInput): Promise<StaffUser> {
  const res = await authFetchOrThrow(`/staff/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(staff),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.email?.[0] ?? `Falha ao atualizar colaborador (${res.status})`);
  }
  return normalizeStaff(await res.json());
}

export async function deleteStaff(id: string): Promise<void> {
  const res = await authFetchOrThrow(`/staff/${id}/`, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(`Falha ao excluir colaborador (${res.status})`);
  }
}

// --- Guests (Hóspedes) ----------------------------------------------------

type ApiGuest = {
  id: number | string;
  name: string;
  document: string;
  country: string;
  phone: string;
  email: string;
  purpose: string;
  transport: string;
  last_city: string;
  next_city: string;
  stays: number;
};

const normalizeGuest = (g: ApiGuest): Guest => ({
  id: String(g.id),
  name: g.name,
  document: g.document,
  country: g.country,
  phone: g.phone,
  email: g.email,
  purpose: g.purpose,
  transport: g.transport,
  lastCity: g.last_city,
  nextCity: g.next_city,
  stays: g.stays,
});

const guestToApiPayload = (g: Omit<Guest, "id" | "stays">) => ({
  name: g.name,
  document: g.document,
  country: g.country,
  phone: g.phone,
  email: g.email,
  purpose: g.purpose,
  transport: g.transport,
  last_city: g.lastCity,
  next_city: g.nextCity,
});

export async function fetchGuests(): Promise<Guest[]> {
  const res = await authFetchOrThrow("/guests/");
  if (!res.ok) throw new Error(`Falha ao buscar hóspedes (${res.status})`);
  const data: ApiGuest[] = await res.json();
  return data.map(normalizeGuest);
}

export async function createGuest(guest: Omit<Guest, "id" | "stays">): Promise<Guest> {
  const res = await authFetchOrThrow("/guests/", {
    method: "POST",
    body: JSON.stringify(guestToApiPayload(guest)),
  });
  if (!res.ok) throw new Error(`Falha ao cadastrar hóspede (${res.status})`);
  return normalizeGuest(await res.json());
}

// --- Supply categories (categorias de insumo) ------------------------------

type ApiSupplyCategory = { id: number | string; name: string };
export type SupplyCategoryRecord = { id: string; name: string };

const normalizeSupplyCategory = (c: ApiSupplyCategory): SupplyCategoryRecord => ({
  id: String(c.id),
  name: c.name,
});

export async function fetchSupplyCategories(): Promise<SupplyCategoryRecord[]> {
  const res = await authFetchOrThrow("/supply-categories/");
  if (!res.ok) throw new Error(`Falha ao buscar categorias de estoque (${res.status})`);
  const data: ApiSupplyCategory[] = await res.json();
  return data.map(normalizeSupplyCategory);
}

export async function createSupplyCategory(name: string): Promise<SupplyCategoryRecord> {
  const res = await authFetchOrThrow("/supply-categories/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Falha ao criar categoria (${res.status})`);
  return normalizeSupplyCategory(await res.json());
}

export async function renameSupplyCategoryApi(id: string, name: string): Promise<SupplyCategoryRecord> {
  const res = await authFetchOrThrow(`/supply-categories/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Falha ao renomear categoria (${res.status})`);
  return normalizeSupplyCategory(await res.json());
}

// --- Supplies (estoque de insumos) -----------------------------------------

type ApiSupplyItem = {
  id: number | string;
  name: string;
  category: string;
  unit: string;
  quantity: string | number;
  min_quantity: string | number;
};

const normalizeSupply = (s: ApiSupplyItem): SupplyItem => ({
  id: String(s.id),
  name: s.name,
  category: s.category,
  unit: s.unit,
  quantity: Number(s.quantity),
  minQuantity: Number(s.min_quantity),
});

export async function fetchSupplies(): Promise<SupplyItem[]> {
  const res = await authFetchOrThrow("/supplies/");
  if (!res.ok) throw new Error(`Falha ao buscar estoque (${res.status})`);
  const data: ApiSupplyItem[] = await res.json();
  return data.map(normalizeSupply);
}

export async function createSupply(s: Omit<SupplyItem, "id">): Promise<SupplyItem> {
  const res = await authFetchOrThrow("/supplies/", {
    method: "POST",
    body: JSON.stringify({
      name: s.name,
      category: s.category,
      unit: s.unit,
      quantity: s.quantity,
      min_quantity: s.minQuantity,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao cadastrar insumo (${res.status})`);
  return normalizeSupply(await res.json());
}

export async function updateSupplyApi(
  id: string,
  patch: Partial<Omit<SupplyItem, "id" | "quantity">>,
): Promise<SupplyItem> {
  const res = await authFetchOrThrow(`/supplies/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.unit !== undefined && { unit: patch.unit }),
      ...(patch.minQuantity !== undefined && { min_quantity: patch.minQuantity }),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar insumo (${res.status})`);
  return normalizeSupply(await res.json());
}

export async function deleteSupplyApi(id: string): Promise<void> {
  const res = await authFetchOrThrow(`/supplies/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Falha ao excluir insumo (${res.status})`);
}

// --- Supply movements (entradas/saídas) -------------------------------------

type ApiSupplyMovement = {
  id: number | string;
  supply: number | string;
  type: SupplyMovement["type"];
  quantity: string | number;
  date: string;
  unit_cost: string | number | null;
  note: string;
};

const normalizeSupplyMovement = (m: ApiSupplyMovement): SupplyMovement => ({
  id: String(m.id),
  supplyId: String(m.supply),
  type: m.type,
  quantity: Number(m.quantity),
  date: m.date,
  ...(m.unit_cost != null && { unitCost: Number(m.unit_cost) }),
  ...(m.note && { note: m.note }),
});

export async function fetchSupplyMovements(): Promise<SupplyMovement[]> {
  const res = await authFetchOrThrow("/supply-movements/");
  if (!res.ok) throw new Error(`Falha ao buscar movimentações (${res.status})`);
  const data: ApiSupplyMovement[] = await res.json();
  return data.map(normalizeSupplyMovement);
}

export async function createSupplyMovement(m: Omit<SupplyMovement, "id">): Promise<SupplyMovement> {
  const res = await authFetchOrThrow("/supply-movements/", {
    method: "POST",
    body: JSON.stringify({
      supply: Number(m.supplyId),
      type: m.type,
      quantity: m.quantity,
      date: m.date,
      ...(m.unitCost !== undefined && { unit_cost: m.unitCost }),
      ...(m.note !== undefined && { note: m.note }),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao registrar movimentação (${res.status})`);
  return normalizeSupplyMovement(await res.json());
}

// --- Products (catálogo) ----------------------------------------------------

type ApiProduct = {
  id: number | string;
  name: string;
  category: Product["category"];
  price: string | number;
  supply: number | string | null;
  qty_per_sale: string | number;
};

const normalizeProduct = (p: ApiProduct): Product => ({
  id: String(p.id),
  name: p.name,
  category: p.category,
  price: Number(p.price),
  ...(p.supply != null && { supplyId: String(p.supply) }),
  qtyPerSale: Number(p.qty_per_sale),
});

export async function fetchProducts(): Promise<Product[]> {
  const res = await authFetchOrThrow("/products/");
  if (!res.ok) throw new Error(`Falha ao buscar produtos (${res.status})`);
  const data: ApiProduct[] = await res.json();
  return data.map(normalizeProduct);
}

export async function createProduct(p: Omit<Product, "id">): Promise<Product> {
  const res = await authFetchOrThrow("/products/", {
    method: "POST",
    body: JSON.stringify({
      name: p.name,
      category: p.category,
      price: p.price,
      supply: p.supplyId ? Number(p.supplyId) : null,
      ...(p.qtyPerSale !== undefined && { qty_per_sale: p.qtyPerSale }),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao cadastrar item (${res.status})`);
  return normalizeProduct(await res.json());
}

export async function deleteProductApi(id: string): Promise<void> {
  const res = await authFetchOrThrow(`/products/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Falha ao remover item (${res.status})`);
}

// --- Consumption items (extrato do hóspede) --------------------------------

type ApiConsumptionItem = {
  id: number | string;
  reservation: number | string;
  name: string;
  qty: string | number;
  unit_price: string | number;
  supply: number | string | null;
  supply_qty: string | number | null;
};

const normalizeConsumption = (c: ApiConsumptionItem): ConsumptionItem => ({
  id: String(c.id),
  reservationId: String(c.reservation),
  name: c.name,
  qty: Number(c.qty),
  unitPrice: Number(c.unit_price),
  ...(c.supply != null && { supplyId: String(c.supply) }),
  ...(c.supply_qty != null && { supplyQty: Number(c.supply_qty) }),
});

export async function fetchConsumptions(): Promise<ConsumptionItem[]> {
  const res = await authFetchOrThrow("/consumptions/");
  if (!res.ok) throw new Error(`Falha ao buscar consumos (${res.status})`);
  const data: ApiConsumptionItem[] = await res.json();
  return data.map(normalizeConsumption);
}

export async function createConsumption(item: Omit<ConsumptionItem, "id">): Promise<ConsumptionItem> {
  const res = await authFetchOrThrow("/consumptions/", {
    method: "POST",
    body: JSON.stringify({
      reservation: Number(item.reservationId),
      name: item.name,
      qty: item.qty,
      unit_price: item.unitPrice,
      supply: item.supplyId ? Number(item.supplyId) : null,
      ...(item.supplyQty !== undefined && { supply_qty: item.supplyQty }),
    }),
  });
  if (!res.ok) throw new Error(`Falha ao lançar consumo (${res.status})`);
  return normalizeConsumption(await res.json());
}

export async function deleteConsumptionApi(id: string): Promise<void> {
  const res = await authFetchOrThrow(`/consumptions/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Falha ao remover consumo (${res.status})`);
}

// --- Transactions (Financeiro) ----------------------------------------------

type ApiTransaction = {
  id: number | string;
  date: string;
  description: string;
  category: string;
  amount: string | number;
  type: Transaction["type"];
  status: Transaction["status"];
};

const normalizeTransaction = (t: ApiTransaction): Transaction => ({
  id: String(t.id),
  date: t.date,
  description: t.description,
  category: t.category,
  amount: Number(t.amount),
  type: t.type,
  status: t.status,
});

export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await authFetchOrThrow("/transactions/");
  if (!res.ok) throw new Error(`Falha ao buscar lançamentos (${res.status})`);
  const data: ApiTransaction[] = await res.json();
  return data.map(normalizeTransaction);
}

export async function createTransaction(t: Omit<Transaction, "id">): Promise<Transaction> {
  const res = await authFetchOrThrow("/transactions/", {
    method: "POST",
    body: JSON.stringify(t),
  });
  if (!res.ok) throw new Error(`Falha ao lançar despesa (${res.status})`);
  return normalizeTransaction(await res.json());
}

// --- Salary payments (folha de pagamento) -----------------------------------

type ApiSalaryPayment = {
  id: number | string;
  staff: number | string;
  staff_name: string;
  month: string;
  amount: string | number;
  date: string;
  transaction: number | string | null;
};

const normalizeSalaryPayment = (p: ApiSalaryPayment): SalaryPayment => ({
  id: String(p.id),
  staffId: String(p.staff),
  staffName: p.staff_name,
  month: p.month,
  amount: Number(p.amount),
  date: p.date,
  transactionId: p.transaction != null ? String(p.transaction) : "",
});

export async function fetchSalaryPayments(): Promise<SalaryPayment[]> {
  const res = await authFetchOrThrow("/salary-payments/");
  if (!res.ok) throw new Error(`Falha ao buscar pagamentos (${res.status})`);
  const data: ApiSalaryPayment[] = await res.json();
  return data.map(normalizeSalaryPayment);
}

export async function createSalaryPayment(
  p: Omit<SalaryPayment, "id" | "transactionId">,
): Promise<SalaryPayment> {
  const res = await authFetchOrThrow("/salary-payments/", {
    method: "POST",
    body: JSON.stringify({
      staff: Number(p.staffId),
      month: p.month,
      amount: p.amount,
      date: p.date,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(
      body?.non_field_errors?.[0] ?? `Falha ao lançar pagamento (${res.status})`,
    );
  }
  return normalizeSalaryPayment(await res.json());
}

export async function deleteSalaryPaymentApi(id: string): Promise<void> {
  const res = await authFetchOrThrow(`/salary-payments/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Falha ao desfazer pagamento (${res.status})`);
}
