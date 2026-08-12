// Autenticação de demonstração: sem backend, apenas para a apresentação.
// Quando o sistema ganhar uma API real (ex.: Django), troque isto por login de verdade.

export type StaffUser = {
  name: string;
  role: string;
  shift: string;
  email: string;
};

type DemoAccount = StaffUser & { password: string };

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Ana Paula",
    role: "Recepção",
    shift: "07:00 - 15:00",
    email: "ana.paula@alameda.com",
    password: "recepcao123",
  },
  {
    name: "Carlos Mendes",
    role: "Gerência",
    shift: "08:00 - 18:00",
    email: "carlos.mendes@alameda.com",
    password: "gerencia123",
  },
];

const STORAGE_KEY = "alameda-pms:staff-user";

export function findAccount(email: string, password: string): StaffUser | null {
  const match = DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password,
  );
  if (!match) return null;
  const { password: _password, ...user } = match;
  return user;
}

export function loadSavedUser(): StaffUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: StaffUser) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage indisponível (ex.: modo privado) - segue só em memória.
  }
}

export function clearSavedUser() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
