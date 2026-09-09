import { useMemo, useState } from "react";
import { Search, Phone, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { brl, formatDate, usePms, type Guest, type Reservation } from "@/lib/pms-store";

// Histórico de check-outs pra marketing/reservas futuras: junta reserva
// finalizada + ficha do hóspede (telefone/e-mail) sem precisar de uma
// entidade nova no store - a reserva já guarda tudo que precisamos, e o
// vínculo com Guest (quando existe) traz o contato.
export function FinishedGuestsScreen() {
  const { reservations, rooms, guests, consumptions } = usePms();
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Reservation | null>(null);

  const finished = useMemo(
    () =>
      reservations
        .filter((r) => r.status === "finalizada")
        .sort((a, b) => b.end.localeCompare(a.end)),
    [reservations],
  );

  const guestFor = (r: Reservation): Guest | undefined =>
    guests.find((g) => (r.guestId && g.id === r.guestId) || g.name === r.guestName);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return finished;
    return finished.filter((r) => {
      const guest = guestFor(r);
      return (
        r.guestName.toLowerCase().includes(q) ||
        guest?.phone.toLowerCase().includes(q) ||
        guest?.email.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, query, guests]);

  const detailGuest = detail ? guestFor(detail) : undefined;
  const detailRoom = detail ? rooms.find((r) => r.id === detail.roomId) : undefined;
  const detailItems = detail ? consumptions.filter((c) => c.reservationId === detail.id) : [];
  const detailTotal = detail
    ? detail.nights * detail.rate + detailItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
    : 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, telefone ou e-mail"
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Hóspede</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Estadia</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Check-out</th>
              <th className="px-4 py-3 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((r) => {
              const guest = guestFor(r);
              const room = rooms.find((room) => room.id === r.roomId);
              return (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.guestName}</p>
                    <p className="text-xs text-muted-foreground">Quarto {room?.number}</p>
                  </td>
                  <td className="px-4 py-3">
                    {guest ? (
                      <>
                        <p>{guest.phone}</p>
                        <p className="text-xs text-muted-foreground">{guest.email}</p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem ficha (FNRH) vinculada</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(r.start)} → {formatDate(r.end)} · {r.nights} diárias
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{r.origin}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(r.end)}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => setDetail(r)}>
                      Detalhes
                    </Button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum cliente finalizado encontrado{query ? ` para "${query}"` : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{detail?.guestName}</DialogTitle>
            <DialogDescription>
              Quarto {rooms.find((r) => r.id === detail?.roomId)?.number} ·{" "}
              {detail && `${formatDate(detail.start)} → ${formatDate(detail.end)}`}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              {detailGuest ? (
                <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-muted-foreground" />
                    <span>{detailGuest.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span>{detailGuest.email}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Sem ficha FNRH vinculada a esta reserva.</p>
              )}
              <div>
                <p className="mb-1.5 font-semibold">Consumo</p>
                {detailItems.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum item extra consumido.</p>
                ) : (
                  <ul className="space-y-1">
                    {detailItems.map((i) => (
                      <li key={i.id} className="flex justify-between text-muted-foreground">
                        <span>
                          {i.qty}x {i.name}
                        </span>
                        <span>{brl(i.qty * i.unitPrice)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex justify-between border-t border-border pt-3 font-bold">
                <span>Total pago</span>
                <span>{brl(detailTotal)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
