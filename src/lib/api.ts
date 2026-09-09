// Client de API para o backend Django. Rooms, Reservations e Staff/login
// já migrados — as demais entidades (Guest, Product, etc.) continuam em
// memória até serem migradas uma a uma, para não quebrar o resto do app
// de uma vez.
//
// Defina VITE_API_URL no .env do front (Vercel: variável de ambiente do
// projeto). Sem isso, cai em localhost:8000 para dev local.

import type { StaffInput, StaffUser } from "./auth";
import type { Reservation, ReservationStatus, Room } from "./pms-store";

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
    throw new Error(`Falha ao criar quarto (${res.status})`);
  }
  const data: ApiRoom = await res.json();
  return normalizeRoom(data);
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
