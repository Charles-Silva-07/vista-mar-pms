import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  brl,
  occupancyColor,
  occupancyLabels,
  occupancyStyles,
  paymentChipStyle,
  paymentSituation,
  paymentSituationStyles,
  paymentTag,
  reservationTotal,
  statusLabels,
  today,
  usePms,
  type Reservation,
} from "@/lib/pms-store";
import { cn } from "@/lib/utils";

const CELL = 44;

// Filtro mensal dinâmico: de 3 meses atrás até 9 meses à frente, pra dar pra
// planejar temporada alta (ex.: Romaria de Juazeiro do Norte em setembro).
const MONTH_OPTIONS = Array.from({ length: 13 }, (_, i) => {
  const d = new Date(today.getFullYear(), today.getMonth() - 3 + i, 1);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    value: `${d.getFullYear()}-${d.getMonth()}`,
    label: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d),
  };
});

export function MapScreen({
  onNewReservation,
}: {
  onNewReservation: (roomId: string, date: string) => void;
}) {
  const { rooms, reservations, updateReservationPayment } = usePms();
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [paidInput, setPaidInput] = useState("");
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });

  useEffect(() => {
    setPaidInput(selected ? String(selected.amountPaid).replace(".", ",") : "");
  }, [selected?.id]);

  const { year, month } = view;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dateOf = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, month, 1),
  );
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const changeMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const room = selected ? rooms.find((r) => r.id === selected.roomId) : null;

  const legend = useMemo(
    () => [
      { key: "disponivel" as const, label: "Disponível", className: "border border-border bg-card" },
      { key: "reservado" as const, label: occupancyLabels.reservado, className: occupancyStyles.reservado },
      { key: "ocupado" as const, label: occupancyLabels.ocupado, className: occupancyStyles.ocupado },
      { key: "cancelada" as const, label: occupancyLabels.cancelada, className: occupancyStyles.cancelada },
      { key: "encerrada" as const, label: occupancyLabels.encerrada, className: occupancyStyles.encerrada },
    ],
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold capitalize">{monthLabel}</h2>
          <p className="text-xs text-muted-foreground">
            Clique numa célula vazia para reservar ou numa barra para ver detalhes.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => changeMonth(-1)} aria-label="Mês anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Select
            value={`${year}-${month}`}
            onValueChange={(v) => {
              const [y, m] = v.split("-").map(Number);
              if (y !== undefined && m !== undefined) setView({ year: y, month: m });
            }}
          >
            <SelectTrigger className="w-44 capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="capitalize">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => changeMonth(1)} aria-label="Próximo mês">
            <ChevronRight className="size-4" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView({ year: today.getFullYear(), month: today.getMonth() })}
            >
              Hoje
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {legend.map((item) => (
          <span key={item.key} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", item.className)} />
            <span className="text-muted-foreground">{item.label}</span>
          </span>
        ))}
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
                  isCurrentMonth && d === today.getDate() && "bg-accent font-bold text-accent-foreground",
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
                    if (end.getFullYear() < year || start.getFullYear() > year) return null;
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
                          "absolute top-2 flex h-9 items-center justify-between gap-1 truncate rounded-md px-2 text-left text-xs font-medium shadow-sm transition-transform hover:scale-[1.01]",
                          occupancyStyles[occupancyColor(res)],
                        )}
                      >
                        <span className="truncate">{res.guestName}</span>
                        {paymentSituation(res) !== "nao_pago" && (
                          <span
                            className={cn(
                              "shrink-0 rounded px-1 text-[10px] font-semibold",
                              paymentChipStyle(res),
                            )}
                          >
                            {paymentTag(res)}
                          </span>
                        )}
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
                <Badge className={occupancyStyles[occupancyColor(selected)]}>
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
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Situação financeira
                </span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0">Valor pago (R$)</Label>
                  <Input
                    value={paidInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setPaidInput(raw);
                      const amount = Number(raw.replace(",", ".")) || 0;
                      updateReservationPayment(selected.id, amount);
                      setSelected((s) => (s ? { ...s, amountPaid: amount } : s));
                    }}
                    inputMode="decimal"
                    placeholder="0,00"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const half = reservationTotal(selected) / 2;
                      updateReservationPayment(selected.id, half);
                      setSelected((s) => (s ? { ...s, amountPaid: half } : s));
                      setPaidInput(String(half).replace(".", ","));
                      toast.success("Sinal de 50% registrado.");
                    }}
                  >
                    Marcar sinal (50%)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const total = reservationTotal(selected);
                      updateReservationPayment(selected.id, total);
                      setSelected((s) => (s ? { ...s, amountPaid: total } : s));
                      setPaidInput(String(total).replace(".", ","));
                      toast.success("Reserva marcada como paga integralmente.");
                    }}
                  >
                    Marcar pago integral
                  </Button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {brl(selected.amountPaid)} de {brl(reservationTotal(selected))}
                  </span>
                  <span
                    className={cn(
                      "inline-block rounded px-2 py-0.5 text-xs font-semibold",
                      paymentSituationStyles[paymentSituation(selected)],
                    )}
                  >
                    {paymentTag(selected)}
                  </span>
                </div>
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
