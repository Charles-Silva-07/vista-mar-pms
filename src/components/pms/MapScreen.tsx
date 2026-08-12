import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, statusLabels, statusStyles, today, usePms, type Reservation } from "@/lib/pms-store";
import { cn } from "@/lib/utils";

const CELL = 44;

export function MapScreen({
  onNewReservation,
}: {
  onNewReservation: (roomId: string, date: string) => void;
}) {
  const { rooms, reservations } = usePms();
  const [selected, setSelected] = useState<Reservation | null>(null);

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dateOf = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    today,
  );

  const room = selected ? rooms.find((r) => r.id === selected.roomId) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold capitalize">{monthLabel}</h2>
          <p className="text-xs text-muted-foreground">
            Clique numa célula vazia para reservar ou numa barra para ver detalhes.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-xs">
          {(["confirmada", "andamento", "finalizada", "cancelada"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn("size-3 rounded-sm", statusStyles[s])} />
              <span className="text-muted-foreground">{statusLabels[s]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <div style={{ minWidth: 200 + daysInMonth * CELL }}>
          <div className="flex border-b border-border bg-muted/60">
            <div className="w-[200px] shrink-0 px-3 py-2 text-xs font-semibold">Quarto</div>
            {days.map((d) => (
              <div
                key={d}
                style={{ width: CELL }}
                className={cn(
                  "shrink-0 py-2 text-center text-xs font-medium text-muted-foreground",
                  d === today.getDate() && "bg-accent font-bold text-accent-foreground",
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {rooms.map((r) => {
            const bars = reservations.filter((res) => res.roomId === r.id);
            return (
              <div key={r.id} className="flex border-b border-border last:border-0">
                <div className="w-[200px] shrink-0 border-r border-border px-3 py-2">
                  <p className="text-sm font-semibold">{r.number}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.category}</p>
                </div>
                <div className="relative flex" style={{ height: 52 }}>
                  {days.map((d) => (
                    <button
                      key={d}
                      style={{ width: CELL }}
                      onClick={() => onNewReservation(r.id, dateOf(d))}
                      className="h-full shrink-0 border-r border-border/60 transition-colors hover:bg-accent"
                      aria-label={`Reservar quarto ${r.number} dia ${d}`}
                    />
                  ))}
                  {bars.map((res) => {
                    const start = new Date(res.start);
                    const end = new Date(res.end);
                    if (end.getMonth() < month || start.getMonth() > month) return null;
                    const startDay = start.getMonth() === month ? start.getDate() : 1;
                    const endDay = end.getMonth() === month ? end.getDate() : daysInMonth;
                    const width = Math.max(1, endDay - startDay) * CELL - 6;
                    return (
                      <button
                        key={res.id}
                        onClick={() => setSelected(res)}
                        style={{ left: (startDay - 1) * CELL + 3, width }}
                        className={cn(
                          "absolute top-2 h-9 truncate rounded-md px-2 text-left text-xs font-medium shadow-sm transition-transform hover:scale-[1.01]",
                          statusStyles[res.status],
                        )}
                      >
                        {res.guestName}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da reserva</DialogTitle>
            <DialogDescription>
              {selected?.guestName} · Quarto {room?.number}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={statusStyles[selected.status]}>
                  {statusLabels[selected.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Acomodação</span>
                <span className="font-medium">{room?.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Período</span>
                <span className="font-medium">
                  {selected.start.split("-").reverse().join("/")} →{" "}
                  {selected.end.split("-").reverse().join("/")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Diárias</span>
                <span className="font-medium">
                  {selected.nights} x {brl(selected.rate)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="font-medium">Total das diárias</span>
                <span className="font-bold">{brl(selected.nights * selected.rate)}</span>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setSelected(null)}>
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
