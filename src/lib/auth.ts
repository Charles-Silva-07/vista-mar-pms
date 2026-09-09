// Login real contra o backend Django (JWT via SimpleJWT) — ver
// rooms/auth_views.py. Este arquivo só guarda tipos, as regras de acesso
// por tela e a sessão salva no navegador; a chamada de rede em si (login,
// tokens) fica em lib/api.ts junto com o resto do client de API.

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

// Payload de cadastro/edição de colaborador (tela Colaboradores). Senha é
// obrigatória só ao criar; ao editar, campo vazio = mantém a senha atual
// (ver StaffWriteSerializer.update no backend).
export type StaffInput = Omit<StaffUser, "id"> & { password?: string };

// Telas que exigem acesso de gerência. Qualquer tela fora desta lista é liberada
// para todo mundo que estiver logado.
const MANAGER_ONLY_SCREENS: ScreenKey[] = ["financeiro", "colaboradores"];

export function canAccessScreen(user: StaffUser, screen: ScreenKey): boolean {
  if (user.accessLevel === "gerencia") return true;
  return !MANAGER_ONLY_SCREENS.includes(screen);
}

const USER_KEY = "alameda-pms:staff-user";

export function loadSavedUser(): StaffUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StaffUser) : null;
  } catch {
    return null;
  }
}

export function saveUser(user: StaffUser) {
  try {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage indisponível (ex.: modo privado) - segue só em memória.
  }
}

export function clearSavedUser() {
  try {
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}
