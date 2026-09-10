import { useState } from "react";
import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { brl, usePms, type Room } from "@/lib/pms-store";

const emptyForm = { number: "", category: "", rate: "" };

// Cadastro/edição/exclusão de quartos, pra o dono não depender do admin do
// Django pra montar o mapa de acomodações da pousada.
export function RoomManagerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { rooms, addRoom, updateRoom, removeRoom } = usePms();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (room: Room) => {
    setEditingId(room.id);
    setForm({
      number: room.number,
      category: room.category,
      rate: String(room.rate).replace(".", ","),
    });
  };

  const submit = async () => {
    const rate = Number(form.rate.replace(".", "").replace(",", "."));
    if (!form.number.trim() || !form.category.trim() || !rate) {
      toast.error("Informe número, categoria e diária do quarto.");
      return;
    }
    const payload = { number: form.number.trim(), category: form.category.trim(), rate };
    try {
      if (editingId) {
        await updateRoom(editingId, payload);
        toast.success(`Quarto ${payload.number} atualizado.`);
      } else {
        await addRoom(payload);
        toast.success(`Quarto ${payload.number} cadastrado.`);
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o quarto.");
    }
  };

  const confirmDelete = async (room: Room) => {
    try {
      await removeRoom(room.id);
      toast.success(`Quarto ${room.number} excluído.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o quarto.");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="size-5 text-primary" />
            Quartos da pousada
          </DialogTitle>
          <DialogDescription>
            Cadastre, edite ou exclua os quartos que aparecem no mapa e nas reservas.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border">
          {rooms.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum quarto cadastrado ainda.
            </p>
          )}
          {rooms.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Quarto {r.number} <span className="text-muted-foreground">· {r.category}</span>
                </p>
                <p className="text-xs text-muted-foreground">{brl(r.rate)} / diária</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => startEdit(r)} aria-label={`Editar quarto ${r.number}`}>
                  <Pencil className="size-4" />
                </Button>
                {confirmDeleteId === r.id ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="destructive" onClick={() => confirmDelete(r)}>
                      Confirmar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmDeleteId(r.id)}
                    aria-label={`Excluir quarto ${r.number}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">{editingId ? "Editar quarto" : "Novo quarto"}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número</Label>
              <Input
                value={form.number}
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                placeholder="101"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Standard, Suíte..."
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Valor da diária (R$)</Label>
            <Input
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              placeholder="150,00"
              inputMode="decimal"
            />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={submit}>
              {editingId ? (
                <>
                  <Pencil /> Salvar alterações
                </>
              ) : (
                <>
                  <Plus /> Cadastrar quarto
                </>
              )}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
