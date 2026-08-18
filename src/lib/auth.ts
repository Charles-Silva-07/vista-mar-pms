// Autenticação de demonstração: sem backend, apenas para a apresentação.
// Quando o sistema ganhar uma API real (ex.: Django), troque isto por login de verdade —
// e repita essas mesmas regras de acesso do lado do servidor, não só aqui no front.

import type { ScreenKey } from "@/components/pms/AppSidebar";

// "funcionario" = acesso operacional do dia a dia (recepção, camareira, etc.).
// "gerencia" = acesso total, inclui financeiro e cadastro de colaboradores.
export type AccessLevel = "funcionario" | "gerencia";

export type ShiftPeriod = "manha" | "tarde" | "noite" | "integral";

export const shiftPeriodLabels: Record<ShiftPeriod, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
  integral: "Integral",
};

export type StaffUser = {
  id: string;
  name: string;
  document: string; // CPF
  phone: string;
  photoUrl: string; // vazio = ainda não enviou foto, mostra as iniciais
  role: string;
  shift: string;
  shiftPeriod: ShiftPeriod;
  admissionDate: string; // yyyy-mm-dd
  email: string;
  accessLevel: AccessLevel;
  // Inativo = não consegue mais logar, mas o histórico dele (pagamentos,
  // etc.) continua existindo. É o jeito certo de "desligar" alguém - evita
  // apagar o rastro contábil, diferente de excluir o cadastro de vez.
  active: boolean;
  // Dados de folha de pagamento - só quem tem accessLevel "gerencia" vê essa
  // tela, então é seguro guardar isso junto do cadastro do colaborador.
  salary: number;
  transportBenefit: boolean;
  transportBenefitAmount: number;
  mealBenefit: boolean;
  mealBenefitAmount: number;
};

export type DemoAccount = StaffUser & { password: string };

// Fotos de demonstração (imagens genéricas geradas por IA, não são de
// pessoas reais) - repetidas entre colaboradores de exemplo, só pra mostrar
// o visual com foto de verdade em vez do avatar gerado.
const DEMO_PHOTO_MULHER = `${import.meta.env.BASE_URL}mulher.jpg`;
const DEMO_PHOTO_HOMEM = `${import.meta.env.BASE_URL}homem.jpg`;

export const SEED_ACCOUNTS: DemoAccount[] = [
  {
    id: "u1",
    name: "Ana Paula",
    document: "482.119.330-72",
    phone: "(85) 99812-4477",
    photoUrl: DEMO_PHOTO_MULHER,
    role: "Recepção",
    shift: "07:00 - 15:00",
    shiftPeriod: "manha",
    admissionDate: "2023-03-10",
    email: "ana.paula@alameda.com",
    password: "recepcao123",
    accessLevel: "funcionario",
    active: true,
    salary: 1800,
    transportBenefit: true,
    transportBenefitAmount: 220,
    mealBenefit: true,
    mealBenefitAmount: 450,
  },
  {
    id: "u2",
    name: "Carlos Mendes",
    document: "701.554.882-10",
    phone: "(85) 98123-0091",
    photoUrl: DEMO_PHOTO_HOMEM,
    role: "Gerência",
    shift: "08:00 - 18:00",
    shiftPeriod: "integral",
    admissionDate: "2021-06-01",
    email: "carlos.mendes@alameda.com",
    password: "gerencia123",
    accessLevel: "gerencia",
    active: true,
    salary: 4500,
    transportBenefit: false,
    transportBenefitAmount: 0,
    mealBenefit: true,
    mealBenefitAmount: 600,
  },
  {
    id: "u3",
    name: "Roberto Silva",
    document: "225.771.940-08",
    phone: "(85) 99765-3312",
    photoUrl: DEMO_PHOTO_HOMEM,
    role: "Cozinha / Copa",
    shift: "06:00 - 14:00",
    shiftPeriod: "manha",
    admissionDate: "2024-01-15",
    email: "roberto.silva@alameda.com",
    password: "cozinha123",
    accessLevel: "funcionario",
    active: true,
    salary: 2100,
    transportBenefit: true,
    transportBenefitAmount: 220,
    mealBenefit: true,
    mealBenefitAmount: 450,
  },
  {
    id: "u4",
    name: "Marcos Souza",
    document: "339.128.660-55",
    phone: "(85) 99640-2288",
    photoUrl: DEMO_PHOTO_HOMEM,
    role: "Serviços Gerais / Ajudante",
    shift: "13:00 - 21:00",
    shiftPeriod: "tarde",
    admissionDate: "2024-08-05",
    email: "marcos.souza@alameda.com",
    password: "servicos123",
    accessLevel: "funcionario",
    active: true,
    salary: 1650,
    transportBenefit: true,
    transportBenefitAmount: 180,
    mealBenefit: false,
    mealBenefitAmount: 0,
  },
];

// Telas que exigem acesso de gerência. Qualquer tela fora desta lista é liberada
// para todo mundo que estiver logado.
const MANAGER_ONLY_SCREENS: ScreenKey[] = ["financeiro", "colaboradores"];

export function canAccessScreen(user: StaffUser, screen: ScreenKey): boolean {
  if (user.accessLevel === "gerencia") return true;
  return !MANAGER_ONLY_SCREENS.includes(screen);
}

export function findAccount(
  accounts: DemoAccount[],
  email: string,
  password: string,
): StaffUser | null {
  const match = accounts.find(
    (a) =>
      a.email.toLowerCase() === email.trim().toLowerCase() &&
      a.password === password &&
      a.active,
  );
  if (!match) return null;
  const { password: _password, ...user } = match;
  return user;
}

const STORAGE_KEY = "alameda-pms:staff-user";

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
