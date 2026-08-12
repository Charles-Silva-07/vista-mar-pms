import { BedDouble, LogIn, LogOut, Percent, TrendingUp, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, day, usePms, type Reservation } from "@/lib/pms-store";

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Percent;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/12 text-success"
      : tone === "warning"
        ? "bg-warning/20 text-warning"
        : "bg-accent text-accent-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase leading-tight tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${toneClass}`}>
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

export function DashboardScreen({
  onNewReservation,
  onOpenAccount,
}: {
  onNewReservation: () => void;
  onOpenAccount: (r: Reservation) => void;
}) {
  const { rooms, reservations, transactions, updateReservationStatus } = usePms();
  const todayIso = day(0);

  const inHouse = reservations.filter((r) => r.status === "andamento");
  const arrivals = reservations.filter((r) => r.start === todayIso && r.status === "confirmada");
  const departures = reservations.filter((r) => r.end === todayIso && r.status === "andamento");
  const revenue = transactions
    .filter((t) => t.date === todayIso && t.type === "entrada")
    .reduce((s, t) => s + t.amount, 0);
  const occupancy = Math.round((inHouse.length / rooms.length) * 100);
  const roomOf = (id: string) => rooms.find((r) => r.id === id);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Ocupação hoje" value={`${occupancy}%`} icon={Percent} />
        <MetricCard
          label="Quartos ocupados"
          value={`${inHouse.length}/${rooms.length}`}
          icon={BedDouble}
        />
        <MetricCard
          label="Check-ins pendentes"
          value={String(arrivals.length)}
          icon={LogIn}
          tone="success"
        />
        <MetricCard
          label="Check-outs pendentes"
          value={String(departures.length)}
          icon={LogOut}
          tone="warning"
        />
        <MetricCard
          label="Faturamento do dia"
          value={brl(revenue)}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">Ações rápidas</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onNewReservation}>
            <Plus /> Nova Reserva
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const next = arrivals[0];
              if (next) updateReservationStatus(next.id, "andamento");
            }}
          >
            <LogIn /> Fazer Check-in
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const first = inHouse[0];
              if (first) onOpenAccount(first);
            }}
          >
            <Receipt /> Lançar Consumo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
            Chegadas previstas para hoje
          </h2>
          <ul className="divide-y divide-border">
            {arrivals.length === 0 && (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                Nenhuma chegada pendente para hoje.
              </li>
            )}
            {arrivals.map((r) => {
              const room = roomOf(r.roomId);
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.guestName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Quarto {room?.number} · {room?.category}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{r.eta}</Badge>
                    <Button size="sm" onClick={() => updateReservationStatus(r.id, "andamento")}>
                      Check-in
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">
            Hospedagens em andamento
          </h2>
          <ul className="divide-y divide-border">
            {inHouse.map((r) => {
              const room = roomOf(r.roomId);
              return (
                <li
                  key={r.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.guestName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Quarto {room?.number} · saída{" "}
                      {r.end.split("-").reverse().slice(0, 2).join("/")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onOpenAccount(r)}>
                    Conta
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
