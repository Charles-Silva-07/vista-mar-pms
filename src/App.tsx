import { useState } from "react";
import { Menu } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar, type ScreenKey } from "@/components/pms/AppSidebar";
import { LoginScreen } from "@/components/pms/LoginScreen";
import { DashboardScreen } from "@/components/pms/DashboardScreen";
import { MapScreen } from "@/components/pms/MapScreen";
import { GuestsScreen } from "@/components/pms/GuestsScreen";
import { ProductsScreen } from "@/components/pms/ProductsScreen";
import { SupplyScreen } from "@/components/pms/SupplyScreen";
import { FinanceScreen } from "@/components/pms/FinanceScreen";
import { AccountModal } from "@/components/pms/AccountModal";
import { ReservationModal } from "@/components/pms/ReservationModal";
import { PmsProvider, type Reservation } from "@/lib/pms-store";
import { canAccessScreen, clearSavedUser, loadSavedUser, saveUser, type StaffUser } from "@/lib/auth";

const titles: Record<ScreenKey, { title: string; subtitle: string }> = {
  dashboard: { title: "Visão Geral", subtitle: "Resumo operacional da pousada hoje" },
  mapa: { title: "Mapa de Reservas", subtitle: "Ocupação por quarto ao longo do mês" },
  hospedes: { title: "Hóspedes (FNRH)", subtitle: "Cadastro legal e histórico de estadias" },
  produtos: { title: "Produtos & Preços", subtitle: "Catálogo de itens vendidos na pousada" },
  estoque: { title: "Estoque de Insumos", subtitle: "Controle de compras, uso e estoque mínimo" },
  financeiro: { title: "Financeiro", subtitle: "Fluxo de caixa, despesas e resultado" },
};

export function App() {
  const [user, setUser] = useState<StaffUser | null>(() => loadSavedUser());

  if (!user) {
    return (
      <>
        <LoginScreen
          onLogin={(u) => {
            saveUser(u);
            setUser(u);
          }}
        />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <PmsProvider>
      <Workspace
        user={user}
        onLogout={() => {
          clearSavedUser();
          setUser(null);
        }}
      />
      <Toaster position="top-right" richColors />
    </PmsProvider>
  );
}

function Workspace({ user, onLogout }: { user: StaffUser; onLogout: () => void }) {
  const [screen, setScreen] = useState<ScreenKey>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [account, setAccount] = useState<Reservation | null>(null);
  const [newRes, setNewRes] = useState<{ open: boolean; roomId?: string; date?: string }>({
    open: false,
  });

  const go = (k: ScreenKey) => {
    // Defesa extra: mesmo que algo tente navegar direto pra uma tela restrita
    // (sem passar pelo clique no item da sidebar, que já vem filtrado), barra aqui.
    if (!canAccessScreen(user, k)) return;
    setScreen(k);
    setMenuOpen(false);
  };

  const openNewReservation = () => {
    setNewRes({ open: true });
    setMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <AppSidebar
          active={screen}
          onNavigate={go}
          onNewReservation={openNewReservation}
          user={user}
          onLogout={onLogout}
        />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          />
          <div className="absolute inset-y-0 left-0">
            <AppSidebar
              active={screen}
              onNavigate={go}
              onClose={() => setMenuOpen(false)}
              onNewReservation={openNewReservation}
              user={user}
              onLogout={onLogout}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="shrink-0 rounded-lg border border-border p-2 lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl">{titles[screen].title}</h1>
              <p className="truncate text-xs text-muted-foreground">{titles[screen].subtitle}</p>
            </div>
          </div>
          <p className="hidden shrink-0 text-xs text-muted-foreground sm:block">
            {new Date().toLocaleDateString("pt-BR", { dateStyle: "full" })}
          </p>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {screen === "dashboard" && (
            <DashboardScreen
              onNewReservation={() => setNewRes({ open: true })}
              onOpenAccount={setAccount}
            />
          )}
          {screen === "mapa" && (
            <MapScreen
              onNewReservation={(roomId, date) => setNewRes({ open: true, roomId, date })}
            />
          )}
          {screen === "hospedes" && <GuestsScreen />}
          {screen === "produtos" && <ProductsScreen />}
          {screen === "estoque" && <SupplyScreen />}
          {screen === "financeiro" && canAccessScreen(user, "financeiro") && <FinanceScreen />}
        </main>
      </div>

      <AccountModal reservation={account} onOpenChange={(o) => !o && setAccount(null)} />
      <ReservationModal
        open={newRes.open}
        onOpenChange={(o) => setNewRes((s) => ({ ...s, open: o }))}
        defaultRoomId={newRes.roomId}
        defaultDate={newRes.date}
      />
    </div>
  );
}
