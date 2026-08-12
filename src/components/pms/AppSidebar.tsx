import { LayoutDashboard, CalendarRange, Users, Wallet, Waves, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScreenKey = "dashboard" | "mapa" | "hospedes" | "financeiro";

const items: { key: ScreenKey; label: string; icon: typeof Waves }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "mapa", label: "Mapa de Reservas", icon: CalendarRange },
  { key: "hospedes", label: "Hóspedes (FNRH)", icon: Users },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
];

export function AppSidebar({
  active,
  onNavigate,
  onClose,
  onNewReservation,
}: {
  active: ScreenKey;
  onNavigate: (k: ScreenKey) => void;
  onClose?: () => void;
  onNewReservation?: () => void;
}) {
  return (
    <aside className="flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Waves className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">Pousada Edmilton</p>
            <p className="truncate text-xs text-sidebar-foreground/60">PMS &amp; Financeiro</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        )}
      </div>

      <div className="p-3">
        <button
          onClick={onNewReservation}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4 shrink-0" />
          <span className="truncate">Nova Reserva</span>
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 pb-3">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active === item.key
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl bg-sidebar-accent p-3">
          <p className="text-sm font-semibold text-sidebar-accent-foreground">
            Recepção — Ana Paula
          </p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/70">Turno 07:00 - 15:00</p>
        </div>
      </div>
    </aside>
  );
}
